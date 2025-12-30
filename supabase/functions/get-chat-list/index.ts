/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />
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
    console.log("📍 User authenticated:", !!user);

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

    // Don't return early if no matches - we still need to check for compliments and rematch requests
    // Initialize validMatches array
    const validMatches: any[] = [];

    // For each match, get the other user's profile, last message, and unread count
    // Only process if matches exist
    const matchesWithData = (matches && matches.length > 0) ? await Promise.all(
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
          .eq("account_active", true)
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
    ) : [];

    // Filter out any null results (failed user profile fetches)
    const validRegularMatches = matchesWithData.filter((match) => match !== null);
    validMatches.push(...validRegularMatches);

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
            .eq("account_active", true)
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

    // Get all matches to check if compliment users are already matched
    const { data: allMatches } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

    // Create a set of matched user IDs
    const matchedUserIdsSet = new Set<string>();
    if (allMatches) {
      allMatches.forEach((match) => {
        if (match.user1 === user.id) {
          matchedUserIdsSet.add(match.user2);
        } else {
          matchedUserIdsSet.add(match.user1);
        }
      });
    }

    // Get pending compliments where current user is the recipient
    // Only show if status is pending (not accepted - accepted means they matched)
    console.log("🔍 Fetching compliments for recipient:", user.id);

    // First, let's test if we can query compliments at all
    const { data: allComplimentsTest, error: testError } = await supabaseClient
      .from("compliments")
      .select("id, sender_id, recipient_id, status")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

    console.log("🧪 Test query - All compliments (sent or received):", {
      count: allComplimentsTest?.length || 0,
      compliments: allComplimentsTest,
      error: testError ? JSON.stringify(testError, null, 2) : null,
    });

    const { data: pendingCompliments, error: complimentsError } = await supabaseClient
      .from("compliments")
      .select("*")
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (complimentsError) {
      console.error("❌ Error fetching pending compliments:", JSON.stringify(complimentsError, null, 2));
      console.error("❌ Error code:", complimentsError.code);
      console.error("❌ Error message:", complimentsError.message);
      console.error("❌ Error details:", complimentsError.details);
      console.error("❌ Error hint:", complimentsError.hint);
    } else {
      console.log("✅ Found pending compliments:", pendingCompliments?.length || 0);
      if (pendingCompliments && pendingCompliments.length > 0) {
        console.log("✅ Compliment details:", pendingCompliments.map(c => ({
          id: c.id,
          sender_id: c.sender_id,
          recipient_id: c.recipient_id,
          status: c.status,
          message: c.message?.substring(0, 50) + "...",
        })));
      }
    }

    // Add pending compliments to chat list (only if not already matched)
    if (pendingCompliments && pendingCompliments.length > 0) {
      const complimentMatches = await Promise.all(
        pendingCompliments.map(async (compliment) => {
          const senderId = compliment.sender_id;

          // Skip if user is blocked
          if (blockedUserIds.has(senderId)) {
            return null;
          }

          // Skip if already matched (shouldn't happen with status='pending', but safety check)
          if (matchedUserIdsSet.has(senderId)) {
            return null;
          }

          // Get sender's profile
          const { data: senderProfile, error: userError } = await supabaseClient
            .from("users")
            .select("*")
            .eq("id", senderId)
            .eq("account_active", true)
            .single();

          if (userError || !senderProfile) {
            console.error("❌ Error fetching sender profile for compliment:", JSON.stringify(userError, null, 2));
            return null;
          }

          console.log("✅ Successfully fetched sender profile:", senderProfile.id, senderProfile.name || senderProfile.first_name);

          // Create a fake "last message" from the compliment
          const complimentMessage = {
            id: `compliment-${compliment.id}`,
            match_id: null,
            sender_id: senderId,
            message: compliment.message,
            message_type: "text",
            created_at: compliment.created_at,
            read: false,
          };

          return {
            id: `compliment-${compliment.id}`, // Use special ID for navigation
            created_at: compliment.created_at,
            otherUser: senderProfile,
            lastMessage: complimentMessage,
            unreadCount: 1, // Show as unread
            lastMessageTime: compliment.created_at,
            isCompliment: true,
            complimentId: compliment.id,
            complimentMessage: compliment.message,
          };
        })
      );

      const validComplimentMatches = complimentMatches.filter((match) => match !== null);
      console.log("✅ Added", validComplimentMatches.length, "compliment matches to chat list");
      validMatches.push(...validComplimentMatches);
    } else {
      console.log("ℹ️ No pending compliments found for user:", user.id);
    }

    // Also show compliments I sent (only pending or declined - not accepted, since accepted means they matched)
    // Only show if not already matched
    const { data: sentCompliments, error: sentComplimentsError } = await supabaseClient
      .from("compliments")
      .select("*")
      .eq("sender_id", user.id)
      .in("status", ["pending", "declined"])
      .order("created_at", { ascending: false });

    if (sentComplimentsError) {
      console.error("❌ Error fetching sent compliments:", sentComplimentsError);
    }

    if (sentCompliments && sentCompliments.length > 0) {
      const sentComplimentMatches = await Promise.all(
        sentCompliments.map(async (compliment) => {
          const recipientId = compliment.recipient_id;

          // Skip if user is blocked
          if (blockedUserIds.has(recipientId)) {
            return null;
          }

          // Skip if already matched (don't show compliment conversation if match exists)
          if (matchedUserIdsSet.has(recipientId)) {
            return null;
          }

          // Get recipient's profile
          const { data: recipientProfile, error: userError } = await supabaseClient
            .from("users")
            .select("*")
            .eq("id", recipientId)
            .eq("account_active", true)
            .single();

          if (userError || !recipientProfile) {
            console.error("❌ Error fetching recipient profile for sent compliment:", userError);
            return null;
          }

          // Create a fake "last message" from the compliment
          const complimentMessage = {
            id: `compliment-${compliment.id}`,
            match_id: null,
            sender_id: user.id,
            message: compliment.message,
            message_type: "text",
            created_at: compliment.created_at,
            read: true,
          };

          return {
            id: `compliment-${compliment.id}`,
            created_at: compliment.created_at,
            otherUser: recipientProfile,
            lastMessage: complimentMessage,
            unreadCount: 0,
            lastMessageTime: compliment.created_at,
            isCompliment: true,
            complimentId: compliment.id,
            complimentMessage: compliment.message,
            complimentStatus: compliment.status, // "pending" or "declined"
            isComplimentSender: true,
          };
        })
      );

      const validSentComplimentMatches = sentComplimentMatches.filter((match) => match !== null);
      validMatches.push(...validSentComplimentMatches);
    }

    console.log("✅ Loaded chat list:", validMatches.length, "matches (including rematch requests and compliments)");
    console.log("📊 Breakdown:", {
      regularMatches: validMatches.filter(m => !m.isCompliment && !m.isUnmatched).length,
      compliments: validMatches.filter(m => m.isCompliment).length,
      rematchRequests: validMatches.filter(m => m.isUnmatched && m.hasPendingRematchRequest).length,
    });

    // Log all compliment matches for debugging
    const complimentMatches = validMatches.filter(m => m.isCompliment);
    if (complimentMatches.length > 0) {
      console.log("💬 Compliment matches in response:", complimentMatches.map(m => ({
        id: m.id,
        otherUserId: m.otherUser?.id,
        otherUserName: m.otherUser?.name || m.otherUser?.first_name,
        complimentId: m.complimentId,
      })));
    }

    // Sort all matches by the most recent message time
    validMatches.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA; // Sort descending (newest first)
    });

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

