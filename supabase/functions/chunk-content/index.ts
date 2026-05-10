// Edge function: organize pasted ChatGPT/syllabus text into a hierarchical chunk tree.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert SSC exam study planner. The user pastes a long ChatGPT conversation or syllabus dump. Reorganize it into a clean hierarchical study tree.

Rules:
- Detect Subjects (e.g. History, Geography, Polity, Economy, Science).
- Under each subject, detect Chapters / Eras / Sections (e.g. Ancient, Medieval, Modern).
- Under each chapter you may have Topics.
- For every leaf chunk produce: a short summary, well-formatted markdown notes, 3-6 key points, important terms (term + meaning), and 3-5 quiz questions (mix of mcq, true_false, one_line).
- Preserve all factual content from the source. Do not invent facts that aren't supported.
- Markdown notes should use headings, bullet lists, bold for keywords.
- Output MUST be a single tool call.`;

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