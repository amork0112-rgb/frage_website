import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { supabaseService } from "@/lib/supabase/service";

// Helper to get environment variables (assuming it exists or directly use process.env)
function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

// Helper function to convert a file (video) URL to a GenerativePart for Gemini API
async function fileToGenerativePart(videoUrl: string): Promise<{
  inlineData: {
    data: string;
    mimeType: string;
  };
}> {
  // In a real application, you'd fetch the video from a secure URL (e.g., Supabase storage signed URL)
  // For this example, we'll assume a direct fetch from the provided URL is possible and the MIME type is webm.
  const response = await fetch(videoUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Determine mimeType dynamically if possible, or assume webm for now based on previous context
  return {
    inlineData: {
      data: base64,
      mimeType: "video/webm" // Assuming video/webm based on previous context
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assignmentKey, studentId } = body;

    if (!assignmentKey || !studentId) {
      return NextResponse.json({ error: "Missing assignmentKey or studentId" }, { status: 400 });
    }

    const GEMINI_API_KEY = getEnv("GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 1. Fetch student details to get student_name
    const { data: student, error: studentError } = await supabaseService
      .from("students")
      .select("name, english_name")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      console.error("Error fetching student for AI evaluation:", studentError);
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentName = student.english_name || student.name || "Student";

    // 2. Fetch video_path from portal_video_submissions
    const { data: submission, error: submissionError } = await supabaseService
      .from("portal_video_submissions")
      .select("video_path")
      .eq("assignment_key", assignmentKey)
      .single();

    if (submissionError || !submission?.video_path) {
      console.error("Error fetching video submission or path:", submissionError);
      return NextResponse.json({ error: "Video submission not found or video path missing" }, { status: 404 });
    }

    // Generate a signed URL for the video (assuming it's in 'student-videos' bucket)
    const { data: signedUrlData, error: signedUrlError } = await supabaseService.storage
      .from("student-videos")
      .createSignedUrl(submission.video_path, 3600); // URL valid for 1 hour

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error creating signed URL:", signedUrlError);
      return NextResponse.json({ error: "Failed to generate video URL" }, { status: 500 });
    }
    const videoUrl = signedUrlData.signedUrl;

    // Convert video to GenerativePart
    const videoPart = await fileToGenerativePart(videoUrl);

    // 3. Construct the prompt for Gemini API
    const prompt = `
      학생 ${studentName}의 영어 스피치 영상을 분석하고 다음 항목에 대해 상세하게 평가해주세요.
      평가는 시선 처리(Eye Contact), 발음, 유창성, 그리고 하브루타(Havruta)식 참여도를 중점적으로 해주세요.
      모든 피드백 문구(overall_message, strengths, focus_point, next_try_guide, parent_report_message)는 한국어로 작성되어야 합니다.
      특히 학부모 메시지(parent_report_message)는 따뜻하고 격려하는 톤으로 작성해주세요.

      응답은 반드시 다음 JSON 형식으로 해주세요:
      {
        "overall_message": "전반적인 피드백 (한국어)",
        "fluency": (0-100점 숫자),
        "volume": (0-100점 숫자),
        "speed": (0-100점 숫자),
        "pronunciation": (0-100점 숫자),
        "performance": (0-100점 숫자, 하브루타식 참여도 포함),
        "strengths": ["강점1 (한국어)", "강점2 (한국어)", ...],
        "focus_point": "개선점 (한국어)",
        "next_try_guide": "다음 시도 가이드 (한국어)",
        "parent_report_message": "학부모에게 보내는 메시지 (한국어, 따뜻하고 격려하는 톤)",
        "needs_teacher_review": (true/false),
        "ai_confidence": (0-100점 숫자)
      }
    `;

    // 4. Call Gemini API
    const result = await model.generateContentStream(
      {
        contents: [
          {
            role: "user",
            parts: [
              videoPart,
              { text: prompt },
            ],
          },
        ],
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
      { timeout: 60 * 1000 } // timeout in milliseconds
    );

    let geminiResponseText = '';
    for await (const chunk of result.stream) {
        geminiResponseText += chunk.text();
    }

    const parsedGeminiResponse = JSON.parse(geminiResponseText);

    // 5. Calculate average score
    const scoresArray = [
      parsedGeminiResponse.fluency,
      parsedGeminiResponse.volume,
      parsedGeminiResponse.speed,
      parsedGeminiResponse.pronunciation,
      parsedGeminiResponse.performance,
    ];
    const average = (scoresArray.reduce((sum, s) => sum + s, 0) / scoresArray.length).toFixed(1);

    // 6. Prepare data for insertion into ai_video_evaluations
    const insertData = {
      assignment_key: assignmentKey,
      student_id: studentId,
      overall_message: parsedGeminiResponse.overall_message,
      fluency: parsedGeminiResponse.fluency,
      volume: parsedGeminiResponse.volume,
      speed: parsedGeminiResponse.speed,
      pronunciation: parsedGeminiResponse.pronunciation,
      performance: parsedGeminiResponse.performance,
      strengths: parsedGeminiResponse.strengths || [],
      focus_point: parsedGeminiResponse.focus_point,
      next_try_guide: parsedGeminiResponse.next_try_guide,
      parent_report_message: parsedGeminiResponse.parent_report_message,
      average: parseFloat(average),
      pronunciation_flags: parsedGeminiResponse.pronunciation_flags || [], // Assuming Gemini might not always return this
      needs_teacher_review: parsedGeminiResponse.needs_teacher_review || false,
      ai_confidence: parsedGeminiResponse.ai_confidence || 0,
    };

    // 7. Insert or update ai_video_evaluations table
    const { error: upsertError } = await supabaseService
      .from("ai_video_evaluations")
      .upsert(insertData, { onConflict: "assignment_key, student_id" });

    if (upsertError) {
      console.error("Error upserting AI evaluation:", upsertError);
      return NextResponse.json({ error: "Failed to save AI evaluation" }, { status: 500 });
    }

    return NextResponse.json({ success: true, aiEvaluation: insertData });

  } catch (error: any) {
    console.error("AI Evaluation Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
