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

    const systemPrompt = `You are an architectural drawing analyzer. Analyze the uploaded architectural floor plan and extract ALL rooms/spaces visible.

For each room, provide these fields matching a professional Schedule of Finishes format:

- name: The space description (e.g. "Electrical Room", "Public Lift Lobby")
- floor_level: Which floor (e.g. "Basement 1", "Ground Floor", "First Floor")
- space_tag: Room/space tag if visible
- room_type: Category (bedroom, bathroom, kitchen, living, dining, hallway, utility, office, storage, balcony, garage, lobby, staircase, hub, ahu, general)

FLOORING:
- floor_finish: Flooring material (e.g. "Kota Stone", "Granite Stone", "Homogenous Vitrified Tiles", "Carpet Flooring", "LVT Flooring")
- flooring_size: Tile/material size (e.g. "600 x 600", "800 x 1600")
- flooring_finish: Surface finish (e.g. "AntiSkid", "Glossy", "Matte", "Honed", "Leather")
- flooring_code: Material code number if visible
- flooring_make: Manufacturer/brand if visible
- flooring_rate: Basic rate if visible

SKIRTING:
- skirting: Skirting material (e.g. "Kota Stone", "Granite Stone", "Aluminium", "Coving")
- skirting_code: Code number if visible
- skirting_make: Manufacturer/brand if visible
- skirting_rate: Basic rate if visible

CEILING:
- ceiling_finish: Primary ceiling material (e.g. "Regular Gypsum Board Ceiling", "MR Grade Gypsum Board Ceiling", "Lay in Metal Modular Non-Perforated Tiles")
- ceiling_material_2: Secondary ceiling treatment (e.g. "Acrylic Emulsion Paint", "OBD Paint", "Stretch Fabric Ceiling")
- ceiling_size: Ceiling panel size (e.g. "600 x 600", "600 x 1200")
- ceiling_code: Code number if visible
- ceiling_make: Manufacturer/brand if visible
- ceiling_rate: Basic rate if visible

OTHER:
- wall_finish: Wall finish material
- paint_color: Paint type/color
- dado: Dado specification
- ceiling_height: Height in meters
- area: Estimated area in sq ft
- remark: Any remarks or notes

Return a JSON object:
{
  "rooms": [array of room objects with above fields],
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
                text: `Analyze this architectural drawing named "${fileName}". Extract all rooms with detailed flooring, skirting, and ceiling specifications. Return valid JSON only.`,
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
      parsed = { rooms: [], detected_text: [], drawing_type: "unknown", summary: "Could not parse analysis" };
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

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
        flooring_size: room.flooring_size || "",
        flooring_finish: room.flooring_finish || "",
        flooring_code: room.flooring_code || "",
        flooring_make: room.flooring_make || "",
        flooring_rate: room.flooring_rate || "",
        skirting: room.skirting || "",
        skirting_code: room.skirting_code || "",
        skirting_make: room.skirting_make || "",
        skirting_rate: room.skirting_rate || "",
        ceiling_finish: room.ceiling_finish || "",
        ceiling_material_2: room.ceiling_material_2 || "",
        ceiling_size: room.ceiling_size || "",
        ceiling_code: room.ceiling_code || "",
        ceiling_make: room.ceiling_make || "",
        ceiling_rate: room.ceiling_rate || "",
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
