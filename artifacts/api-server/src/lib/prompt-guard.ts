const INJECTION_PATTERNS = [
  // Hebrew injection patterns
  /התעלם\s+(מכל|מההוראות|מהפקודות|ממה\s+שנאמר)/i,
  /שכח\s+(הכל|את\s+כל\s+ההוראות|מה\s+שנאמר)/i,
  /עכשיו\s+אתה\s+(בוט|מערכת|AI|עוזר)\s+(?:אחר|חדש|חופשי)/i,
  /מצב\s+(חופשי|ללא\s+הגבלות|dev|מפתח)/i,
  /הוראות?\s+מערכת\s*[:=]/i,
  /התחזה\s+ל/i,
  /פעל\s+בתור/i,

  // English instruction override patterns
  /ignore\s+(previous|all|the above|prior)\s+(instructions?|prompts?|rules?|context)/i,
  /forget\s+(everything|all|previous|prior|your\s+instructions?)/i,
  /disregard\s+(your|all|previous)\s+(instructions?|training|guidelines)/i,
  /override\s+(your|the|all)\s+(instructions?|rules?|guidelines|system)/i,
  /new\s+(system\s+)?instructions?\s*:/i,

  // Persona / role injection
  /\bact\s+as\b(?!\s+a\s+(?:web|app|ui|ux))/i,
  /\bpretend\s+(you\s+are|to\s+be)\b/i,
  /from\s+now\s+on\s+(you\s+are|act\s+as|respond\s+as)/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:different|new|another|evil|unrestricted|dan)/i,
  /respond\s+only\s+as\s+/i,

  // Jailbreak keywords
  /\bdan\s+mode\b/i,
  /\bjailbreak\b/i,
  /developer\s+mode\s+(on|enabled|activated)/i,
  /\bdo\s+anything\s+now\b/i,

  // Token / delimiter smuggling
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/,
  /###\s*(System|Instruction|Override|Admin)\s*:/i,
  /system\s+prompt\s*[:=]/i,

  // SSRF / data exfiltration via prompt
  /fetch\s+the\s+contents?\s+of\s+https?:\/\//i,
  /send\s+(the\s+)?(response|output|data)\s+to\s+https?:\/\//i,
  /http[s]?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.)/i,
];

export interface InjectionCheckResult {
  blocked: boolean;
  reason?: string;
}

export function checkPromptInjection(text: string): InjectionCheckResult {
  const normalised = text.replace(/\s+/g, " ").trim();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalised)) {
      return {
        blocked: true,
        reason: "הבקשה מכילה תוכן שנחסם מסיבות אבטחה. אנא שנה את הניסוח.",
      };
    }
  }
  return { blocked: false };
}
