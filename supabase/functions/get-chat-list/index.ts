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

    console.log("📍 Loading chat list for user:", user.id);

    // Get list of blocked users (both ways - users I blocked and users who blocked me)
    const { data: blocksIBlocked } = await supabaseClient
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    
    const { data: blocksIAmBlocked } = await supabaseClient
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", user.id);

    const blockedUserIds = new Set<string>();
    if (blocksIBlocked) {
      blocksIBlocked.forEach(block => blockedUserIds.add(block.blocked_id));
    }
    if (blocksIAmBlocked) {
      blocksIAmBlocked.forEach(block => blockedUserIds.add(block.blocker_id));
    }

    // Fetch all matches for the user
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (matchesError) {
      console.error("❌ Matches error:", matchesError);
      return new Response(
        JSON.stringify({ error: matchesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each match, get the other user's profile, last message, and unread count
    const matchesWithData = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.user1 === user.id ? match.user2 : match.user1;

        // Skip if user is blocked (either way)
        if (blockedUserIds.has(otherUserId)) {
          return null;
        }

        // Get other user's profile
        const { data: otherUser, error: userError } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", otherUserId)
          .single();

        if (userError || !otherUser) {
          console.error("❌ Error fetching user profile:", userError);
          return null;
        }

        // Get last message
        const { data: lastMessage } = await supabaseClient
          .from("messages")
          .select("*")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Count unread messages (messages from other user that are not read)
        const { count: unreadCount, error: countError } = await supabaseClient
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("match_id", match.id)
          .eq("sender_id", otherUserId)
          .eq("read", false);

        if (countError) {
          console.error("Error counting unread messages:", countError);
        }

        return {
          id: match.id,
          created_at: match.created_at,
          otherUser,
          lastMessage: lastMessage || null,
          unreadCount: Number(unreadCount) || 0, // Ensure it's a number
          lastMessageTime: lastMessage?.created_at || match.created_at,
        };
      })
    );

    // Filter out any null results (failed user profile fetches)
    const validMatches = matchesWithData.filter((match) => match !== null);

    // Get unmatched users with pending rematch requests where current user is the recipient
    const { data: pendingRematchRequests, error: rematchError } = await supabaseClient
      .from("unmatches")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("rematch_status", "pending")
      .neq("rematch_requested_by", user.id); // User is NOT the requester (they are the recipient)

    if (rematchError) {
      console.error("❌ Error fetching rematch requests:", rematchError);
    }

    // Add pending rematch requests to chat list
    if (pendingRematchRequests && pendingRematchRequests.length > 0) {
      const rematchMatches = await Promise.all(
        pendingRematchRequests.map(async (unmatch) => {
          const otherUserId = unmatch.user1_id === user.id 
            ? unmatch.user2_id 
            : unmatch.user1_id;

          // Skip if user is blocked
          if (blockedUserIds.has(otherUserId)) {
            return null;
          }

          // Get other user's profile
          const { data: otherUser, error: userError } = await supabaseClient
            .from("users")
            .select("*")
            .eq("id", otherUserId)
            .single();

          if (userError || !otherUser) {
            console.error("❌ Error fetching user profile for rematch:", userError);
            return null;
          }

          // Get last message from the original match
          const { data: lastMessage } = await supabaseClient
            .from("messages")
            .select("*")
            .eq("match_id", unmatch.match_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            id: unmatch.match_id, // Use original match_id for navigation
            created_at: unmatch.created_at,
            otherUser,
            lastMessage: lastMessage || null,
            unreadCount: 0, // No unread for unmatched chats
            lastMessageTime: lastMessage?.created_at || unmatch.created_at,
            isUnmatched: true,
            hasPendingRematchRequest: true,
            rematchRequestedBy: unmatch.rematch_requested_by,
          };
        })
      );

      const validRematchMatches = rematchMatches.filter((match) => match !== null);
      validMatches.push(...validRematchMatches);
    }

    console.log("✅ Loaded chat list:", validMatches.length, "matches (including rematch requests)");

    return new Response(
      JSON.stringify({
        matches: validMatches,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-chat-list:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

