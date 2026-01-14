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
      generationConfig: { response_mime_type: "application/json" }
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

export async function generateQuiz(rawMaterials: any[], counts: { mc: number, short: number, long: number }) {
  const total = counts.mc + counts.short + counts.long;
  const parts: any[] = [];
  
  // System Instruction
  parts.push({
    text: `You are a quiz generator. Return valid JSON only.
    Structure: { "title": "string", "questions": [ { "id": "1", "type": "MC|Short|Long", "question": "...", "options": ["A","B"] (if MC), "modelAnswer": "key points" } ] }
    Requirements: ${counts.mc} MC, ${counts.short} Short, ${counts.long} Long. Total ${total} questions.
    Analyze the provided text, images, and documents (PDFs) to generate questions.
    If multiple files are provided, combine knowledge from all of them.`
  });

  // Add all files/resources to the prompt payload
  for (const mat of rawMaterials) {
    if (mat.type === 'text' || mat.type === 'url_content') {
        parts.push({ text: mat.content.substring(0, 30000) });
    } 
    else if (mat.type === 'image' || mat.type === 'pdf') {
        const base64Data = mat.content.split(',')[1];
        const mimeType = mat.content.split(';')[0].split(':')[1];
        
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: base64Data
            }
        });
    }
  }

  try {
    const rawText = await callGemini(parts);
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Quiz Gen Failed:", e);
    throw e;
  }
}

export async function gradeSubmission(question: string, answer: string, context: string, mode: 'strict' | 'open', modelAnswer?: string) {
  const prompt = `
    Grade answer (0-10) + feedback JSON.
    Q: "${question}"
    Ans: "${answer}"
    Key: "${modelAnswer}"
    Context: "${context.substring(0, 5000)}"
    Mode: ${mode}
  `;

  try {
    const rawText = await callGemini([{ text: prompt }]);
    const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return { score: 0, feedback: "Error grading." };
  }
}