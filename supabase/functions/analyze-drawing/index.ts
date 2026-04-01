import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, drawingId, projectId, userId, fileName, mimeType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an architectural drawing analyzer. Analyze the uploaded architectural floor plan image and extract ALL rooms visible in the drawing.

For each room, provide:
- name: The room label (e.g. "Living Room", "Kitchen", "Bedroom 1")
- room_type: Category (bedroom, bathroom, kitchen, living, dining, hallway, utility, office, storage, balcony, garage, general)
- area: Estimated area in square feet (numeric, estimate from proportions if dimensions given)
- dimensions: Any dimension text you can read (as JSON object like {"length": "5m", "width": "4m"})
- wall_finish: Suggested wall finish (e.g. "Painted plaster", "Ceramic tiles", "Wallpaper")
- floor_finish: Suggested floor finish (e.g. "Ceramic tiles", "Hardwood", "Marble", "Carpet")
- ceiling_finish: Suggested ceiling finish (e.g. "Painted plaster", "False ceiling", "Exposed concrete")
- ceiling_height: Standard ceiling height in meters (typically 2.7-3.0)
- skirting: Suggested skirting type (e.g. "Wood skirting 100mm", "Ceramic cove", "None")
- dado: Suggested dado (e.g. "Ceramic dado 1200mm" for bathrooms, "None" for bedrooms)
- paint_color: Suggested paint color (e.g. "White - RAL 9010", "Light Grey", "Cream")
- notes: Any relevant notes

Also detect any text labels, dimensions, or annotations in the drawing.

Return a JSON object with this exact structure:
{
  "rooms": [array of room objects],
  "detected_text": [array of text strings found],
  "drawing_type": "floor_plan" | "elevation" | "section" | "detail" | "unknown",
  "summary": "Brief description of what the drawing shows"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64, ...(mimeType === "application/pdf" ? { detail: "auto" } : {}) },
              },
              {
                type: "text",
                text: `Analyze this architectural drawing named "${fileName}". Extract all rooms and their finishes. Return valid JSON only.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { rooms: [], detected_text: [], drawing_type: "unknown", summary: "Could not parse analysis" };
    }

    // Store rooms in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    if (parsed.rooms && parsed.rooms.length > 0) {
      const roomInserts = parsed.rooms.map((room: any) => ({
        drawing_id: drawingId,
        project_id: projectId,
        user_id: userId,
        name: room.name || "Unnamed Room",
        room_type: room.room_type || "general",
        area: room.area || null,
        area_unit: "sq ft",
        dimensions: room.dimensions || {},
        wall_finish: room.wall_finish || "",
        floor_finish: room.floor_finish || "",
        ceiling_finish: room.ceiling_finish || "",
        ceiling_height: room.ceiling_height || null,
        skirting: room.skirting || "",
        dado: room.dado || "",
        paint_color: room.paint_color || "",
        notes: room.notes || "",
      }));

      const { error: roomError } = await supabaseAdmin.from("rooms").insert(roomInserts);
      if (roomError) {
        console.error("Room insert error:", roomError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rooms_found: parsed.rooms?.length ?? 0,
        drawing_type: parsed.drawing_type,
        summary: parsed.summary,
        detected_text: parsed.detected_text,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-drawing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
