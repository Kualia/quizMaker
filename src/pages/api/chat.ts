import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL,
    'X-Title': process.env.SITE_NAME,
  },
});

const SYSTEM_PROMPT = `
You are an exam analysis assistant. Your task is to extract multiple-choice questions from a provided text, preserving their **full context, original wording, and any emojis or special characters**, and structure them in a JSON format.

📌 **Instructions:**
- Identify **questions** and their corresponding **answer choices** from the text.
- Extract the **entire question as it is written**, including any **emojis, special characters, and formatting**.
- **Preserve the original sentence structure, emojis, and context.** Do not replace text or remove emojis.
- **Identify the correct answer** and include its index in \`correct_answer_index\`.
- If the correct answer is **not explicitly stated**, use logical reasoning to infer the most probable correct answer.
- **Strictly follow the output format below. Do not include extra explanations.**

📌 **Expected Output Format (Follow This Exactly!):**
\`\`\`json
{
  "questions": [
    {
      "question": "Imagine a village… But instead of cars, people are cycling through scenic paths, strolling across charming wooden bridges, and gliding through the canals in boats. 🚤\n\nThis village is so serene that the only sounds you hear are birds chirping, the gentle flow of water, and the soft hum of bicycle wheels! 🌿\n\nSo, can you guess where you are?",
      "answers": ["Netherlands", "Belgium", "Switzerland", "Germany"],
      "correct_answer_index": 0
    }
  ]
}
\`\`\`

📌 **Rules:**
- **Do not modify or shorten the question. Keep the full sentence intact, including all emojis and special formatting.**
- **Maintain the original structure, punctuation, and symbols exactly as they appear.**
- **Ensure the answers are fully listed.**
- **The correct answer index must be a number corresponding to the correct answer in the provided options.**
- **Do not provide explanations. Return only the JSON output.**

Now, process the given text and return the questions in the specified JSON format.
`;

const Question = z.object({
  question: z.string(),
  answers: z.array(z.string()),
  correct_answer_index: z.number(),
});

const QuestionReasoning = z.object({
  questions: z.array(Question),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const { model = 'openai/gpt-4o-mini' } = req.body;
    
    
    const completion = await openai.beta.chat.completions.parse({
      model,
      // temperature: 0.2,

      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],

      response_format: zodResponseFormat(QuestionReasoning, 'question_reasoning'),
    });

    res.status(200).json(completion.choices[0].message);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 