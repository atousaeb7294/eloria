import OpenAI from "openai";
import { eloriaMythPrompt } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateProductMyth(product: {
  name: string;
  description?: string;
  material?: string;
  category?: string;
}) {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",

    messages: [
      {
        role: "system",
        content: eloriaMythPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(product),
      },
    ],

    response_format: {
      type: "json_object",
    },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
