// Edge function: organize pasted ChatGPT/syllabus text into a hierarchical chunk tree.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert SSC exam study organizer. The user pastes a long ChatGPT conversation, syllabus dump, or raw notes. Your job is to ORGANIZE — not to summarize or trim.

CRITICAL CONTENT-PRESERVATION RULES:
- Preserve 90–95% of the original raw content verbatim inside each chunk's "notes" field. Only remove things like greetings, "sure here is...", duplicate sentences, or pure conversational filler. Do NOT shorten facts, examples, dates, lists, tables, formulas or explanations.
- The "notes" field should be the FULL raw study content for that chunk, formatted in clean markdown (preserve headings, bullets, tables, bold). Treat yourself as a re-formatter, not a summarizer.
- The "summary" should be 2–4 lines only (this is the only place you compress).
- Never invent facts that are not in the source.

STRUCTURE RULES:
- Detect Subjects (e.g. History, Geography, Polity, Economy, Science). If the source clearly belongs to a single subject, return one subject.
- Under each subject, detect Chapters / Eras / Sections (Ancient, Medieval, Modern, etc.). Under chapters you may have sub-topics as "children".
- For every leaf chunk produce: short summary, FULL markdown notes (per the rule above), 3–8 key points, important terms (term + meaning).

QUIZ RULES (very important):
- If the source text already contains quiz / MCQ / question-answer pairs, you MUST extract ALL of them and put them into that chunk's "quiz" array as type "mcq". If options are present in the source, use them; if only an answer is given, fabricate 3 plausible distractors plus the correct answer (4 options total). NEVER drop a question that the user wrote.
- After extracting all source-provided questions, you MAY add 2–4 additional MCQ questions per leaf chunk to round things out. ALL generated questions must be type "mcq" with exactly 4 options.
- Always include the correct "answer" string and a one-line "explanation" when possible.

OUTPUT: a single tool call.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_study_tree",
    description: "Emit the organized study tree.",
    parameters: {
      type: "object",
      properties: {
        subjects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              chunks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    notes: { type: "string", description: "Detailed markdown notes" },
                    keyPoints: { type: "array", items: { type: "string" } },
                    terms: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          term: { type: "string" },
                          meaning: { type: "string" },
                        },
                        required: ["term", "meaning"],
                        additionalProperties: false,
                      },
                    },
                    children: {
                      type: "array",
                      description: "Optional sub-chunks for deeper hierarchy",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          summary: { type: "string" },
                          notes: { type: "string" },
                          keyPoints: { type: "array", items: { type: "string" } },
                          terms: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                term: { type: "string" },
                                meaning: { type: "string" },
                              },
                              required: ["term", "meaning"],
                              additionalProperties: false,
                            },
                          },
                          quiz: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                question: { type: "string" },
                                type: { type: "string", enum: ["mcq", "true_false", "one_line"] },
                                options: { type: "array", items: { type: "string" } },
                                answer: { type: "string" },
                                explanation: { type: "string" },
                              },
                              required: ["question", "type", "answer"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["title", "summary", "notes", "keyPoints", "terms", "quiz"],
                        additionalProperties: false,
                      },
                    },
                    quiz: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          type: { type: "string", enum: ["mcq", "true_false", "one_line"] },
                          options: { type: "array", items: { type: "string" } },
                          answer: { type: "string" },
                          explanation: { type: "string" },
                        },
                        required: ["question", "type", "answer"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "summary", "notes", "keyPoints", "terms", "quiz", "children"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "description", "chunks"],
            additionalProperties: false,
          },
        },
      },
      required: ["subjects"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content (string) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          { role: "user", content },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_study_tree" } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chunk-content error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});