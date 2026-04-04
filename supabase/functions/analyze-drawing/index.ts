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

    const systemPrompt = `You are an expert architectural drawing analyzer. You MUST extract rooms from any floor plan image or PDF.

CRITICAL RULES:
- You MUST return at least 1 room. Even if the drawing is unclear, identify whatever spaces you can see.
- Every room MUST have a "remark" field explaining WHY you chose those materials.
- Do NOT fill "flooring_size" or "ceiling_size" — always leave them as empty strings.
- Return ONLY valid JSON, no markdown, no code fences.

For each room provide ALL these fields:
{
  "name": "Room name from drawing (e.g. Master Bedroom, Kitchen, AHU Room)",
  "floor_level": "Floor level if visible (e.g. Ground Floor, First Floor)",
  "space_tag": "Room tag/number if visible",
  "room_type": "bedroom|bathroom|kitchen|living|dining|hallway|utility|office|storage|balcony|garage|lobby|staircase|general",
  "floor_finish": "Recommended flooring material based on room type",
  "flooring_size": "",
  "flooring_finish": "Surface finish (AntiSkid, Glossy, Matte, Honed etc.)",
  "flooring_code": "",
  "flooring_make": "Recommended brand",
  "flooring_rate": "",
  "skirting": "Recommended skirting material",
  "skirting_code": "",
  "skirting_make": "Recommended brand",
  "skirting_rate": "",
  "ceiling_finish": "Recommended ceiling material",
  "ceiling_material_2": "Secondary ceiling treatment (e.g. Acrylic Emulsion Paint)",
  "ceiling_size": "",
  "ceiling_code": "",
  "ceiling_make": "Recommended brand",
  "ceiling_rate": "",
  "wall_finish": "Recommended wall finish",
  "paint_color": "Recommended paint type",
  "dado": "Dado specification if applicable, else empty",
  "ceiling_height": null,
  "area": null,
  "remark": "REQUIRED: Explain why these materials were chosen for this room type. E.g. 'Anti-skid ceramic tiles recommended for bathroom due to wet area safety. MR grade gypsum board for ceiling due to moisture resistance.'"
}

Material recommendation guidelines:
- Bathrooms/Toilets: Anti-skid ceramic/vitrified tiles, MR grade gypsum ceiling
- Kitchens/Pantry: Ceramic tiles, easy-clean finishes
- Offices/Cabins: Carpet tiles or engineered wood
- Lobbies/Corridors: Homogenous vitrified tiles, glossy finish
- Utility/Electrical/AHU: Epoxy flooring, industrial grade
- Bedrooms: Laminate/engineered wood or vitrified tiles
- Living/Dining: Vitrified tiles or marble

Return this exact JSON structure:
{
  "rooms": [array of room objects],
  "undetected_spaces": ["description of any space you couldn't identify"],
  "drawing_type": "floor_plan|elevation|section|detail|unknown",
  "summary": "Brief description of the drawing"
}`;

    console.log("Sending request to AI gateway for drawing:", fileName, "mimeType:", mimeType);

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
                image_url: { url: imageBase64 },
              },
              {
                type: "text",
                text: `Analyze this architectural drawing "${fileName}". Extract ALL rooms/spaces. For EVERY room, recommend materials and EXPLAIN your reasoning in the "remark" field. Leave flooring_size and ceiling_size empty. Return raw JSON only — no markdown code fences.`,
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
    console.log("AI response length:", content.length, "first 500 chars:", content.substring(0, 500));

    let parsed;
    try {
      // Try multiple parsing strategies
      let jsonStr = content.trim();
      
      // Remove markdown code fences if present
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }
      
      // Try to find JSON object if there's extra text
      if (!jsonStr.startsWith("{")) {
        const objStart = jsonStr.indexOf("{");
        if (objStart !== -1) {
          jsonStr = jsonStr.substring(objStart);
        }
      }
      
      parsed = JSON.parse(jsonStr);
      console.log("Parsed rooms count:", parsed.rooms?.length ?? 0);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "Content:", content.substring(0, 1000));
      parsed = { rooms: [], undetected_spaces: ["AI response could not be parsed. The drawing may need to be re-uploaded."], drawing_type: "unknown", summary: "Parse error" };
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const undetectedSpaces = parsed.undetected_spaces || [];
    let feedbackText = "";
    
    if (parsed.rooms?.length === 0) {
      feedbackText = "AI could not detect any rooms from this drawing. Please try uploading a clearer floor plan image.";
    } else if (undetectedSpaces.length > 0) {
      feedbackText = `AI could not detect the following spaces:\n${undetectedSpaces.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`;
    } else {
      feedbackText = "All visible rooms/spaces were successfully detected.";
    }

    await supabaseAdmin.from("drawings").update({ analysis_feedback: feedbackText }).eq("id", drawingId);

    let roomsInserted = 0;
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
        flooring_code: room.flooring_code || "",
        flooring_make: room.flooring_make || "",
        flooring_rate: room.flooring_rate || "",
        skirting: room.skirting || "",
        skirting_code: room.skirting_code || "",
        skirting_make: room.skirting_make || "",
        skirting_rate: room.skirting_rate || "",
        ceiling_finish: room.ceiling_finish || "",
        ceiling_material_2: room.ceiling_material_2 || "",
        ceiling_size: "",
        ceiling_code: room.ceiling_code || "",
        ceiling_make: room.ceiling_make || "",
        ceiling_rate: room.ceiling_rate || "",
        ceiling_height: room.ceiling_height || null,
        wall_finish: room.wall_finish || "",
        dado: room.dado || "",
        paint_color: room.paint_color || "",
        remark: room.remark || "Material recommendation based on room type and function.",
        notes: room.notes || "",
      }));

      const { data: insertedRooms, error: roomError } = await supabaseAdmin.from("rooms").insert(roomInserts).select("id");
      if (roomError) {
        console.error("Room insert error:", JSON.stringify(roomError));
        // Update feedback to indicate room save failure
        await supabaseAdmin.from("drawings").update({ 
          analysis_feedback: feedbackText + "\n\n⚠️ Warning: Rooms were detected but failed to save to database. Error: " + roomError.message 
        }).eq("id", drawingId);
      } else {
        roomsInserted = insertedRooms?.length ?? 0;
        console.log("Successfully inserted", roomsInserted, "rooms");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rooms_found: roomsInserted,
        drawing_type: parsed.drawing_type,
        summary: parsed.summary,
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
