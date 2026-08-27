import { generateProductMyth as generateTemplateMyth, type ProductMythOutput } from "@/lib/product-myth-generator";
import { eloriaMythPrompt } from "./prompts";

type MythInput = { nameFa: string; nameEn: string; material?: string };

function provider(): "template" | "ollama" {
  const value = process.env.ELORIA_AI_PROVIDER?.trim().toLowerCase();
  return value === "ollama" ? "ollama" : "template";
}

function isMythOutput(value: unknown): value is ProductMythOutput {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return ["mythNameFa", "mythNameEn", "legendFa", "legendEn"].every((key) => typeof item[key] === "string" && (item[key] as string).trim().length > 0);
}

export async function generateProductMyth(input: MythInput): Promise<ProductMythOutput> {
  const fallback = generateTemplateMyth(input);
  if (provider() !== "ollama") return fallback;
  try {
    const rawBase = process.env.ELORIA_OLLAMA_URL?.trim() || "http://127.0.0.1:11434";
    const base = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
    const response = await fetch(`${base}/api/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.ELORIA_OLLAMA_MODEL?.trim() || "qwen2.5:3b", prompt: `${eloriaMythPrompt}\nINPUT:\n${JSON.stringify(input)}`, format: "json", stream: false }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return fallback;
    const body = (await response.json()) as { response?: unknown };
    const raw = typeof body.response === "string" ? body.response : "{}";
    const parsed: unknown = JSON.parse(raw);
    return isMythOutput(parsed) ? parsed : fallback;
  } catch (error) {
    console.error("[Eloria Myth] optional local Ollama provider failed; using local template.", error);
    return fallback;
  }
}
