import { timingSafeEqual } from "crypto";

function escapeHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: unknown): boolean {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.trim().length <= 254
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const SEND_EMAIL_API_KEY = process.env.SEND_EMAIL_API_KEY;
    if (!SEND_EMAIL_API_KEY) {
      console.error("Missing SEND_EMAIL_API_KEY env var");
      return res.status(500).json({ ok: false, error: "Server misconfiguration" });
    }

    const rawHeader = (req.headers["x-api-key"] as string) || (req.headers["authorization"] as string) || "";
    let providedKey = rawHeader.trim();
    if (providedKey.toLowerCase().startsWith("bearer ")) {
      providedKey = providedKey.slice(7).trim();
    } else if (providedKey.toLowerCase().startsWith("apikey ")) {
      providedKey = providedKey.split(" ")[1] || "";
    }

    const providedBuf = Buffer.from(providedKey);
    const expectedBuf = Buffer.from(SEND_EMAIL_API_KEY);
    let keysMatch = false;
    try {
      if (providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)) {
        keysMatch = true;
      }
    } catch (e) {
      // timingSafeEqual throws if lengths differ; fall through to unauthorized
    }

    if (!keysMatch) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid request body" });
    }

    const to = body.to;
    const customerName = body.customerName;
    const serviceName = body.serviceName;
    const barberName = body.barberName;
    const appointmentDate = body.appointmentDate;
    const appointmentTime = body.appointmentTime;
    const price = body.price;

    if (!isValidEmail(to)) {
      return res.status(400).json({ ok: false, error: "Invalid recipient email" });
    }
    if (!customerName || typeof customerName !== "string" || customerName.trim().length > 200) {
      return res.status(400).json({ ok: false, error: "Invalid customer name" });
    }
    if (!serviceName || typeof serviceName !== "string" || serviceName.trim().length > 200) {
      return res.status(400).json({ ok: false, error: "Invalid service name" });
    }
    if (barberName && typeof barberName !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid barber name" });
    }
    if (appointmentDate && typeof appointmentDate !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid appointment date" });
    }
    if (appointmentTime && typeof appointmentTime !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid appointment time" });
    }
    const priceNumber = typeof price === "number" ? price : typeof price === "string" ? parseFloat(price) : NaN;
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ ok: false, error: "Invalid price" });
    }

    const safePayload = {
      to: String(to).trim(),
      customerName: escapeHtml(customerName),
      serviceName: escapeHtml(serviceName),
      barberName: escapeHtml(barberName || "Our team"),
      appointmentDate: escapeHtml(appointmentDate || ""),
      appointmentTime: escapeHtml(appointmentTime || ""),
      price: Number(priceNumber),
    };

    const SUPABASE_FUNCTIONS_URL = process.env.SUPABASE_FUNCTIONS_URL;
    const SEND_EMAIL_SECRET = process.env.SEND_EMAIL_SECRET;

    if (!SUPABASE_FUNCTIONS_URL || !SEND_EMAIL_SECRET) {
      console.error("Missing SUPABASE_FUNCTIONS_URL or SEND_EMAIL_SECRET");
      return res.status(500).json({ ok: false, error: "Server misconfiguration" });
    }

    const functionsUrl = SUPABASE_FUNCTIONS_URL.replace(/\/$/, "");
    const response = await fetch(`${functionsUrl}/send-booking-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SEND_EMAIL_SECRET}`,
      },
      body: JSON.stringify(safePayload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Edge function error:", data);
      return res.status(502).json({
        ok: false,
        error: "Failed to send email",
        details: data,
      });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err: any) {
    console.error("Unexpected error in /api/send-email:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}


