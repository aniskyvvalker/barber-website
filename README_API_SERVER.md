# Local API server for sending booking emails

This project includes a small Express server that exposes a secure server-side endpoint which forwards booking data to a Supabase Edge Function without exposing secrets to the frontend.

Quick steps to run locally

1. Install dependencies

```bash
npm install
```

2. Set environment variables (macOS / Linux)

```bash
export SUPABASE_FUNCTIONS_URL="https://<your-project-id>.functions.supabase.co"
export SEND_EMAIL_SECRET="your-server-only-secret"
# Optional: override CORS origin for dev (default: http://localhost:3000)
export CORS_ORIGIN="http://localhost:3000"
```

3. Start the frontend (Vite)

```bash
npm run dev
```

4. Start the API server

```bash
npm run start:server
```

Server default: http://localhost:3001 — Vite proxies `/api` → this server so frontend calls `/api/send-email`.

Test with curl

```bash
curl -v -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to":"you@example.com",
    "customerName":"Test User",
    "serviceName":"Haircut",
    "barberName":"Alex",
    "appointmentDate":"November 20, 2025",
    "appointmentTime":"14:00",
    "price":25
  }'
```

Expected response:

```json
{ "ok": true, "data": { ... } }
```

Notes

-   Do NOT commit secrets to git.
-   Configure `RESEND_API_KEY` in your Supabase Edge Function environment (the Edge Function uses it to call the email provider).
-   If you deploy the server to production, set `CORS_ORIGIN` to your production frontend origin and secure the server appropriately.
