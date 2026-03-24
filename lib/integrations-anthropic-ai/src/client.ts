import Anthropic from "@anthropic-ai/sdk";

const directApiKey = process.env.ANTHROPIC_API_KEY;
const integrationApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

if (!directApiKey && (!integrationApiKey || !integrationBaseUrl)) {
  throw new Error(
    "Either ANTHROPIC_API_KEY or both AI_INTEGRATIONS_ANTHROPIC_API_KEY and AI_INTEGRATIONS_ANTHROPIC_BASE_URL must be set.",
  );
}

export const anthropic = directApiKey
  ? new Anthropic({ apiKey: directApiKey })
  : new Anthropic({
      apiKey: integrationApiKey!,
      baseURL: integrationBaseUrl!,
    });
