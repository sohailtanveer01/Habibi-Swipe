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

    // Get matchId and markAsRead flag from request
    const { matchId, markAsRead = true } = await req.json();
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "Missing matchId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📍 Loading chat for match:", matchId, "user:", user.id, "markAsRead:", markAsRead);

    // Check if this is a compliment conversation (matchId starts with "compliment-")
    if (matchId.startsWith("compliment-")) {
      const complimentId = matchId.replace("compliment-", "");
      
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

      // Determine other user ID
      const otherUserId = user.id === compliment.sender_id 
        ? compliment.recipient_id 
        : compliment.sender_id;
      const isComplimentSender = user.id === compliment.sender_id;

      // Fetch other user's profile
      const { data: otherUser, error: userProfileError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", otherUserId)
        .single();

      if (userProfileError || !otherUser) {
        return new Response(
          JSON.stringify({ error: "Other user profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create a fake message from the compliment
      const complimentMessage = {
        id: `compliment-msg-${compliment.id}`,
        match_id: null,
        sender_id: compliment.sender_id,
        message: compliment.message,
        message_type: "text",
        created_at: compliment.created_at,
        read: isComplimentSender || compliment.status !== "pending",
      };

      return new Response(
        JSON.stringify({
          match: null,
          otherUser,
          messages: [complimentMessage],
          currentUserId: user.id,
          unreadCount: isComplimentSender ? 0 : (compliment.status === "pending" ? 1 : 0),
          isCompliment: true,
          complimentId: compliment.id,
          complimentStatus: compliment.status,
          isComplimentSender: isComplimentSender,
          isComplimentRecipient: !isComplimentSender,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if this match is unmatched
    const { data: unmatchRecord, error: unmatchError } = await supabaseClient
      .from("unmatches")
      .select("*")
      .eq("match_id", matchId)
      .single();

    let otherUserId: string | null = null;
    let isUnmatched = false;
    let match: any = null;

    if (!unmatchError && unmatchRecord) {
      // Match is unmatched - verify user is part of it
      if (unmatchRecord.user1_id !== user.id && unmatchRecord.user2_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to this chat" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine other user ID
      otherUserId = unmatchRecord.user1_id === user.id 
        ? unmatchRecord.user2_id 
        : unmatchRecord.user1_id;
      isUnmatched = true;
    } else {
      // Match exists - fetch and verify
      const { data: matchData, error: matchError } = await supabaseClient
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError || !matchData) {
        return new Response(
          JSON.stringify({ error: "Match not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      match = matchData;

      // Verify user is part of the match
      if (match.user1 !== user.id && match.user2 !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to this chat" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine other user ID
      otherUserId = match.user1 === user.id ? match.user2 : match.user1;
    }

    if (!otherUserId) {
      return new Response(
        JSON.stringify({ error: "Other user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is blocked (either way)
    const { data: iBlockedThem } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId)
      .single();
    
    const { data: theyBlockedMe } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", otherUserId)
      .eq("blocked_id", user.id)
      .single();

    const isBlocked = !!(iBlockedThem || theyBlockedMe);
    const iAmBlocked = !!theyBlockedMe;

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

    // If blocked, return limited info (hide profile picture and messages)
    if (isBlocked) {
      return new Response(
        JSON.stringify({
          messages: [], // Hide messages
          otherUser: {
            ...otherUser,
            photos: null, // Hide photos
            main_photo: null,
          },
          currentUserId: user.id,
          unreadCount: 0,
          isBlocked: true,
          iAmBlocked: iAmBlocked, // Let blocked user know they were blocked
          isUnmatched: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count unread messages BEFORE marking as read (for unreadCount return value)
    const { count: unreadCount } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("sender_id", otherUserId)
      .eq("read", false);

    // Mark all unread messages from other user as read FIRST (only if match exists and markAsRead is true)
    // RLS policy allows users to update read status of messages they receive
    if (!isUnmatched && markAsRead) {
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
    } else {
      console.log("ℹ️ Match is unmatched, skipping read status update");
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

    // Get rematch request info if unmatched
    let rematchRequestInfo = null;
    if (isUnmatched && unmatchRecord) {
      const hasPendingRequest = unmatchRecord.rematch_status === 'pending';
      const isRequestRecipient = hasPendingRequest && unmatchRecord.rematch_requested_by !== user.id;
      const isRequestRequester = hasPendingRequest && unmatchRecord.rematch_requested_by === user.id;

      rematchRequestInfo = {
        status: unmatchRecord.rematch_status,
        requestedBy: unmatchRecord.rematch_requested_by,
        requestedAt: unmatchRecord.rematch_requested_at,
        hasPendingRequest,
        isRequestRecipient, // Current user can accept/reject
        isRequestRequester, // Current user sent the request (waiting for response)
      };
    }

    console.log("✅ Loaded chat:", updatedMessages.length, "messages");

    return new Response(
      JSON.stringify({
        match: match ? {
          id: match.id,
          created_at: match.created_at,
        } : null,
        otherUser,
        messages: updatedMessages,
        currentUserId: user.id,
        unreadCount: unreadCount || 0, // Return count before marking as read
        isUnmatched: isUnmatched,
        rematchRequest: rematchRequestInfo,
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

