Security checklist and required environment variables

This document summarizes recommended security configuration for this repository and how to deploy the Supabase function safely.

Required environment variables (server-side only)
- `RESEND_API_KEY` — Resend (email) API key used by `supabase/functions/send-booking-email`. MUST NOT be committed.
- `EMAIL_FUNCTION_API_KEY` — A random secret required by the function in the `x-api-key` request header.
- `ALLOWED_ORIGINS` — Comma-separated list of allowed origins for the function (e.g. `https://yourdomain.com`).

Where to configure
- Supabase Functions: set `RESEND_API_KEY`, `EMAIL_FUNCTION_API_KEY`, and `ALLOWED_ORIGINS` in the function environment variables via the Supabase dashboard or CLI.
- GitHub (optional): store `EMAIL_FUNCTION_API_KEY` and other deploy secrets in `Settings → Secrets` for workflows.

Recommended operational steps
- Do not commit any secret values to git. If secrets were accidentally committed, rotate them immediately and run a git-history secrets scan.
- Use a strong random value for `EMAIL_FUNCTION_API_KEY` (32+ chars).
- Restrict `ALLOWED_ORIGINS` to your exact frontend domain(s) — do not use `*`.
- Prefer verifying user authentication (Supabase JWT) for sensitive operations rather than only using a static API key.
- Monitor failed requests to the function and alert on unusual activity.

Automated checks
- This repository includes CI that runs `npm audit` and a secret scanner workflow that will run on PRs.

If you want, I can add deployment scripts or automate environment setup for Supabase/Vercel.


