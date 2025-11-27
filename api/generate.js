import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt, mode } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server API Key missing" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-09-2025",
        generationConfig: { responseMimeType: "application/json" } 
    });

    const instructions = {
      professional: "Tone: Professional, polished, inspiring, and concise.",
      funny: "Tone: Witty, humorous, maybe a pun. Make the user smile.",
      unhinge: "Tone: CHAOTIC, GEN Z SLANG, lowercase, wild emojis."
    };

    const selectedInstruction = instructions[mode] || instructions.funny;

    const systemPrompt = `
      You are a viral social media manager for Farcaster (Warpcast).
      Task: Rewrite the user's idea into a perfect post.
      Rules: ${selectedInstruction}
      
      CRITICAL: You must output valid JSON.
      Output format: { "caption": "your generated text", "image_prompts": ["prompt 1", "prompt 2", "prompt 3"] }
    `;

    const result = await model.generateContent(`${systemPrompt}\n\nUser Idea: ${prompt}`);
    const text = result.response.text();
    const parsedData = JSON.parse(text);

    const images = parsedData.image_prompts.map((p) => {
      const encoded = encodeURIComponent(p + ", photorealistic, 8k, cinematic lighting");
      const seed = Math.floor(Math.random() * 99999);
      return `https://pollinations.ai/p/${encoded}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux`;
    });

    return new Response(JSON.stringify({ 
      caption: parsedData.caption, 
      images, 
      image_prompts: parsedData.image_prompts 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate content" }), { status: 500 });
  }
}