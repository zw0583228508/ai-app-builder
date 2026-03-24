/**
 * Terminal security utilities
 * Shared between terminal route and tests.
 */

export const SAFE_ENV_KEYS = [
  "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
  "TMPDIR", "TMP", "TEMP", "PWD", "LOGNAME", "NODE_ENV",
  "NODE_VERSION", "npm_execpath",
] as const;

/** Builds a safe environment object — never leaks API keys or DB URLs. */
export function buildSafeEnv(sourceEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    if (sourceEnv[key] !== undefined) env[key] = sourceEnv[key];
  }
  env["TERM"] = "xterm-256color";
  env["COLORTERM"] = "truecolor";
  env["PS1"] = "\\[\\033[1;32m\\]builder\\[\\033[0m\\]:\\[\\033[1;34m\\]\\W\\[\\033[0m\\]$ ";
  return env;
}

/** Patterns that represent dangerous commands that should never run in the terminal. */
export const BLOCKED_PATTERNS: RegExp[] = [
  /\brm\s+(-[rf]{1,2}\s+)?\/\s/i,
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  /:\(\)\{.*\}\s*;.*:/,
  /\biptables\b/i,
  /\bcrontab\s+-[er]/i,
  /\bsudo\b/i,
  /\bsu\s+(-[l-]?\s+)?\w/i,
  /curl[^|]+\|\s*(ba)?sh\b/i,
  /wget[^|]+\|\s*(ba)?sh\b/i,
  /\bchmod\s+[0-7]*7+\s+\//i,
];

/** Returns true if the command matches any dangerous pattern. */
export function isCommandBlocked(input: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(input));
}
