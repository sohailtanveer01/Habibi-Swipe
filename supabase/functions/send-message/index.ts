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

    // Get message data from request
    const { matchId, content, mediaUrl, mediaType } = await req.json();
    
    console.log("📍 Received request:", { matchId, content, mediaUrl, mediaType });
    
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "Missing matchId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // At least one of content or mediaUrl must be provided
    if ((!content || !content.trim()) && !mediaUrl) {
      return new Response(
        JSON.stringify({ error: "Message must have either content or media" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📍 Sending message for match:", matchId, "user:", user.id);

    // Verify match exists and user is part of it
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      console.error("❌ Match error:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of this match
    if (match.user1 !== user.id && match.user2 !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to this chat" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the message
    const messageData: any = {
      match_id: matchId,
      sender_id: user.id,
    };
    
    // Add content if provided
    if (content && content.trim()) {
      messageData.content = content.trim();
    }
    
    // Add media if provided
    if (mediaUrl) {
      const finalMediaType = mediaType || "image"; // Default to image if not specified
      
      // Use image_url for images, voice_url for voice notes
      if (finalMediaType === "image") {
        messageData.image_url = mediaUrl;
      } else if (finalMediaType === "audio" || finalMediaType === "voice") {
        messageData.voice_url = mediaUrl;
      }
      
      messageData.media_type = finalMediaType;
      
      console.log("📸 Adding media to message:", { 
        image_url: finalMediaType === "image" ? mediaUrl : null,
        voice_url: (finalMediaType === "audio" || finalMediaType === "voice") ? mediaUrl : null,
        media_type: finalMediaType 
      });
    }
    
    console.log("📤 Message data to insert:", JSON.stringify(messageData, null, 2));
    
    const { data: message, error: messageError } = await supabaseClient
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error("❌ Message insert error:", messageError);
      console.error("❌ Error details:", JSON.stringify(messageError, null, 2));
      return new Response(
        JSON.stringify({ error: messageError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Message sent successfully:", message.id);
    console.log("✅ Message data returned:", JSON.stringify(message, null, 2));

    return new Response(
      JSON.stringify({
        message,
        success: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in send-message:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

