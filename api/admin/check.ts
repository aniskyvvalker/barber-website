import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const authHeader = (req.headers["authorization"] as string) || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing access token" });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error("Missing Supabase server configuration");
      return res.status(500).json({ ok: false, error: "Server misconfiguration" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return res.status(401).json({ ok: false, error: "Invalid access token" });
    }

    const { data, error } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .limit(1)
      .throwOnError();

    if (error) {
      console.error("Error querying admins table:", error);
      return res.status(500).json({ ok: false, error: "Database error" });
    }

    const isAdmin = Array.isArray(data) && data.length > 0;

    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    return res.status(200).json({ ok: true, is_admin: true, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error("Unexpected error in /api/admin/check:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}


