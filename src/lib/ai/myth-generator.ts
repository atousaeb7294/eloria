import OpenAI from "openai";

import { generateProductMyth as generateTemplateMyth, type ProductMythOutput } from "@/lib/product-myth-generator";
import { eloriaMythPrompt } from "./prompts";

type MythInput = {
  nameFa: string;
  nameEn: string;
  material?: string;
};

function provider(): "template" | "ollama" | "openai" {
  const value = process.env.ELORIA_AI_PROVIDER?.trim().toLowerCase();
  if (value === "ollama") return "ollama";
  if (value === "openai") return "openai";
  return "template";
}

function isMythOutput(value: unknown): value is ProductMythOutput {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return ["mythNameFa", "mythNameEn", "legendFa", "legendEn"].every(
    (key) => typeof item[key] === "string" && (item[key] as string).trim().length > 0,
  );
}

export async function generateProductMyth(input: MythInput): Promise<ProductMythOutput> {
  const fallback = generateTemplateMyth(input);
  const selectedProvider = provider();
  if (selectedProvider === "template") return fallback;

  if (selectedProvider === "ollama") {
    try {
      const base = (process.env.ELORIA_OLLAMA_URL?.trim() || "http://127.0.0.1:11434").replace(/\/$/, "");
      const response = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.ELORIA_OLLAMA_MODEL?.trim() || "qwen2.5:3b",
          prompt: `${eloriaMythPrompt}\nINPUT:\n${JSON.stringify(input)}`,
          format: "json",
          stream: false,
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return fallback;
      const body = (await response.json()) as { response?: unknown };
      const raw = typeof body.response === "string" ? body.response : "{}";
      const parsed: unknown = JSON.parse(raw);
      return isMythOutput(parsed) ? parsed : fallback;
    } catch (error) {
      console.error("[Eloria Myth] optional Ollama provider failed; using local template.", error);
      return fallback;
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallback;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: process.env.ELORIA_OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: eloriaMythPrompt },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    const parsed: unknown = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return isMythOutput(parsed) ? parsed : fallback;
  } catch (error) {
    console.error("[Eloria Myth] optional OpenAI provider failed; using local template.", error);
    return fallback;
  }
}
