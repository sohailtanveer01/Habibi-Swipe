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

    // Create client for user authentication
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

    // Get all swipes where someone liked the current user (swiped_id = current user, action = 'like')
    const { data: swipes, error: swipesError } = await supabaseClient
      .from("swipes")
      .select("swiper_id, action, created_at")
      .eq("swiped_id", user.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    console.log("📊 Swipes with action='like':", JSON.stringify(swipes, null, 2));
    console.log("📊 Number of swipes found:", swipes?.length || 0);

    if (swipesError) {
      console.error("❌ Error fetching swipes:", swipesError);
      return new Response(
        JSON.stringify({ 
          error: swipesError.message,
          debug: {
            userId: user.id
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!swipes || swipes.length === 0) {
      console.log("⚠️ No swipes found for user:", user.id);
      return new Response(
        JSON.stringify({ 
          likedMe: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get unique user IDs who liked the current user
    const likerUserIds = [...new Set(swipes.map((swipe) => swipe.swiper_id))];

    // Fetch full user profiles for the users who liked
    const { data: likerProfiles, error: profilesError } = await supabaseClient
      .from("users")
      .select("id, first_name, last_name, name, photos")
      .in("id", likerUserIds);

    if (profilesError) {
      console.error("❌ Error fetching liker user profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map profiles with their like timestamp (most recent like)
    const likedMeWithTimestamp = (likerProfiles || []).map((profile) => {
      const mostRecentSwipe = swipes.find((swipe) => swipe.swiper_id === profile.id);
      return {
        ...profile,
        likedAt: mostRecentSwipe?.created_at,
      };
    }).sort((a, b) => {
      // Sort by most recently liked first
      const dateA = a.likedAt ? new Date(a.likedAt).getTime() : 0;
      const dateB = b.likedAt ? new Date(b.likedAt).getTime() : 0;
      return dateB - dateA;
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

