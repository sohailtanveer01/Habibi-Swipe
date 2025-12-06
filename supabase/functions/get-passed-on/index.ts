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

    console.log("Fetching users passed on by:", user.id);

    // Get all swipes where the current user passed on someone (action = 'pass')
    const { data: swipes, error: swipesError } = await supabaseClient
      .from("swipes")
      .select("swiped_id, created_at")
      .eq("swiper_id", user.id)
      .eq("action", "pass")
      .order("created_at", { ascending: false });

    if (swipesError) {
      console.error("❌ Error fetching swipes:", swipesError);
      return new Response(
        JSON.stringify({ error: swipesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!swipes || swipes.length === 0) {
      return new Response(
        JSON.stringify({ passedOn: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get unique user IDs that were passed on
    const passedOnUserIds = [...new Set(swipes.map((swipe) => swipe.swiped_id))];

    if (passedOnUserIds.length === 0) {
      return new Response(
        JSON.stringify({ passedOn: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch full user profiles for the passed on users
    const { data: passedOnProfiles, error: profilesError } = await supabaseClient
      .from("users")
      .select("id, first_name, last_name, name, photos")
      .in("id", passedOnUserIds);

    if (profilesError) {
      console.error("❌ Error fetching passed on user profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map profiles with their pass timestamp (most recent pass)
    const passedOnWithTimestamp = (passedOnProfiles || []).map((profile) => {
      const mostRecentSwipe = swipes.find((swipe) => swipe.swiped_id === profile.id);
      return {
        ...profile,
        passedAt: mostRecentSwipe?.created_at,
      };
    }).sort((a, b) => {
      // Sort by most recently passed first
      const dateA = a.passedAt ? new Date(a.passedAt).getTime() : 0;
      const dateB = b.passedAt ? new Date(b.passedAt).getTime() : 0;
      return dateB - dateA;
    });

    console.log("✅ Fetched passed on:", passedOnWithTimestamp.length);

    return new Response(
      JSON.stringify({ passedOn: passedOnWithTimestamp }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-passed-on:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

