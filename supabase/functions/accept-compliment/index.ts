import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
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
    const { data: compliment, error: complimentError } = await supabaseClient
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

    // Verify the current user is the recipient
    if (compliment.recipient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only accept compliments sent to you" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if compliment is already accepted or declined
    if (compliment.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Compliment has already been ${compliment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if they're already matched
    const { data: existingMatch } = await supabaseClient
      .from("matches")
      .select("id")
      .or(`and(user1.eq.${user.id},user2.eq.${compliment.sender_id}),and(user1.eq.${compliment.sender_id},user2.eq.${user.id})`)
      .maybeSingle();

    let matchId = existingMatch?.id;

    if (!matchId) {
      // Create a new match
      const user1 = user.id < compliment.sender_id ? user.id : compliment.sender_id;
      const user2 = user.id > compliment.sender_id ? user.id : compliment.sender_id;

      const { data: newMatch, error: matchError } = await supabaseClient
        .from("matches")
        .insert({
          user1,
          user2,
        })
        .select()
        .single();

      if (matchError) {
        console.error("❌ Error creating match:", matchError);
        return new Response(
          JSON.stringify({ error: "Failed to create match", details: matchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      matchId = newMatch.id;
    }

    // Update compliment status to accepted
    const { error: updateError } = await supabaseClient
      .from("compliments")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", complimentId);

    if (updateError) {
      console.error("⚠️ Error updating compliment status:", updateError);
      // Don't fail if update fails, match is already created
    }

    // Create the first message in the chat with the compliment text
    // We need to get the match to find the correct match_id for messages
    const { data: match } = await supabaseClient
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .single();

    if (match) {
      const { error: messageError } = await supabaseClient
        .from("messages")
        .insert({
          match_id: match.id,
          sender_id: compliment.sender_id,
          message: compliment.message,
          message_type: "text",
        });

      if (messageError) {
        console.error("⚠️ Error creating initial message from compliment:", messageError);
        // Don't fail if message creation fails
      }
    }

    console.log("✅ Compliment accepted, match created:", { matchId, complimentId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchId,
        message: "Compliment accepted and match created"
      }),
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

