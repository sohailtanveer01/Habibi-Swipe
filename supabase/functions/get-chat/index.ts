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

    // Get matchId from request
    const { matchId } = await req.json();
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "Missing matchId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📍 Loading chat for match:", matchId, "user:", user.id);

    // Fetch match and verify user is part of it
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      console.error("❌ Match error:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of this match
    if (match.user1 !== user.id && match.user2 !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to this chat" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine other user ID
    const otherUserId = match.user1 === user.id ? match.user2 : match.user1;

    // Fetch other user's profile
    const { data: otherUser, error: userProfileError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (userProfileError || !otherUser) {
      console.error("❌ User profile error:", userProfileError);
      return new Response(
        JSON.stringify({ error: "Other user profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("❌ Messages error:", messagesError);
      return new Response(
        JSON.stringify({ error: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark unread messages from other user as read (if read column exists)
    try {
      const { error: readError } = await supabaseClient
        .from("messages")
        .update({ read: true })
        .eq("match_id", matchId)
        .eq("sender_id", otherUserId)
        .eq("read", false);

      if (readError) {
        // If read column doesn't exist, that's okay - just log it
        console.log("⚠️ Note: Could not mark messages as read (read column may not exist):", readError.message);
      }
    } catch (e) {
      // Ignore errors related to read column
      console.log("⚠️ Note: read column may not exist in messages table");
    }

    console.log("✅ Loaded chat:", messages?.length || 0, "messages");

    return new Response(
      JSON.stringify({
        match: {
          id: match.id,
          created_at: match.created_at,
        },
        otherUser,
        messages: messages || [],
        currentUserId: user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

