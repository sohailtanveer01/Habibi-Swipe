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

    console.log("Fetching users who liked:", user.id);

    // First, let's check all swipes where the current user was swiped on (for debugging)
    const { data: allSwipes, error: allSwipesError } = await supabaseClient
      .from("swipes")
      .select("swiper_id, swiped_id, action, created_at")
      .eq("swiped_id", user.id);

    console.log("📊 All swipes where current user was swiped:", JSON.stringify(allSwipes, null, 2));
    if (allSwipesError) {
      console.error("❌ Error fetching all swipes:", allSwipesError);
    }

    // Get all swipes where someone liked the current user (swiped_id = current user, action = 'like')
    // Try with exact match first
    let { data: swipes, error: swipesError } = await supabaseClient
      .from("swipes")
      .select("swiper_id, action, created_at")
      .eq("swiped_id", user.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    console.log("📊 Swipes with action='like' (exact match):", JSON.stringify(swipes, null, 2));
    console.log("📊 Number of swipes found:", swipes?.length || 0);

    // If no results, try case-insensitive or check what actions exist
    if ((!swipes || swipes.length === 0) && allSwipes && allSwipes.length > 0) {
      console.log("⚠️ No exact 'like' matches, checking all actions...");
      const uniqueActions = [...new Set(allSwipes.map(s => s.action))];
      console.log("📊 Unique actions found:", uniqueActions);

      // Try filtering in memory - check for 'like' in any case
      const filteredSwipes = allSwipes
        .filter(s => s.action && s.action.toLowerCase() === 'like')
        .map(s => ({ swiper_id: s.swiper_id, created_at: s.created_at }));

      if (filteredSwipes.length > 0) {
        console.log("✅ Found swipes with case-insensitive match:", filteredSwipes.length);
        swipes = filteredSwipes;
        swipesError = null; // Clear error since we found results
      }
    }

    if (swipesError && (!swipes || swipes.length === 0)) {
      console.error("❌ Error fetching swipes:", swipesError);
      return new Response(
        JSON.stringify({
          error: swipesError.message,
          debug: {
            userId: user.id,
            allSwipesCount: allSwipes?.length || 0
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!swipes || swipes.length === 0) {
      console.log("⚠️ No swipes found for user:", user.id);
      return new Response(
        JSON.stringify({
          likedMe: [],
          debug: {
            userId: user.id,
            allSwipesCount: allSwipes?.length || 0,
            likedSwipesCount: 0
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get unique user IDs who liked the current user
    const likerUserIds = [...new Set(swipes.map((swipe) => swipe.swiper_id))];

    // Get all matches for the current user to exclude matched users
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

    if (matchesError) {
      console.error("❌ Error fetching matches:", matchesError);
    }

    // Get blocked users (both ways - users I blocked and users who blocked me)
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

    console.log("🔒 Blocking check:", {
      userId: user.id,
      blocksIBlocked: blocksIBlocked?.length || 0,
      blocksIAmBlocked: blocksIAmBlocked?.length || 0,
      totalBlockedUserIds: blockedUserIds.size,
      blockedUserIds: Array.from(blockedUserIds),
    });

    // Get unmatched users (both ways - users I unmatched and users who unmatched me)
    const { data: unmatches, error: unmatchesError } = await supabaseClient
      .from("unmatches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (unmatchesError) {
      console.error("❌ Error fetching unmatches:", unmatchesError);
    }

    // Extract unmatched user IDs
    const unmatchedUserIds = new Set<string>();
    if (unmatches) {
      unmatches.forEach((unmatch) => {
        if (unmatch.user1_id === user.id) {
          unmatchedUserIds.add(unmatch.user2_id);
        } else {
          unmatchedUserIds.add(unmatch.user1_id);
        }
      });
    }

    // Extract matched user IDs
    const matchedUserIds = new Set<string>();
    if (matches) {
      matches.forEach((match) => {
        if (match.user1 === user.id) {
          matchedUserIds.add(match.user2);
        } else {
          matchedUserIds.add(match.user1);
        }
      });
    }

    // Filter out matched users, unmatched users, and blocked users (both ways) from likerUserIds
    const unmatchedLikerIds = likerUserIds.filter(
      (id) => !matchedUserIds.has(id) && !blockedUserIds.has(id) && !unmatchedUserIds.has(id)
    );

    if (unmatchedLikerIds.length === 0) {
      return new Response(
        JSON.stringify({ likedMe: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch full user profiles for the users who liked (excluding matched users)
    const { data: likerProfiles, error: profilesError } = await supabaseClient
      .from("users")
      .select("id, first_name, last_name, name, photos, blur_photos, dob, height, marital_status, has_children, education, profession, sect, born_muslim, religious_practice, alcohol_habit, smoking_habit, ethnicity, nationality, hobbies, bio, location")
      .in("id", unmatchedLikerIds)
      .eq("account_active", true);

    if (profilesError) {
      console.error("❌ Error fetching liker user profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map profiles with their like timestamp (most recent like)
    // Also filter out any blocked users, matched users, and unmatched users as a safety check
    const likedMeWithTimestamp = (likerProfiles || [])
      .filter((profile) =>
        !blockedUserIds.has(profile.id) && !matchedUserIds.has(profile.id) && !unmatchedUserIds.has(profile.id)
      )
      .map((profile) => {
        const mostRecentSwipe = swipes.find((swipe) => swipe.swiper_id === profile.id);
        return {
          ...profile,
          likedAt: mostRecentSwipe?.created_at,
          is_liked_by_them: true,
        };
      })
      .sort((a, b) => {
        // Sort by most recently liked first
        const dateA = a.likedAt ? new Date(a.likedAt).getTime() : 0;
        const dateB = b.likedAt ? new Date(b.likedAt).getTime() : 0;
        return dateB - dateA;
      });

    console.log("✅ Matched users filter:", {
      totalLikerIds: likerUserIds.length,
      matchedUserIds: Array.from(matchedUserIds),
      unmatchedUserIds: Array.from(unmatchedUserIds),
      unmatchedLikerIds: unmatchedLikerIds.length,
      finalProfilesCount: likedMeWithTimestamp.length,
    });

    console.log("✅ Fetched liked me:", likedMeWithTimestamp.length);

    return new Response(
      JSON.stringify({ likedMe: likedMeWithTimestamp }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-liked-me:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

