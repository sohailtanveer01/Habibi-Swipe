import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// STRICT HALAL MODE (Layer 1): fast English + Arabic filter
// Blocks sending if vulgar/derogatory/sexual language is detected.
// NOTE: Keep this list curated and extend as needed.
// ============================================================================
function normalizeArabic(input: string) {
  // Remove tashkeel + tatweel, normalize alef/hamza variants, etc.
  return input
    .replace(/[\u064B-\u065F\u0670]/g, "") // harakat/tashkeel
    .replace(/\u0640/g, "") // tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
}

function normalizeEnglish(input: string) {
  const lower = input.toLowerCase();
  // basic leetspeak mapping
  return lower
    .replace(/[@]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5]/g, "s")
    .replace(/[7]/g, "t");
}

function collapseRepeats(input: string) {
  // reduce long repeats: "sooooo" -> "soo"
  return input.replace(/(.)\1{2,}/g, "$1$1");
}

function compactForMatching(input: string) {
  // remove spaces/punctuation (keep letters/digits)
  return input.replace(/[^\p{L}\p{N}]+/gu, "");
}

function isHalalBlocked(text: string): { blocked: boolean; reason?: string } {
  const raw = text ?? "";
  if (!raw.trim()) return { blocked: false };

  const norm = collapseRepeats(normalizeArabic(normalizeEnglish(raw)));
  const compact = compactForMatching(norm);

  // Hard-block patterns (strict mode). Keep small + curated.
  // English: profanity / sexual / harassment keywords (with light obfuscation handled by `compact`)
  const hardEn = [
    /fuck/i,
    /shit/i,
    /bitch/i,
    /whore/i,
    /slut/i,
    /nude/i,
    /nudes/i,
    /sex/i,
    /blowjob/i,
  ];

  // Arabic: common vulgar/sexual insults (normalized)
  const hardAr = [
    /قحبه/,
    /شرموطه/,
    /زنا/,
    /جنس/,
    /نيك/,
    /كس/,
    /طيز/,
    /زب/,
  ];

  // Also check compact version to catch "f.u.c.k", "f u c k", etc.
  for (const re of hardEn) {
    if (re.test(norm) || re.test(compact)) return { blocked: true, reason: "inappropriate_language" };
  }
  for (const re of hardAr) {
    if (re.test(norm) || re.test(compact)) return { blocked: true, reason: "inappropriate_language" };
  }

  // Additional cheap heuristics: aggressive patterns (English)
  const aggressive = [
    /you\s+are\s+(an?\s+)?(idiot|stupid|trash|garbage)/i,
  ];
  for (const re of aggressive) {
    if (re.test(norm)) return { blocked: true, reason: "derogatory_language" };
  }

  return { blocked: false };
}

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
    const { matchId, content, mediaUrl, mediaType, replyToId } = await req.json();
    
    console.log("📍 Received request:", { matchId, content, mediaUrl, mediaType, replyToId });
    
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

    // Strict halal mode: block vulgar/derogatory language BEFORE inserting
    if (content && content.trim()) {
      const verdict = isHalalBlocked(content.trim());
      if (verdict.blocked) {
        return new Response(
          JSON.stringify({
            blocked: true,
            reason: verdict.reason ?? "inappropriate_language",
            warning:
              "Please keep the conversation halal and respectful. Your message contains inappropriate or derogatory language—please rephrase.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    
    // Add reply_to_id if provided
    if (replyToId) {
      // Verify the reply-to message exists and is in the same match
      const { data: replyToMessage, error: replyError } = await supabaseClient
        .from("messages")
        .select("id, match_id")
        .eq("id", replyToId)
        .single();
      
      if (replyError || !replyToMessage) {
        console.error("❌ Reply-to message not found:", replyError);
        return new Response(
          JSON.stringify({ error: "Reply-to message not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (replyToMessage.match_id !== matchId) {
        return new Response(
          JSON.stringify({ error: "Reply-to message must be in the same match" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      messageData.reply_to_id = replyToId;
      console.log("💬 Adding reply to message:", replyToId);
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

