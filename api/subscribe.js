// api/subscribe.js
// Vercel Serverless Function to handle newsletter signups with Phase 7 Security Hardening

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://excffhqcwzfnexflqzqv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2ZmaHFjd3pmbmV4ZmxxenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODk3ODUsImV4cCI6MjA5NjY2NTc4NX0.PgHx2nljmHaeMPmofUdopzM0-LMimxqzMVKlCPvb6kM';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Blacklist of common disposable email hosts
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'tempmail.com', '10minutemail.com',
  'sharklasers.com', 'guerrillamail.com', 'dispostable.com', 'getairmail.com',
  'maildrop.cc', 'throwawaymail.com', 'temp-mail.org', 'fakeinbox.com'
]);

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, turnstileToken } = req.body;

    // Validate email presence
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Basic Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 2. Disposable Email Blocking
    const domain = cleanEmail.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return res.status(400).json({ error: 'Disposable email addresses are not permitted.' });
    }

    // 3. Spam Pattern / Nonsense Address Detection
    if (cleanEmail.startsWith('test@') || cleanEmail.startsWith('spam@') || /^[a-zA-Z]{12,}@/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Suspicious email registration blocked.' });
    }

    // Extract Client IP address safely to prevent TypeError on connection deprecation
    const ip = req.headers['x-real-ip'] || 
               (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
               req.socket?.remoteAddress || 
               req.connection?.remoteAddress || 
               '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    const targetKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;

    // 4. Cloudflare Turnstile CAPTCHA verification
    const turnstileSecret = process.env.CF_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // Dev fallback secret
    const isProduction = !!process.env.CF_TURNSTILE_SECRET_KEY && process.env.CF_TURNSTILE_SECRET_KEY !== '1x0000000000000000000000000000000AA';

    if (isProduction && !turnstileToken) {
      return res.status(400).json({ error: 'CAPTCHA verification is required.' });
    }

    if (turnstileToken) {
      try {
        const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const verifyResponse = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}&remoteip=${encodeURIComponent(ip)}`
        });
        const verifyResult = await verifyResponse.json();
        if (!verifyResult.success) {
          return res.status(400).json({ error: 'CAPTCHA validation failed. Please reload page.' });
        }
      } catch (captchaErr) {
        console.warn('Turnstile connection warning:', captchaErr.message);
      }
    }

    // 5. Database-backed IP Rate Limiting (5 requests per hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    try {
      const rateUrl = `${SUPABASE_URL}/rest/v1/rate_limits?ip_hash=eq.${ipHash}&timestamp=gte.${oneHourAgo}&select=id`;
      const rateResponse = await fetch(rateUrl, {
        method: 'GET',
        headers: {
          'apikey': targetKey,
          'Authorization': `Bearer ${targetKey}`
        }
      });
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        if (rateData && rateData.length >= 5) {
          return res.status(429).json({ error: 'Too many newsletter attempts. Please try again in an hour.' });
        }
      }
    } catch (rateErr) {
      console.warn('Rate limit lookup bypass due to error:', rateErr.message);
    }

    // Log the rate limiting attempt
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rate_limits`, {
        method: 'POST',
        headers: {
          'apikey': targetKey,
          'Authorization': `Bearer ${targetKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ ip_hash: ipHash, action: 'subscribe' })
      });
    } catch (logErr) {
      console.warn('Could not log rate limits:', logErr.message);
    }

    // 6. Write subscriber to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'apikey': targetKey,
        'Authorization': `Bearer ${targetKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email: cleanEmail })
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Successfully subscribed!' });
    }

    // Handle duplicate UNIQUE constraint
    if (response.status === 409) {
      return res.status(200).json({ success: true, message: 'You are already subscribed!' });
    }

    const errText = await response.text();
    console.error('Supabase REST error:', errText);
    return res.status(500).json({ error: 'Subscription failed. Please try again.' });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
