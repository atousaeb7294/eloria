import OpenAI from "openai";

import { eloriaMythPrompt } from "./prompts";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Please configure it before generating legends.",
    );
  }

  return new OpenAI({
    apiKey,
  });
}

export async function generateProductMyth(input: {
  nameFa: string;
  nameEn: string;
  material?: string;
}) {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.8,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: eloriaMythPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  return JSON.parse(
    response.choices[0]?.message?.content ?? "{}",
  );
}