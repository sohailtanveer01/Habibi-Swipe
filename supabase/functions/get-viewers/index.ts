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

    console.log("📍 Fetching viewers for user:", user.id);

    // Get all profile views for the current user (where they were viewed)
    // Group by viewer_id to get view counts and last viewed time
    const { data: views, error: viewsError } = await supabaseClient
      .from("profile_views")
      .select("viewer_id, created_at")
      .eq("viewed_id", user.id)
      .order("created_at", { ascending: false });

    if (viewsError) {
      console.error("❌ Error fetching views:", viewsError);
      return new Response(
        JSON.stringify({ error: viewsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!views || views.length === 0) {
      return new Response(
        JSON.stringify({ viewers: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group views by viewer_id and calculate stats
    const viewerStats = new Map();
    views.forEach((view) => {
      const viewerId = view.viewer_id;
      if (!viewerStats.has(viewerId)) {
        viewerStats.set(viewerId, {
          viewer_id: viewerId,
          viewCount: 0,
          lastViewedAt: view.created_at,
        });
      }
      const stats = viewerStats.get(viewerId);
      stats.viewCount++;
      // Keep the most recent view time
      if (new Date(view.created_at) > new Date(stats.lastViewedAt)) {
        stats.lastViewedAt = view.created_at;
      }
    });

    // Get unique viewer IDs
    const viewerIds = Array.from(viewerStats.keys());

    // Fetch full user profiles for all viewers
    const { data: viewers, error: viewersError } = await supabaseClient
      .from("users")
      .select("*")
      .in("id", viewerIds);

    if (viewersError) {
      console.error("❌ Error fetching viewer profiles:", viewersError);
      return new Response(
        JSON.stringify({ error: viewersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine viewer profiles with view stats, sorted by most recent view
    const viewersWithStats = viewers
      .map((viewer) => {
        const stats = viewerStats.get(viewer.id);
        return {
          ...viewer,
          viewCount: stats.viewCount,
          lastViewedAt: stats.lastViewedAt,
        };
      })
      .sort((a, b) => 
        new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime()
      );

    console.log(`✅ Found ${viewersWithStats.length} unique viewers`);

    return new Response(
      JSON.stringify({ viewers: viewersWithStats }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in get-viewers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

