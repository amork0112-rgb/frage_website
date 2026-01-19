
export type AIEvaluation = {
  scores: {
    fluency: number;
    volume: number;
    speed: number;
    pronunciation: number;
    performance: number;
  };
  average: number;
  pronunciation_flags: { word: string; time: number }[];
  teacher_feedback_draft: {
    overall_message: string;
    strengths: string[];
    focus_point: string;
    next_try_guide: string;
  };
  parent_report_message: string;
  needs_teacher_review: boolean;
  ai_confidence: number;
};

// Mock function to simulate AI grading
export function mockAIGrading(studentName: string, videoUrl: string): AIEvaluation {
  // Deterministic random based on name length for demo consistency
  const seed = studentName.length; 
  const rand = (offset: number) => ((seed + offset) * 9301 + 49297) % 233280 / 233280;

  const score = (offset: number) => Math.floor(rand(offset) * 3) + 2; // 2 to 4 mostly, sometimes 5
  
  const scores = {
    fluency: score(1),
    volume: score(2),
    speed: score(3),
    pronunciation: score(4),
    performance: score(5),
  };
  
  // Boost one to 5 if possible
  if (rand(6) > 0.5) scores.performance = 5;

  const average = Math.round(((scores.fluency + scores.volume + scores.speed + scores.pronunciation + scores.performance) / 5) * 10) / 10;

  const flags = [
    { word: "specific", time: 12 },
    { word: "world", time: 24 },
    { word: "thoroughly", time: 45 },
  ];

  // Logic to generate feedback based on scores
  const draft = generateFeedbackDraft(scores, studentName);

  const parentReport = `이번 영상 과제에서 ${studentName} 학생은 문장을 읽는 속도가 안정적이며, 단어의 끝맺음이 명확해지고 있습니다. 다음 과제에서는 조금 더 자신감 있는 목소리로 표현력을 더한다면 더욱 훌륭한 결과물이 기대됩니다.`;

  return {
    scores,
    average,
    pronunciation_flags: flags,
    teacher_feedback_draft: draft,
    parent_report_message: parentReport,
    needs_teacher_review: average < 3.5, // Flag if score is low
    ai_confidence: 0.85 + (rand(7) * 0.1), // 0.85 - 0.95
  };
}

export function generateFeedbackDraft(scores: AIEvaluation['scores'], studentName: string) {
  const strengths = [];
  if (scores.fluency >= 3) strengths.push("Steady pace");
  if (scores.pronunciation >= 3) strengths.push("Clear pronunciation");
  if (scores.performance >= 3) strengths.push("Expressive intonation");
  
  return {
    overall_message: `${studentName} showed good effort. ${scores.fluency >= 3 ? "Reading flow was steady." : "Practice reading smoothly."}`,
    strengths: strengths.slice(0, 2),
    focus_point: scores.pronunciation < 3 ? "Focus on ending sounds." : "Focus on character voices.",
    next_try_guide: "Read aloud 3 times before recording.",
  };
}
