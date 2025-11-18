import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Base CORS header keys (values are set per-request after origin validation)
const CORS_HEADER_KEYS = {
  allowHeaders: "Access-Control-Allow-Headers",
  allowOrigin: "Access-Control-Allow-Origin",
  allowMethods: "Access-Control-Allow-Methods",
}

interface BookingEmailData {
  to: string
  customerName: string
  serviceName: string
  barberName: string
  appointmentDate: string
  appointmentTime: string
  price: number
}

function getAllowedOrigins(): string[] | null {
  const env = Deno.env.get("ALLOWED_ORIGINS") // comma separated list
  if (!env) return null
  return env.split(",").map((s) => s.trim()).filter(Boolean)
}

function escapeHtml(input?: string) {
  if (!input) return ""
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

serve(async (req) => {
  const origin = req.headers.get("origin") || ""
  const allowed = getAllowedOrigins()
  const originIsAllowed = !allowed || !origin || allowed.includes(origin)
  const accessControlAllowOrigin = originIsAllowed && origin ? origin : "null"

  const corsHeaders = {
    [CORS_HEADER_KEYS.allowOrigin]: accessControlAllowOrigin,
    [CORS_HEADER_KEYS.allowHeaders]:
      "authorization, x-client-info, apikey, content-type, x-api-key",
    [CORS_HEADER_KEYS.allowMethods]: "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

    try {
    if (!originIsAllowed) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    // Validate function-level API key header
    const providedApiKey = req.headers.get("x-api-key") || ""
    const expectedApiKey = Deno.env.get("EMAIL_FUNCTION_API_KEY") || ""
    if (!expectedApiKey || providedApiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { to, customerName, serviceName, barberName, appointmentDate, appointmentTime, price }: BookingEmailData =
      await req.json()

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

    // Do not log secrets. Log only non-sensitive request metadata for debugging.
    console.log("Sending email to domain of recipient (masked):", to?.split("@")?.[1] || "unknown")

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured")
    }

    // Sanitize all user-supplied strings before embedding into HTML
    const sCustomerName = escapeHtml(customerName)
    const sServiceName = escapeHtml(serviceName)
    const sBarberName = escapeHtml(barberName)
    const sAppointmentDate = escapeHtml(appointmentDate)
    const sAppointmentTime = escapeHtml(appointmentTime)
    const sPrice = Number(price)

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:#3D2817;color:#D4AF37;padding:30px;text-align:center"><h1>Imperial Cut</h1><p>Your appointment is confirmed!</p></div><div style="background:#fff;padding:30px;border:1px solid #ddd"><p>Dear ${sCustomerName},</p><p>Your appointment has been confirmed.</p><div style="background:#f9f9f9;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#3D2817;margin-top:0">Appointment Details</h3><p><strong>Service:</strong> ${sServiceName}</p><p><strong>Barber:</strong> ${sBarberName}</p><p><strong>Date:</strong> ${sAppointmentDate}</p><p><strong>Time:</strong> ${sAppointmentTime}</p><p><strong>Price:</strong> $${isNaN(sPrice) ? "" : sPrice}</p></div><p><strong>Important:</strong> Please arrive 5-10 minutes early. Cancellations must be made 1 hour in advance.</p><p>Contact: 0553 55 22 09 | info@imperialcut.com</p></div></div></body></html>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Imperial Cut <onboarding@resend.dev>",
        to: [to],
        subject: "Booking Confirmation - Imperial Cut",
        html,
      }),
    })

    const data = await res.json().catch(() => ({}))
    console.log("Resend response status:", res.status)

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to send email", details: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Error sending booking email:", error?.message || error)
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      headers: { "Content-Type": "application/json", [CORS_HEADER_KEYS.allowOrigin]: "null" },
      status: 500,
    })
  }
})
