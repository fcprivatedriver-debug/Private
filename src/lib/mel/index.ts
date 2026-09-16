/** Barrel server-only da MEL — não importar em client components. */
export { MEL_CONFIG, resolveMelModel, isOpenAiConfigured, resolveMelMonthlyLimit } from "./config";
export { getOpenAI } from "./openai";
export { runMelConversation } from "./orchestrator";
export { MEL_TOOL_DEFINITIONS, executeMelTool, type MelAuthContext } from "./tools";
export { checkMelRateLimit, logMelUsage, estimateCostMicros } from "./usage";
