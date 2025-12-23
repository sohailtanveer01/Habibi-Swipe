import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Expo push helper (uses Expo push service)
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  if (!tokens || tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) console.error("Expo push error:", res.status, json);
  } catch (e) {
    console.error("Expo push exception:", e);
  }
}
serve(async (req)=>{
  // Handle preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const body = await req.json();
    const { swiped_id, action } = body;
    if (!swiped_id || ![
      "like",
      "pass",
      "superlike"
    ].includes(action)) {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    // Upsert swipe (insert or update if exists)
    // This allows users to change their mind (e.g., unlike someone by passing)
    const { error: swipeError } = await supabase.from("swipes").upsert({
      swiper_id: user.id,
      swiped_id,
      action
    }, {
      onConflict: "swiper_id,swiped_id"
    });
    if (swipeError) {
      return new Response(JSON.stringify({
        error: swipeError.message
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    // Pass = never match, no notification
    if (action === "pass") {
      return new Response(JSON.stringify({
        matched: false
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Send push notification to the liked user (for like/superlike)
    try {
      // Get the liker's name for the notification
      const { data: likerProfile } = await supabase
        .from("users")
        .select("first_name, name")
        .eq("id", user.id)
        .single();

      const likerName = likerProfile?.first_name || likerProfile?.name || "Someone";

      // Get push tokens for the liked user
      const { data: tokenRows, error: tokenErr } = await supabase
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", swiped_id)
        .eq("revoked", false)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      if (tokenErr) {
        console.error("Error fetching push tokens:", tokenErr);
      } else {
        const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
        if (tokens.length > 0) {
          const notificationBody = action === "superlike" 
            ? `${likerName} super liked you! 💫`
            : `${likerName} liked you! 💖`;
          
          await sendExpoPush(tokens, {
            title: "New Like!",
            body: notificationBody,
            data: { type: "new_like", swiperId: user.id },
          });
          console.log("📱 Sent like notification to user:", swiped_id);
        }
      }
    } catch (e) {
      console.error("Push notification failed:", e);
      // Don't fail the request if push fails
    }

    // Check reverse swipe
    const { data: reverseSwipe } = await supabase.from("swipes").select("id").eq("swiper_id", swiped_id).eq("swiped_id", user.id).in("action", [
      "like",
      "superlike"
    ]).maybeSingle();
    if (!reverseSwipe) {
      return new Response(JSON.stringify({
        matched: false
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    // Compute unique match pair (ensure user1 < user2 for consistency)
    const user1 = user.id < swiped_id ? user.id : swiped_id;
    const user2 = user.id > swiped_id ? user.id : swiped_id;
    
    // Check if match already exists
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("user1", user1)
      .eq("user2", user2)
      .maybeSingle();
    
    let matchId = null;
    let otherUser = null;
    
    if (!existingMatch) {
      // Create new match
      const { data: newMatch, error: matchError } = await supabase
        .from("matches")
        .insert({
          user1: user1,
          user2: user2
        })
        .select("id")
        .single();
      
      if (matchError) {
        console.error("Error creating match:", matchError);
      } else {
        matchId = newMatch.id;
      }
    } else {
      matchId = existingMatch.id;
    }
    
    // Get the other user's profile for the match celebration screen
    if (matchId) {
      const { data: profile } = await supabase
        .from("users")
        .select("id, first_name, last_name, name, photos")
        .eq("id", swiped_id)
        .single();
      
      if (profile) {
        otherUser = profile;
      }
    }
    
    return new Response(JSON.stringify({
      matched: true,
      matchId: matchId,
      otherUser: otherUser
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
