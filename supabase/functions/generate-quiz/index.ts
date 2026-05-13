// Generate SSC-grade MCQ quiz from chunk notes (with topic fallback for thin notes).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert SSC (Staff Selection Commission) exam quiz writer for SSC CGL, CHSL, MTS, GD-Constable level.

You are given:
- A topic / subject name
- Optional study notes from the candidate
- Number of questions (n)
- Difficulty (easy / medium / hard)

Your job:
1. Generate EXACTLY n SSC-style MCQ questions.
2. Each question MUST be type "mcq" with EXACTLY 4 plausible options and one clearly correct answer.
3. Style and rigor must match real SSC papers (concise stems, single-best-answer, mix of fact + concept + reasoning).
4. Prefer grounding questions in the supplied notes when available. If the notes are sparse or missing, you MAY use your general SSC syllabus knowledge to write high-quality SSC-standard questions on the given topic — never refuse.
5. Difficulty:
   - easy: direct recall, common SSC trivia.
   - medium: application / mild inference / commonly confused facts.
   - hard: tricky distractors, multi-step reasoning, fine SSC-paper detail.
6. Provide a one-line "explanation" for every question (why the answer is correct).
7. Output MUST be a single tool call, no prose.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_quiz",
    description: "Emit the generated quiz",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              type: { type: "string", enum: ["mcq"] },
              options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
              answer: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["question", "type", "options", "answer", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const notes: string = typeof body.notes === "string" ? body.notes : "";
    const topic: string = typeof body.topic === "string" ? body.topic : "General SSC";
    const count = Math.min(Math.max(parseInt(String(body.count ?? 10), 10) || 10, 1), 50);
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const trimmedNotes = notes.slice(0, 60000).trim();
    const hasNotes = trimmedNotes.length > 80;

    const userPrompt = `TOPIC: ${topic}
DIFFICULTY: ${difficulty}
QUESTIONS REQUESTED: ${count}

${hasNotes
  ? `STUDY NOTES (ground questions in these where possible):\n${trimmedNotes}`
  : `STUDY NOTES: (none provided — use your general SSC syllabus knowledge for the topic above to generate high-quality SSC-standard MCQs.)`}

Now produce exactly ${count} ${difficulty}-difficulty SSC-style MCQs via the emit_quiz tool.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_quiz" } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
