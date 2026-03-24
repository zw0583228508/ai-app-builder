/**
 * Integrations Domain
 *
 * Types and validation for external integration connections.
 */

export type IntegrationType =
  | "netlify"
  | "vercel"
  | "github"
  | "stripe"
  | "supabase"
  | "firebase"
  | "resend"
  | "sendgrid"
  | "twilio"
  | "openai";

export interface IntegrationConfig {
  type: IntegrationType;
  label: string;
  tokenPrefix?: string;
  requiredScopes?: string[];
  validationUrl?: string;
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  netlify: {
    type: "netlify",
    label: "Netlify",
    tokenPrefix: "nfp_",
    validationUrl: "https://api.netlify.com/api/v1/user",
  },
  vercel: {
    type: "vercel",
    label: "Vercel",
    validationUrl: "https://api.vercel.com/v2/user",
  },
  github: {
    type: "github",
    label: "GitHub",
    tokenPrefix: "ghp_",
    validationUrl: "https://api.github.com/user",
  },
  stripe: { type: "stripe", label: "Stripe", tokenPrefix: "sk_" },
  supabase: { type: "supabase", label: "Supabase" },
  firebase: { type: "firebase", label: "Firebase" },
  resend: { type: "resend", label: "Resend", tokenPrefix: "re_" },
  sendgrid: { type: "sendgrid", label: "SendGrid", tokenPrefix: "SG." },
  twilio: { type: "twilio", label: "Twilio" },
  openai: { type: "openai", label: "OpenAI", tokenPrefix: "sk-" },
};

export function getIntegrationConfig(type: IntegrationType): IntegrationConfig | undefined {
  return INTEGRATION_CONFIGS[type];
}

export function validateTokenFormat(type: IntegrationType, token: string): boolean {
  const config = INTEGRATION_CONFIGS[type];
  if (!config?.tokenPrefix) return true; // No format requirement
  return token.startsWith(config.tokenPrefix);
}
