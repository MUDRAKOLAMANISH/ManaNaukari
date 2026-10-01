import { GoogleGenAI } from '@google/genai';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON request body.' }),
      };
    }

    const { message, history, retrievedContext } = body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message query is required.' }),
      };
    }

    const apiKey =
      body.apiKeyOverride ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          answer: 'I could not find this information in the Mana Naukari Knowledge Base.',
          citations: [],
          matched: false,
          note: 'GEMINI_API_KEY not configured in Netlify environment variables.',
        }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the official Mana Naukari AI Assistant.
CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY answer based strictly and exclusively on the retrieved context provided from the Mana Naukari Knowledge Base documents.
2. If the answer cannot be found in the provided context, respond with:
"I could not find this information in the Mana Naukari Knowledge Base."
3. Do NOT make up, assume, or hallucinate facts, job openings, or company policies outside the provided text.
4. Keep answers friendly, professional, clear, and well-formatted with markdown bullet points if helpful.`;

    const prompt = `Retrieved Context from Mana Naukari Knowledge Base:
${retrievedContext || 'No context retrieved.'}

User Question: ${message}`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });

        const answerText = response.text?.trim();
        if (answerText) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: true,
              answer: answerText,
              citations: [],
              matched: true,
            }),
          };
        }
      } catch (err: any) {
        console.warn(`[Netlify Function knowledge-chat] Model ${model} failed:`, err?.message);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        answer: 'I could not find this information in the Mana Naukari Knowledge Base.',
        citations: [],
        matched: false,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Function knowledge-chat] Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
      }),
    };
  }
};
