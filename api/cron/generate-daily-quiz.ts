// Vercel Cron API Route for Daily Quiz Generation
// Place this file in: src/pages/api/cron/generate-daily-quiz.ts (or .js)

import type { VercelRequest, VercelResponse } from "@vercel/node";

// This will be called by Vercel's cron service
// Scheduled at: 30 6 * * * (06:30 UTC = 12:00 PM IST)

export const config = {
  maxDuration: 300, // 5 minutes timeout
};

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Verify this is a cron request from Vercel
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    console.log("[CRON] Starting daily quiz generation...");

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-daily-quiz`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[CRON] Error calling edge function:", data);
      return res
        .status(response.status)
        .json({ success: false, error: data.error });
    }

    console.log("[CRON] Daily quiz generation completed:", data);

    return res.status(200).json({
      success: true,
      message: "Daily quizzes generated successfully",
      data,
    });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
