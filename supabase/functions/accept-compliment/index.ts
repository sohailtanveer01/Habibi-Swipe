import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expo push helper
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  if (!tokens || tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) console.error("Expo push error:", res.status, json);
  } catch (e) {
    console.error("Expo push exception:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the service role key to have admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { complimentId } = await req.json();

    if (!complimentId) {
      return new Response(
        JSON.stringify({ error: "complimentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the compliment
    const { data: compliment, error: complimentError } = await supabaseAdmin
      .from("compliments")
      .select("*")
      .eq("id", complimentId)
      .single();

    if (complimentError || !compliment) {
      return new Response(
        JSON.stringify({ error: "Compliment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (compliment.recipient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only accept compliments sent to you" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (compliment.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Compliment has already been ${compliment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create match
    const user1 = user.id < compliment.sender_id ? user.id : compliment.sender_id;
    const user2 = user.id > compliment.sender_id ? user.id : compliment.sender_id;

    const { data: newMatch, error: matchError } = await supabaseAdmin
      .from("matches")
      .insert({ user1, user2 })
      .select()
      .single();

    if (matchError) {
      console.error("❌ Error creating match:", matchError);
      // Check if it's a unique constraint violation (match already exists)
      if (matchError.code === '23505') {
         // Match already exists, proceed without error
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to create match", details: matchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    const matchId = newMatch.id;

    // Update compliment status
    await supabaseAdmin
      .from("compliments")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", complimentId);

    // Send push notification to the compliment sender
    try {
      const { data: senderProfile } = await supabaseAdmin
        .from("users")
        .select("first_name, name")
        .eq("id", user.id) // The user accepting is the one whose name should appear
        .single();
      const accepterName = senderProfile?.first_name || senderProfile?.name || "Someone";

      const { data: tokenRows } = await supabaseAdmin
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", compliment.sender_id)
        .eq("revoked", false)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
      if (tokens.length > 0) {
        await sendExpoPush(tokens, {
          title: "Compliment Accepted! 💖",
          body: `${accepterName} accepted your compliment. It's a match!`,
          data: { type: "match", matchId: matchId },
        });
        console.log("📱 Sent compliment acceptance notification to user:", compliment.sender_id);
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }

    // Create the initial message in the chat
    if (matchId) {
      await supabaseAdmin.from("messages").insert({
        match_id: matchId,
        sender_id: compliment.sender_id,
        message: compliment.message,
        message_type: "text",
      });
    }

    console.log("✅ Compliment accepted, match created:", { matchId, complimentId });

    return new Response(
      JSON.stringify({ success: true, matchId, message: "Compliment accepted and match created" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in accept-compliment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

