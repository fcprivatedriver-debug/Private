import OpenAI from "openai";
import { isOpenAiConfigured } from "./config";

let client: OpenAI | null = null;

/** Cliente OpenAI só no servidor. Nunca importar no client bundle. */
export function getOpenAI(): OpenAI | null {
  if (!isOpenAiConfigured()) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 25_000,
      maxRetries: 1,
    });
  }
  return client;
}
