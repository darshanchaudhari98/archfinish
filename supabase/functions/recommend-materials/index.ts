import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SURFACES = ["floor", "wall", "ceiling"];
const TIERS = ["budget", "standard", "premium"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, floorId, userId, rooms } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return new Response(JSON.stringify({ success: true, recommendations: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a senior architectural finishes consultant. For each room given, recommend materials for THREE surfaces: floor, wall, ceiling.

For every surface give exactly 3 alternatives with tier "budget", "standard" and "premium".

Judge each recommendation on: room type, usage intensity, durability, maintenance effort, moisture/slip resistance and cost.

Return ONLY raw JSON (no markdown fences) in this exact shape:
{
  "recommendations": [
    {
      "room_id": "the id given for the room",
      "surface": "floor|wall|ceiling",
      "tier": "budget|standard|premium",
      "recommended_finish": "specific material + finish, e.g. 'Anti-skid ceramic tile 300x300, matte'",
      "rationale": "1-2 sentences on why this suits the room",
      "durability": "short rating + note, e.g. 'High — resists heavy foot traffic'",
      "maintenance": "short note",
      "moisture_slip": "short note on moisture/slip performance",
      "cost_note": "relative cost band, e.g. 'Low (₹45-70/sqft)'"
    }
  ]
}`;

    const roomList = rooms
      .map(
        (r: any) =>
          `id=${r.id} | name=${r.name} | type=${r.room_type ?? "general"} | detected_floor=${r.floor_finish ?? ""} | detected_wall=${r.wall_finish ?? ""} | detected_ceiling=${r.ceiling_finish ?? ""}`
      )
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Recommend finishes for these rooms. Use the exact room ids provided.\n\n${roomList}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI recommendation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let content = (aiResult.choices?.[0]?.message?.content ?? "").trim();
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) content = fence[1].trim();
    if (!content.startsWith("{")) {
      const i = content.indexOf("{");
      if (i !== -1) content = content.substring(i);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Parse error:", err, content.substring(0, 800));
      throw new Error("AI returned an unreadable response. Please try again.");
    }

    const detectedBySurface = (room: any, surface: string) =>
      surface === "floor" ? room.floor_finish : surface === "wall" ? room.wall_finish : room.ceiling_finish;

    const roomMap = new Map(rooms.map((r: any) => [String(r.id), r]));
    const inserts = (parsed.recommendations ?? [])
      .filter((rec: any) => roomMap.has(String(rec.room_id)) && SURFACES.includes(rec.surface))
      .map((rec: any) => {
        const room: any = roomMap.get(String(rec.room_id));
        return {
          room_id: rec.room_id,
          project_id: projectId,
          floor_id: floorId ?? null,
          user_id: userId,
          surface: rec.surface,
          detected_finish: detectedBySurface(room, rec.surface) || "",
          recommended_finish: rec.recommended_finish || "",
          tier: TIERS.includes(rec.tier) ? rec.tier : "standard",
          rationale: rec.rationale || "",
          durability: rec.durability || "",
          maintenance: rec.maintenance || "",
          moisture_slip: rec.moisture_slip || "",
          cost_note: rec.cost_note || "",
          status: "pending",
        };
      });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Replace previous AI suggestions for these rooms
    await supabaseAdmin
      .from("room_recommendations")
      .delete()
      .in("room_id", rooms.map((r: any) => r.id));

    if (inserts.length > 0) {
      const { error } = await supabaseAdmin.from("room_recommendations").insert(inserts);
      if (error) throw new Error(error.message);
    }

    return new Response(JSON.stringify({ success: true, recommendations: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-materials error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
