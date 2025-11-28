import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching likes for user:", user.id);

    // Get swipes where the current user was liked (swiped_id = current user, action = like)
    const { data: swipes, error: swipesError } = await supabaseClient
      .from("swipes")
      .select("id, swiper_id, created_at")
      .eq("swiped_id", user.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    if (swipesError) {
      console.error("Error fetching swipes:", swipesError);
      return new Response(
        JSON.stringify({ error: swipesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found swipes:", swipes?.length || 0);

    if (!swipes || swipes.length === 0) {
      return new Response(
        JSON.stringify({ likes: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user IDs from swipes
    const swiperIds = swipes.map((swipe: any) => swipe.swiper_id).filter(Boolean);

    // Fetch user profiles for all swipers
    const { data: users, error: usersError } = await supabaseClient
      .from("users")
      .select("*")
      .in("id", swiperIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: usersError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found users:", users?.length || 0);

    // Create a map of user ID to user data
    const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

    // Combine swipe data with user profiles
    const likes = swipes
      .map((swipe: any) => {
        const swiper = usersMap.get(swipe.swiper_id);
        if (!swiper) {
          console.log("User not found for swiper_id:", swipe.swiper_id);
          return null;
        }
        return {
          ...swiper,
          swipe_id: swipe.id,
          created_at: swipe.created_at,
        };
      })
      .filter(Boolean);

    console.log("Returning likes:", likes.length);

    return new Response(
      JSON.stringify({ likes }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get_likes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

