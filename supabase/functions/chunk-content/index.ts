// Edge function: organize pasted ChatGPT/syllabus text into a hierarchical chunk tree.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert SSC exam study organizer. The user pastes a long ChatGPT conversation, syllabus dump, or raw notes. Your job is to ORGANIZE and RE-FORMAT — NOT to summarize, condense, or trim.

ABSOLUTE CONTENT-PRESERVATION RULES (most important):
- Keep ~95% of the original text. If the user gives 100 lines, ~95 lines must still be present in the output (across "notes" fields). You are a FORMATTER, not a summarizer.
- The ONLY things you may drop: greetings ("sure!", "here you go"), pure conversational filler, exact duplicate sentences, and the literal quiz/MCQ Q&A blocks (those move to the quiz array — see below). NOTHING else.
- DO NOT shorten facts, examples, dates, names, lists, tables, formulas, explanations, definitions, side notes, or "extra" context. If in doubt, KEEP IT.
- DO NOT replace sentences with shorter paraphrases. Use the user's wording verbatim where possible; you may only re-flow it into markdown.
- NEVER invent facts that are not in the source.

FORMATTING RULES (this is what you actually do):
- Convert plain text into clean, scannable markdown using #, ##, ### headings, bullet points, numbered lists, **bold**, tables, and blank-line spacing.
- Example: a line like "Basic Map Orientation of India" should become a heading like "### Basic Map Orientation of India" — not deleted, not rewritten.
- Preserve original ordering of content within each chunk.
- The "notes" field for each leaf chunk = the FULL re-formatted study content for that section (essentially all of the raw text that belongs there, just prettier).
- The "summary" field = 2–4 short lines. This is the ONLY place compression is allowed.
- "keyPoints" (3–8) and "terms" (term + meaning) are ADDITIVE — they do not replace the notes.

STRUCTURE RULES:
- Detect Subjects (History, Geography, Polity, Economy, Science, etc.). If everything clearly belongs to one subject, return a single subject.
- Under each subject, detect Chapters / Eras / Sections. Use "children" for deeper sub-topics when the source has a clear hierarchy.
- Split into chunks based on the source's own topic boundaries — do not merge unrelated topics, do not over-split a single topic.

QUIZ RULES (very important — quiz Qs must be MOVED, not duplicated):
- Scan the source for any quiz / MCQ / Q&A / "Question:" / "Q1." style blocks.
- REMOVE every such question from the "notes" field and PUT it into that chunk's "quiz" array. The notes must NOT still contain the raw quiz text after extraction — quiz content lives ONLY in the quiz section.
- All extracted questions MUST be type "mcq" with exactly 4 options. If the source gave options, use them. If only an answer was given, fabricate 3 plausible distractors plus the correct answer.
- NEVER drop a question the user wrote.
- After extracting, you MAY add 2–4 additional MCQs per leaf chunk to round it out. Same format (mcq, 4 options, answer, one-line explanation).

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