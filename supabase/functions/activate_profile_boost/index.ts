import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const minutesRaw = typeof body?.minutes === "number" ? body.minutes : 30;
    const minutes = Math.max(1, Math.min(60, Math.floor(minutesRaw))); // clamp 1..60

    // --- SUBSCRIPTION & BOOST COUNT CHECK ---
    const { data: userData, error: userDataError } = await supabaseClient
      .from("users")
      .select("is_premium, boost_count")
      .eq("id", user.id)
      .single();

    if (userDataError || !userData) {
      console.error("Error fetching user data:", userDataError);
      return new Response(JSON.stringify({ error: "Could not verify boost balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userData.boost_count <= 0) {
      return new Response(JSON.stringify({
        error: "NO_BOOSTS_REMAINING",
        message: userData.is_premium
          ? "You've used all your premium boosts for this period."
          : "You've used your free boost. Upgrade to Premium for 5 boosts!"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ------------------------------------------

    // If a boost is already active, return it
    const { data: existing, error: existingErr } = await supabaseClient
      .from("profile_boosts")
      .select("id, user_id, started_at, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("Error checking existing boost:", existingErr);
    } else if (existing) {
      return new Response(JSON.stringify({ boost: existing }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expiresAt = addMinutes(now, minutes);

    // Decrement boost count first
    const { error: decrementError } = await supabaseClient
      .from("users")
      .update({ boost_count: userData.boost_count - 1 })
      .eq("id", user.id);

    if (decrementError) {
      console.error("Error decrementing boost count:", decrementError);
      return new Response(JSON.stringify({ error: "Failed to update boost balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: insertErr } = await supabaseClient
      .from("profile_boosts")
      .insert({
        user_id: user.id,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, user_id, started_at, expires_at")
      .single();

    // If we raced another request, the exclusion constraint will reject one insert.
    // In that case, just return the active boost.
    if (insertErr) {
      console.error("Error creating boost (maybe race):", insertErr);
      const { data: after, error: afterErr } = await supabaseClient
        .from("profile_boosts")
        .select("id, user_id, started_at, expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (afterErr || !after) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ boost: after }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ boost: created }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in activate_profile_boost:", error);
    return new Response(JSON.stringify({ error: (error as any)?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


