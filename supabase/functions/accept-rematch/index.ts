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

    // Get request body
    const { matchId } = await req.json();

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "matchId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📍 Accept rematch:", { matchId, userId: user.id });

    // Find the unmatch record
    const { data: unmatchRecord, error: unmatchError } = await supabaseClient
      .from("unmatches")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (unmatchError || !unmatchRecord) {
      return new Response(
        JSON.stringify({ error: "Unmatch record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of this unmatch and is NOT the one who requested
    if (unmatchRecord.user1_id !== user.id && unmatchRecord.user2_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: User is not part of this unmatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify there's a pending request and user is not the requester
    if (unmatchRecord.rematch_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: "No pending rematch request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (unmatchRecord.rematch_requested_by === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot accept your own rematch request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine other user ID
    const otherUserId = unmatchRecord.user1_id === user.id 
      ? unmatchRecord.user2_id 
      : unmatchRecord.user1_id;

    // Check if users are blocked
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

    if (iBlockedThem || theyBlockedMe) {
      return new Response(
        JSON.stringify({ error: "Cannot rematch with a blocked user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if match already exists (might have been created in a previous attempt)
    const user1 = user.id < otherUserId ? user.id : otherUserId;
    const user2 = user.id < otherUserId ? otherUserId : user.id;

    // Check for existing match with both possible orderings
    const { data: existingMatch1 } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("user1", user1)
      .eq("user2", user2)
      .maybeSingle();

    const { data: existingMatch2 } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("user1", user2)
      .eq("user2", user1)
      .maybeSingle();

    const existingMatch = existingMatch1 || existingMatch2;

    let newMatch;
    if (existingMatch) {
      // Match already exists, use it
      console.log("ℹ️ Match already exists, using existing match:", existingMatch.id);
      newMatch = existingMatch;
    } else {
      // Create new match (RLS policy will allow this if rematch request is pending)
      // Ensure consistent ordering: user1 < user2
      const { data: createdMatch, error: matchError } = await supabaseClient
        .from("matches")
        .insert({
          user1,
          user2,
        })
        .select()
        .single();

      if (matchError) {
        console.error("❌ Error creating match:", JSON.stringify(matchError, null, 2));
        console.error("❌ Error details:", matchError.message, matchError.details, matchError.hint);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create match",
            details: matchError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newMatch = createdMatch;
    }

    // Remove unmatch record
    const { error: deleteError } = await supabaseClient
      .from("unmatches")
      .delete()
      .eq("match_id", matchId);

    if (deleteError) {
      console.error("⚠️ Error deleting unmatch record:", deleteError);
      // Don't fail the request if deletion fails, match is already created
    }

    console.log("✅ Rematch accepted, match created:", newMatch.id);

    return new Response(
      JSON.stringify({
        success: true,
        matchId: newMatch.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in accept-rematch:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

