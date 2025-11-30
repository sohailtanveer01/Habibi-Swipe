import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { user_id, limit = 20 } = await req.json();

    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's location preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from("user_preferences")
      .select("location_enabled, location_filter_type, search_radius_miles, search_location, search_country")
      .eq("user_id", user.id)
      .single();

    if (prefsError && prefsError.code !== "PGRST116") {
      console.error("Error fetching preferences:", prefsError);
      // Continue without preferences if not found (PGRST116 = no rows)
    }

    // Get users that the current user has already swiped on
    const { data: swipedUsers } = await supabaseClient
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", user.id);

    const swipedIds = swipedUsers?.map((s) => s.swiped_id) || [];
    const swipedIdsSet = new Set(swipedIds);

    // Build query for profiles - get more to account for filtering
    let query = supabaseClient
      .from("users")
      .select("*")
      .neq("id", user.id)
      .limit(limit * 5); // Get more to account for filtering

    // If location filter is enabled, we'll filter client-side after fetching
    // (PostGIS functions require raw SQL which isn't easily available in Supabase JS client)
    const { data: allProfiles, error: profilesError } = await query;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Helper function to calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000; // Earth radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Extract search location coordinates if distance filter is enabled
    let searchLat: number | null = null;
    let searchLon: number | null = null;
    let searchRadiusMeters: number | null = null;
    let searchCountry: string | null = null;

    if (preferences?.location_enabled) {
      if (preferences.location_filter_type === "distance" && preferences?.search_location) {
        try {
          const searchLocationStr = preferences.search_location;
          const searchMatch = searchLocationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (searchMatch) {
            searchLon = parseFloat(searchMatch[1]);
            searchLat = parseFloat(searchMatch[2]);
            // Convert miles to meters
            searchRadiusMeters = (preferences.search_radius_miles || 50) * 1609.34;
            console.log("Distance filter enabled:", {
              lat: searchLat,
              lon: searchLon,
              radiusMiles: preferences.search_radius_miles,
              radiusMeters: searchRadiusMeters,
            });
          }
        } catch (error) {
          console.error("Error parsing search location:", error);
        }
      } else if (preferences.location_filter_type === "country" && preferences?.search_country) {
        searchCountry = preferences.search_country;
        console.log("Country filter enabled:", searchCountry);
      }
    }

    // Filter profiles - all filtering logic in one place
    let filteredProfiles = (allProfiles || []).filter((profile) => {
      // Exclude already swiped users
      if (swipedIdsSet.has(profile.id)) return false;

      // Must have photos
      if (!profile.photos || profile.photos.length === 0) return false;

      // Apply location filter if enabled
      if (preferences?.location_enabled) {
        if (preferences.location_filter_type === "distance") {
          // Distance-based filtering
          if (searchLat !== null && searchLon !== null && searchRadiusMeters !== null && profile.location) {
            try {
              // Extract coordinates from profile's PostGIS point
              const profileLocationStr = profile.location;
              const profileMatch = profileLocationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);

              if (profileMatch) {
                const profileLon = parseFloat(profileMatch[1]);
                const profileLat = parseFloat(profileMatch[2]);

                // Calculate distance
                const distance = calculateDistance(searchLat, searchLon, profileLat, profileLon);

                // Filter by radius
                if (distance > searchRadiusMeters) return false;
              } else {
                // If profile location format is invalid, exclude it when distance filter is enabled
                return false;
              }
            } catch (error) {
              console.error("Error calculating distance for profile:", profile.id, error);
              // If distance calculation fails, exclude the profile when distance filter is enabled
              return false;
            }
          } else {
            // Distance filter enabled but no search location set - exclude profiles without location
            if (!profile.location) return false;
          }
        } else if (preferences.location_filter_type === "country") {
          // Country-based filtering
          if (searchCountry) {
            // Filter by country (case-insensitive partial match)
            if (!profile.nationality || 
                !profile.nationality.toLowerCase().includes(searchCountry.toLowerCase())) {
              return false;
            }
          }
        }
      }

      // TODO: Add more filters here as needed
      // Example for future filters:
      // if (preferences?.age_min && profile.dob) {
      //   const age = calculateAge(profile.dob);
      //   if (age < preferences.age_min || age > preferences.age_max) return false;
      // }

      return true;
    });

    // Limit results
    const profiles = filteredProfiles.slice(0, limit);

    return new Response(
      JSON.stringify({ profiles: profiles || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get_swipe_feed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
