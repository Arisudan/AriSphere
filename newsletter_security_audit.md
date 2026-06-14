# Phase 7B: Newsletter Security Audit Report

This report outlines the security defense and validation results for the **Newsletter Subscription System** (Phase 7B) on **AriSphere**.

---

## 1. Overview & Objectives
The `/api/subscribe` endpoint is a public entry point vulnerable to spam registration bots, validation bypasses, and distributed denial-of-service attempts.
To protect this service, we implemented:
- **Email Validation & Spam Protection**: Regex checks, disposable domain filtering, and spam pattern analysis.
- **Client IP Hashing**: Extract client IP and hash it with SHA-256 to ensure reader privacy while enforcing operational bounds.
- **CAPTCHA Verification**: Cloudflare Turnstile integration on client forms and backend verification.
- **Database Rate Limiting**: Track and limit subscription requests to 5 per hour per hashed IP address.
- **RLS Access Restrictions**: Tighten permissions on the `subscribers` table (Anonymous can only INSERT, admin only can SELECT/DELETE).

---

## 2. Implemented Upgrades

### A. Disposable Email Domain Filtering & Regex Verification
- Created a static list of common throwaway/disposable domains (`DISPOSABLE_DOMAINS`) inside [api/subscribe.js](file:///d:/Arisudan%20Files/GST%20web/Arisphere/api/subscribe.js) to reject email aliases.
- Implemented regex verification to block spam signatures (e.g. `test@`, `spam@`, or extremely long random alphabetical sequences).

### B. Hashed IP-Based Rate Limiting
- IP address headers (`x-real-ip`, `x-forwarded-for`) are extracted.
- The IP is hashed via `crypto.createHash('sha256')`.
- The database is queried for requests from this hashed IP within the last hour. If the count meets or exceeds 5, the API returns a `429 Too Many Requests` status code.
- Successful requests log their hashes to the `rate_limits` table to maintain state across serverless invocations.

### C. Cloudflare Turnstile CAPTCHA Integration
- Implemented client-side widget in signup forms.
- Backend verifies the turnstile response token by POSTing to the Cloudflare verification service endpoint `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- Added a fallback token verification bypass to enable smooth local development when environment secret keys are omitted.

### D. Secure Row Level Security (RLS) on Subscribers Table
Applied a Postgres database migration to tighten the security policy:
- **Anonymous Insert**: Allowed unconditionally to let users subscribe.
- **Admin Select/Delete**: Restricts SELECT and DELETE operations strictly to authenticated profiles matching the role of `'admin'`.
- **Public Read Access**: Blocked entirely to prevent list enumeration.

---

## 3. Validation Outcomes
- The serverless handler compiles cleanly and correctly handles edge cases, returning appropriate error messages.
- Verified rate limiting throws `429` status codes on excessive attempts.
