const API_KEY = process.env.GEMINI_API_KEY;

// Use ENV variable, fallback to 1.5-flash if missing
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash"; 

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

async function callGemini(parts: any[]) {
  if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");
  
  console.log(`Calling AI Model: ${MODEL_NAME} with ${parts.length} parts...`);

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { 
        response_mime_type: "application/json",
        max_output_tokens: 8192, // Maximize output length
        temperature: 0.7 
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini API Error:", err);
    throw new Error(`Gemini Error (${response.status}): Check your API Key or Model Name in .env`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from AI");
  return text;
}


export async function generateQuiz(
  rawMaterials: any[], 
  counts: { mc: number, short: number, long: number },
  blueprintMaterials: any[] = [] // NEW PARAM
) {
  const total = counts.mc + counts.short + counts.long;
  const parts: any[] = [];
  
  // 1. System Instruction
  let instruction = `You are a professional exam creator. Return valid JSON only.
    Structure: { "title": "string", "questions": [ { "id": "1", "type": "MC|Short|Long", "question": "...", "options": ["A","B"] (if MC), "modelAnswer": "key points" } ] }
    Requirements: ${counts.mc} MC, ${counts.short} Short, ${counts.long} Long. Total ${total} questions.
    
    INSTRUCTIONS:
    1. Use the [CONTENT MATERIALS] as the source of knowledge/facts.
    2. Use the [BLUEPRINT/STYLE MATERIALS] (if present) to determine the difficulty, question style, phrasing, and format.
    If Blueprint contains "hard" questions, generate hard questions from the Content.
  `;

  parts.push({ text: instruction });

  // 2. Add Blueprint Materials (if any)
  if (blueprintMaterials && blueprintMaterials.length > 0) {
      parts.push({ text: "\n--- [BLUEPRINT/STYLE MATERIALS START] ---\n(Use this for Style/Format only)" });
      for (const mat of blueprintMaterials) {
        if (mat.type === 'text' || mat.type === 'url_content') {
            parts.push({ text: mat.content.substring(0, 10000) });
        } else if (mat.type === 'image' || mat.type === 'pdf') {
            const base64Data = mat.content.split(',')[1];
            const mimeType = mat.content.split(';')[0].split(':')[1];
            parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        }
      }
      parts.push({ text: "\n--- [BLUEPRINT/STYLE MATERIALS END] ---\n" });
  }

  // 3. Add Content Materials
  parts.push({ text: "\n--- [CONTENT MATERIALS START] ---\n(Use this for Facts/Knowledge)" });
  for (const mat of rawMaterials) {
    if (mat.type === 'text' || mat.type === 'url_content') {
        parts.push({ text: mat.content.substring(0, 30000) });
    } else if (mat.type === 'image' || mat.type === 'pdf') {
        const base64Data = mat.content.split(',')[1];
        const mimeType = mat.content.split(';')[0].split(':')[1];
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
    }
  }
  parts.push({ text: "\n--- [CONTENT MATERIALS END] ---\n" });

  try {
    const rawText = await callGemini(parts);
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    // VALIDATION: Ensure we actually got questions
    if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error("AI returned 0 questions. The content might be too complex or too long. Try reducing the material.");
    }

    return result;

  } catch (e) {
    console.error("Quiz Gen Failed:", e);
    throw e;
  }
}
export async function gradeSubmission(question: string, answer: string, context: string, mode: 'strict' | 'open', modelAnswer?: string) {
  const prompt = `
    You are a strict automated grader.
    Task: Grade the student answer (0-10) and provide brief feedback.
    
    Context Info: "${context.substring(0, 8000)}"
    Question: "${question}"
    Teacher's Key (If provided, strictly follow this): "${modelAnswer}"
    Student Answer: "${answer}"
    Grading Mode: ${mode}
    
    CRITICAL OUTPUT RULES:
    1. Return JSON ONLY.
    2. "score" MUST be a raw integer between 0 and 10. Do NOT write "10/10" or "10 points". Just "10".
    3. JSON Format: { "score": 10, "feedback": "Excellent answer." }
  `;

  try {
    const rawText = await callGemini([{ text: prompt }]);
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(jsonStr);
    
    // --- SMART SCORE CLEANER ---
    // Fixes issues where AI returns "10/10" or "10 (Perfect)"
    let cleanScore = result.score;
    
    if (typeof cleanScore === 'string') {
        // Remove "/10" or non-numeric chars except dots
        cleanScore = cleanScore.split('/')[0].replace(/[^0-9.]/g, '');
        cleanScore = Number(cleanScore);
    }
    
    // Final Safety Checks
    if (isNaN(cleanScore)) cleanScore = 0;
    if (cleanScore > 10) cleanScore = 10;
    if (cleanScore < 0) cleanScore = 0;
    
    return { score: cleanScore, feedback: result.feedback };

  } catch (e) {
    console.error("Grading Parse Error:", e);
    // Return 0 if AI completely fails, but log it
    return { score: 0, feedback: "AI Error: Could not parse grade." };
  }
}


// --- BULK GRADING ---
export async function gradeWholeBatch(
  materialsContext: string, 
  questions: any[], 
  submissions: any[], 
  config: any
) {
  // Construct a highly structured prompt for bulk processing
  const prompt = {
    role: "grader",
    instruction: `You are a high-speed bulk grading engine. 
    1. Read the Context and the Question Answer Key.
    2. Grade EVERY student submission in the list.
    3. Return a JSON object mapped by Submission ID.
    4. Feedback must be concise (1-2 sentences).`,
    gradingMode: config.gradingMode || 'strict',
    context: materialsContext.substring(0, 20000), // Truncate context to save space
    questions: questions.map((q: any) => ({
      id: q.id,
      text: q.question,
      modelAnswer: q.modelAnswer || "N/A",
      type: q.type
    })),
    studentSubmissions: submissions.map((sub: any) => ({
      submissionId: sub._id,
      answers: sub.answers
    }))
  };

  const finalPrompt = `
    ${JSON.stringify(prompt, null, 2)}
    
    -----------------------------------
    OUTPUT REQUIREMENT:
    Return valid JSON ONLY. No markdown.
    Structure:
    {
      "submission_id_1": {
        "question_id_1": { "score": 10, "feedback": "Good job" },
        "question_id_2": { "score": 5, "feedback": "Missing key details" }
      },
      "submission_id_2": ...
    }
    Rules: 
    - Score must be 0-10 (integer).
    - If answer is missing, score 0.
  `;

  console.log(`[Gemini] Sending Bulk Batch: ${submissions.length} students...`);

  try {
    const rawText = await callGemini([{ text: finalPrompt }]);
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Batch Gemini Failed:", e);
    throw new Error("AI failed to process batch. Try grading individually.");
  }
}
