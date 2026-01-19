import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key", // Fallback for build time if key is missing
});

export async function POST(req: Request) {
  try {
    // 1. Parse Input
    const body = await req.json();
    const {
      student_name,
      level, // Grade/Level
      task_type,
      scores, // { fluency, volume, speed, pronunciation, performance }
      pronunciation_mistakes, // string[]
      mode = "balanced", // gentle | balanced | direct
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is missing");
      return NextResponse.json(mockResponse(student_name, pronunciation_mistakes, mode));
    }

    // Determine Tone based on Mode
    let toneInstruction = "";
    switch (mode) {
      case "gentle":
        toneInstruction = "Tone: Very warm, encouraging, focusing on effort. Suitable for younger students or sensitive parents. Soften any criticism greatly.";
        break;
      case "direct":
        toneInstruction = "Tone: Professional, direct, and growth-oriented. Focus on skill acquisition and clear next steps. Suitable for higher-level students who want results.";
        break;
      case "balanced":
      default:
        toneInstruction = "Tone: Balanced, warm but clear. Celebrate strengths while giving specific, constructive guidance.";
        break;
    }

    // 2. Construct Prompt
    const systemPrompt = `You are an experienced elementary English teacher. You write warm, natural feedback for parents. 
You NEVER mention AI, scores, evaluation systems, or analysis. 
You avoid repeating the same sentence structure. Your feedback sounds human and classroom-based.

**CRITICAL RULES FOR VARIETY (Must Follow):**
- Avoid repeating sentence structures across responses.
- Vary opening sentences (don't always start with "Great job" or "${student_name} did well").
- Do not reuse the same praise or guidance phrasing.
- Write as if each report is read side-by-side with others (they must look different).

Output must be a valid JSON object with the following fields:
- overall_message: 2-3 sentences of teacher-style feedback.
- strengths: Array of 1-2 short phrases highlighting what they did well.
- focus_point: 1 short sentence about what to improve.
- next_try_guide: 1 short sentence for the next attempt.
- parent_report_message: A polite summary for the parent (no AI mention).
`;

    const userPrompt = `Student Information:
- Name: ${student_name}
- Level: ${level || "Elementary"}
- Task: ${task_type || "Speaking Practice"}
- Feedback Mode: ${mode} (${toneInstruction})

Performance Summary (1-5 scale):
- Fluency: ${scores.fluency}/5
- Volume: ${scores.volume}/5
- Speed: ${scores.speed}/5
- Pronunciation: ${scores.pronunciation}/5
- Performance: ${scores.performance}/5

Pronunciation difficulties observed: ${pronunciation_mistakes?.join(", ") || "None"}

Instructions:
1. **Overall Message**: Write 2–3 sentences. Start with strengths naturally.
2. **Mini-Coaching for Pronunciation**: 
   - If mistakes are listed, DO NOT just list them. 
   - Explain the likely reason (e.g., ending sound, vowel length, stress).
   - Give ONE concrete practice tip per word.
   - Limit to maximum 2 words to keep it focused.
   - Example: "Words like 'through' and 'asked' were slightly unclear, especially at the ending sounds. Practicing these words slowly and exaggerating the final consonant will help improve clarity."
3. **Next Step**: End with a clear next-step suggestion.
4. **Variety**: Do not use generic phrases. Be specific to the task and words.

${toneInstruction}`;

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.85, // Slightly higher temperature for more variety
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from AI");
    }

    const result = JSON.parse(content);

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("AI Draft Generation Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to generate draft" },
      { status: 500 }
    );
  }
}

// Fallback mock response if API key is missing
function mockResponse(name: string, mistakes: string[], mode: string) {
  let toneText = "";
  if (mode === "gentle") toneText = "You are doing wonderful!";
  else if (mode === "direct") toneText = "Let's focus on precision.";
  else toneText = "Keep up the great work!";

  const mistakeText = mistakes && mistakes.length > 0 
    ? `I noticed a small challenge with "${mistakes[0]}". Try stretching the vowel sound a bit longer.`
    : "Your pronunciation was quite clear today.";

  return {
    ok: true,
    data: {
      overall_message: `${name}, your reading had great energy today! ${mistakeText} ${toneText}`,
      strengths: ["Confident voice", "Good flow"],
      focus_point: mistakes && mistakes.length > 0 ? `Practice the "${mistakes[0]}" sound by exaggerating it.` : "Focus on pausing at periods.",
      next_try_guide: "Try reading slightly slower to catch every sound.",
      parent_report_message: `${name} showed great enthusiasm. We are working on refining specific pronunciation points like "${mistakes?.[0] || 'th-sound'}" to improve clarity.`
    }
  };
}
