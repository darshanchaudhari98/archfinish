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

    const systemPrompt = `You are an expert architectural drawing analyzer and interior design material consultant. Analyze the uploaded architectural floor plan and extract ALL rooms/spaces visible.

For each room you detect, you must:
1. Identify the room/space from the drawing
2. RECOMMEND appropriate finishing materials based on the room type, its function, and industry best practices
3. Provide reasoning for each material recommendation

For each room, provide these fields:

- name: The space description (e.g. "Electrical Room", "Public Lift Lobby", "Master Bedroom")
- floor_level: Which floor (e.g. "Basement 1", "Ground Floor", "First Floor")
- space_tag: Room/space tag if visible in the drawing
- room_type: Category (bedroom, bathroom, kitchen, living, dining, hallway, utility, office, storage, balcony, garage, lobby, staircase, hub, ahu, general)

FLOORING (recommend appropriate material based on room type):
- floor_finish: Recommended flooring material (e.g. "Kota Stone" for utility areas, "Homogenous Vitrified Tiles" for lobbies, "Carpet Flooring" for offices, "Anti-skid Ceramic Tiles" for bathrooms)
- flooring_finish: Surface finish (e.g. "AntiSkid" for wet areas, "Glossy" for lobbies, "Matte" for offices, "Honed" for corridors)
- flooring_code: Leave empty
- flooring_make: Recommend a suitable brand/manufacturer if applicable
- flooring_rate: Leave empty
- NOTE: Do NOT fill flooring_size — leave it empty

SKIRTING (recommend based on flooring material):
- skirting: Recommended skirting material matching the floor (e.g. "Granite Stone" skirting for granite floors, "Aluminium" for modern offices)
- skirting_code: Leave empty
- skirting_make: Recommend brand if applicable
- skirting_rate: Leave empty

CEILING (recommend based on room function):
- ceiling_finish: Recommended primary ceiling material (e.g. "Regular Gypsum Board Ceiling" for offices, "MR Grade Gypsum Board Ceiling" for wet areas, "Lay in Metal Modular Non-Perforated Tiles" for utility)
- ceiling_material_2: Recommended secondary treatment (e.g. "Acrylic Emulsion Paint", "OBD Paint")
- ceiling_code: Leave empty
- ceiling_make: Recommend brand if applicable
- ceiling_rate: Leave empty
- NOTE: Do NOT fill ceiling_size — leave it empty

OTHER:
- wall_finish: Recommended wall finish
- paint_color: Recommended paint type
- dado: Dado specification if applicable
- ceiling_height: Height in meters if visible
- area: Estimated area in sq ft if visible

REMARK (IMPORTANT): For each room, explain WHY you recommended those specific materials. For example:
- "Anti-skid vitrified tiles recommended for bathroom due to wet area safety requirements"
- "Carpet flooring suggested for executive office for acoustic insulation and premium feel"
- "MR Grade gypsum board for washroom ceiling due to high moisture environment"

Also identify any rooms or spaces that you could NOT fully detect or are uncertain about.

Return a JSON object:
{
  "rooms": [array of room objects with above fields],
  "undetected_spaces": [array of strings describing rooms/areas that could not be clearly identified, e.g. "Partially visible room in top-right corner", "Unclear space behind staircase"],
  "detected_text": [array of text strings found in the drawing],
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
                text: `Analyze this architectural drawing named "${fileName}". For each room detected, recommend appropriate finishing materials and explain your reasoning in the remark field. Do NOT fill any "size" fields. List any spaces you could not detect in "undetected_spaces". Return valid JSON only.`,
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { rooms: [], undetected_spaces: [], detected_text: [], drawing_type: "unknown", summary: "Could not parse analysis" };
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Build feedback string from undetected spaces
    const undetectedSpaces = parsed.undetected_spaces || [];
    const feedbackText = undetectedSpaces.length > 0
      ? `AI could not detect the following spaces:\n${undetectedSpaces.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`
      : "All visible rooms/spaces were successfully detected.";

    // Save feedback to drawing record
    await supabaseAdmin.from("drawings").update({ analysis_feedback: feedbackText }).eq("id", drawingId);

    if (parsed.rooms && parsed.rooms.length > 0) {
      const roomInserts = parsed.rooms.map((room: any) => ({
        drawing_id: drawingId,
        project_id: projectId,
        user_id: userId,
        name: room.name || "Unnamed Room",
        floor_level: room.floor_level || "",
        space_tag: room.space_tag || "",
        room_type: room.room_type || "general",
        area: room.area || null,
        area_unit: "sq ft",
        dimensions: room.dimensions || {},
        floor_finish: room.floor_finish || "",
        flooring_size: "",
        flooring_finish: room.flooring_finish || "",
        flooring_code: "",
        flooring_make: room.flooring_make || "",
        flooring_rate: "",
        skirting: room.skirting || "",
        skirting_code: "",
        skirting_make: room.skirting_make || "",
        skirting_rate: "",
        ceiling_finish: room.ceiling_finish || "",
        ceiling_material_2: room.ceiling_material_2 || "",
        ceiling_size: "",
        ceiling_code: "",
        ceiling_make: room.ceiling_make || "",
        ceiling_rate: "",
        ceiling_height: room.ceiling_height || null,
        wall_finish: room.wall_finish || "",
        dado: room.dado || "",
        paint_color: room.paint_color || "",
        remark: room.remark || "",
        notes: room.notes || "",
      }));

      const { error: roomError } = await supabaseAdmin.from("rooms").insert(roomInserts);
      if (roomError) console.error("Room insert error:", roomError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rooms_found: parsed.rooms?.length ?? 0,
        drawing_type: parsed.drawing_type,
        summary: parsed.summary,
        detected_text: parsed.detected_text,
        undetected_spaces: undetectedSpaces,
        analysis_feedback: feedbackText,
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
