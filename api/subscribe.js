// api/subscribe.js
// Vercel Serverless Function to handle newsletter signups

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://excffhqcwzfnexflqzqv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2ZmaHFjd3pmbmV4ZmxxenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODk3ODUsImV4cCI6MjA5NjY2NTc4NX0.PgHx2nljmHaeMPmofUdopzM0-LMimxqzMVKlCPvb6kM';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email } = req.body;

    // Validate email presence
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Call Supabase API directly
    const targetKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
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

    // Handle duplicate emails (Postgres UNIQUE constraint fails with 409 Conflict)
    if (response.status === 409) {
      return res.status(200).json({ success: true, message: 'You are already subscribed!' });
    }

    const errText = await response.text();
    console.error('Supabase REST error:', errText);
    return res.status(500).json({ error: 'Subscription failed. Please try again later.' });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
