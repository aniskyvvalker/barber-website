import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, customerName, serviceName, barberName, appointmentDate, appointmentTime, price }: BookingEmailData = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    console.log('Sending email to:', to)
    console.log('API Key exists:', !!RESEND_API_KEY)

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Imperial Cut <onboarding@resend.dev>',
        to: [to],
        subject: 'Booking Confirmation - Imperial Cut',
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:#3D2817;color:#D4AF37;padding:30px;text-align:center"><h1>Imperial Cut</h1><p>Your appointment is confirmed!</p></div><div style="background:#fff;padding:30px;border:1px solid #ddd"><p>Dear ${customerName},</p><p>Your appointment has been confirmed.</p><div style="background:#f9f9f9;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#3D2817;margin-top:0">Appointment Details</h3><p><strong>Service:</strong> ${serviceName}</p><p><strong>Barber:</strong> ${barberName}</p><p><strong>Date:</strong> ${appointmentDate}</p><p><strong>Time:</strong> ${appointmentTime}</p><p><strong>Price:</strong> $${price}</p></div><p><strong>Important:</strong> Please arrive 5-10 minutes early. Cancellations must be made 1 hour in advance.</p><p>Contact: 0553 55 22 09 | info@imperialcut.com</p></div></div></body></html>`,
      }),
    })

    const data = await res.json()
    console.log('Resend response:', res.status, JSON.stringify(data))

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
