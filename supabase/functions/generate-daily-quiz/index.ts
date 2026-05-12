import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.2";

interface QuizQuestion {
  question: string;
  type: "mcq";
  options: string[];
  answer: string;
  explanation: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SYSTEM_PROMPT = `You are an SSC exam quiz generator. Generate MCQ questions strictly grounded in provided study notes.

Rules:
- All questions MUST be type "mcq" with exactly 4 options.
- Mix conceptual + factual questions appropriate for SSC exams.
- Difficulty levels:
  - easy: direct recall from notes.
  - medium: requires understanding / mild inference.
  - hard: tricky distractors, multi-step reasoning, fine details.
- Always include explanation (one-liner).
- Never invent facts not in notes.
- Output MUST be tool call format.`;

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
              options: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 4,
              },
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

async function generateQuizFromNotes(
  notes: string,
  difficulty: string,
  count: number
): Promise<QuizQuestion[] | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Generate exactly ${count} MCQ questions at ${difficulty} difficulty from the notes below.\n\nNOTES:\n${notes.slice(0, 60000)}`;

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
      console.error(`AI gateway error: ${resp.status}`, errText);
      return null;
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("AI did not return structured output");
      return null;
    }
    const args = JSON.parse(toolCall.function.arguments);
    return args.questions;
  } catch (e) {
    console.error("Error generating quiz from notes:", e);
    return null;
  }
}

async function generateDailyQuizzes() {
  try {
    console.log("[Daily Quiz] Starting daily quiz generation...");

    // Get all users with daily quiz enabled
    const { data: configs, error: configError } = await supabase
      .from("daily_quiz_config")
      .select("user_id, difficulty, num_questions, include_pyq")
      .eq("enabled", true);

    if (configError) throw configError;
    if (!configs || configs.length === 0) {
      console.log("[Daily Quiz] No users with daily quiz enabled");
      return;
    }

    console.log(`[Daily Quiz] Found ${configs.length} users with daily quiz enabled`);

    const today = new Date().toISOString().split("T")[0];
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const config of configs) {
      try {
        // Get all subjects for this user
        const { data: subjects, error: subjectsError } = await supabase
          .from("subjects")
          .select("id, name")
          .eq("user_id", config.user_id);

        if (subjectsError) throw subjectsError;
        if (!subjects || subjects.length === 0) {
          console.log(`[Daily Quiz] User ${config.user_id} has no subjects`);
          continue;
        }

        console.log(
          `[Daily Quiz] User ${config.user_id} has ${subjects.length} subjects`
        );

        for (const subject of subjects) {
          try {
            // Check if quiz already exists for today
            const { data: existingQuiz } = await supabase
              .from("daily_quizzes")
              .select("id")
              .eq("user_id", config.user_id)
              .eq("subject_id", subject.id)
              .eq("quiz_date", today)
              .single();

            if (existingQuiz) {
              console.log(
                `[Daily Quiz] Quiz already exists for user ${config.user_id}, subject ${subject.name}`
              );
              continue;
            }

            // Get all chunks for this subject with notes
            const { data: chunks, error: chunksError } = await supabase
              .from("chunks")
              .select("title, notes, summary")
              .eq("subject_id", subject.id)
              .not("notes", "is", null);

            if (chunksError) throw chunksError;

            if (!chunks || chunks.length === 0) {
              console.log(
                `[Daily Quiz] No study notes found for subject ${subject.name}`
              );
              continue;
            }

            // Combine all notes from chunks
            const combinedNotes = chunks
              .map((c: any) => `[${c.title}]\n${c.notes}`)
              .join("\n\n");

            // Generate quiz questions
            const questions = await generateQuizFromNotes(
              combinedNotes,
              config.difficulty,
              config.num_questions
            );

            if (!questions || questions.length === 0) {
              console.log(
                `[Daily Quiz] Failed to generate questions for ${subject.name}`
              );
              totalFailed++;
              continue;
            }

            // Store quiz in database
            const { error: insertError } = await supabase
              .from("daily_quizzes")
              .insert({
                user_id: config.user_id,
                subject_id: subject.id,
                quiz_date: today,
                questions: questions,
                total_questions: questions.length,
                difficulty: config.difficulty,
                source: "ai",
              });

            if (insertError) throw insertError;

            console.log(
              `[Daily Quiz] Generated ${questions.length} questions for ${subject.name}`
            );
            totalGenerated++;
          } catch (e) {
            console.error(
              `[Daily Quiz] Error generating quiz for subject ${subject.name}:`,
              e
            );
            totalFailed++;
          }
        }
      } catch (e) {
        console.error(`[Daily Quiz] Error processing user ${config.user_id}:`, e);
      }
    }

    console.log(
      `[Daily Quiz] Completed. Generated: ${totalGenerated}, Failed: ${totalFailed}`
    );
  } catch (e) {
    console.error("[Daily Quiz] Critical error:", e);
    throw e;
  }
}

// Main invocation
Deno.serve(async () => {
  await generateDailyQuizzes();
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
