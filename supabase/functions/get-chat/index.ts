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

    // Create client with user auth
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

    // Count unread messages BEFORE marking as read (for unreadCount return value)
    const { count: unreadCount } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("sender_id", otherUserId)
      .eq("read", false);

    // Mark all unread messages from other user as read FIRST
    // RLS policy allows users to update read status of messages they receive
    console.log("🔄 Attempting to mark messages as read for match:", matchId, "otherUserId:", otherUserId);
    
    const { data: markedAsRead, error: readError } = await supabaseClient
      .from("messages")
      .update({ read: true })
      .eq("match_id", matchId)
      .eq("sender_id", otherUserId)
      .eq("read", false)
      .select();

    if (readError) {
      console.error("⚠️ Error marking messages as read:", JSON.stringify(readError, null, 2));
      console.error("⚠️ Error details:", readError.message, readError.details, readError.hint);
      // Don't fail the request if marking as read fails, just log it
    } else if (markedAsRead && markedAsRead.length > 0) {
      console.log("✅ Successfully marked", markedAsRead.length, "messages as read for match", matchId);
      console.log("✅ Message IDs marked:", markedAsRead.map(m => m.id));
    } else {
      console.log("ℹ️ No unread messages to mark as read for match", matchId);
    }

    // Fetch messages AFTER marking as read to ensure we get the latest read status
    // This ensures the database transaction has completed
    // Also fetch replied-to messages for reply previews
    const { data: messages, error: messagesError } = await supabaseClient
      .from("messages")
      .select(`
        *,
        reply_to:reply_to_id (
          id,
          sender_id,
          content,
          image_url,
          voice_url
        )
      `)
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("❌ Messages error:", messagesError);
      return new Response(
        JSON.stringify({ error: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the actual read status from the database (don't override)
    // The database now has the correct read status after the UPDATE
    const updatedMessages = messages || [];

    console.log("✅ Loaded chat:", updatedMessages.length, "messages");

    return new Response(
      JSON.stringify({
        match: {
          id: match.id,
          created_at: match.created_at,
        },
        otherUser,
        messages: updatedMessages,
        currentUserId: user.id,
        unreadCount: unreadCount || 0, // Return count before marking as read
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

