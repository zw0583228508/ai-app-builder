/**
 * Sandbox Policy
 *
 * Centralised security controls for all tool execution and runtime management.
 * Every file operation and command must pass through these checks before
 * reaching the OS.
 *
 * Design: fail-closed — anything not explicitly allowed is denied.
 */

import path from "path";
import os from "os";

// ── Constants ─────────────────────────────────────────────────────────────────

export const WORKSPACES_BASE_DIR =
  process.env.PROJECT_WORKSPACES_DIR ??
  path.join(os.tmpdir(), "ai_builder_workspaces");

export const MAX_CONCURRENT_RUNTIMES = Number(
  process.env.MAX_CONCURRENT_RUNTIMES ?? "5",
);

export const MAX_WORKSPACE_SIZE_MB = Number(
  process.env.MAX_WORKSPACE_SIZE_MB ?? "100",
);

/** Wall-clock timeout for any single tool action (ms). */
export const TOOL_EXECUTION_TIMEOUT_MS = 30_000;

/** Wall-clock timeout for a full install_dependencies action (ms). */
export const INSTALL_TIMEOUT_MS = 120_000;

/** Wall-clock timeout for a run_command action (ms). */
export const RUN_COMMAND_TIMEOUT_MS = 60_000;

// ── Allowed Commands ──────────────────────────────────────────────────────────

/** Exact binary names that may be spawned. No shell metacharacters allowed. */
export const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  "node",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "tsc",
  "tsx",
  "vite",
  "next",
  "react-scripts",
  "esbuild",
  "rollup",
  "webpack",
  "prettier",
  "eslint",
  "jest",
  "vitest",
  "mocha",
  "python",
  "python3",
  "pip",
  "pip3",
  "poetry",
  "uv",
  "go",
  "cargo",
  "rustc",
  "deno",
  "bun",
  "ls",
  "cat",
  "echo",
  "mkdir",
  "cp",
  "mv",
  "rm",
  "find",
  "grep",
  "chmod",
  "touch",
]);

/** Patterns that are NEVER allowed inside command strings (shell injection). */
const BLOCKED_COMMAND_PATTERNS: ReadonlyArray<RegExp> = [
  /[;&|`$(){}[\]<>]/, // shell metacharacters
  /\.\.\//, // path traversal
  /\/etc\//, // system config
  /\/proc\//, // process filesystem
  /\/sys\//, // kernel filesystem
  /\/root\//, // root home
  /\bsudo\b/, // privilege escalation
  /\bsu\b/, // switch user
  /\bchmod\s+[0-9]*7/, // world-executable
  /\bchown\b/, // change owner
  /\bcurl\s.*\|\s*sh/i, // curl-pipe-sh
  /\bwget\s.*\|\s*sh/i, // wget-pipe-sh
  /\brm\s+-rf\s+\//, // recursive root delete
  /\bkill\s+-9\b/, // force-kill any PID
  /\bshutdown\b/,
  /\breboot\b/,
  /\bdd\b/, // disk destroyer
  /\bmkfs\b/, // format disk
  /\biptables\b/,
  /\bnc\b/, // netcat
  /\bnetcat\b/,
  /\bsocat\b/,
];

/** Allowed environment variable prefixes that may be forwarded to child processes. */
export const ALLOWED_ENV_PREFIXES: ReadonlyArray<string> = [
  "VITE_",
  "REACT_APP_",
  "NEXT_PUBLIC_",
  "PORT",
  "NODE_ENV",
  "HOME",
  "PATH",
  "TERM",
  "LANG",
  "LC_",
  "TZ",
  "npm_",
  "PNPM_",
];

// ── Error Taxonomy ────────────────────────────────────────────────────────────

export type SandboxErrorType =
  | "validation_error"
  | "workspace_error"
  | "runtime_error"
  | "sandbox_error"
  | "deploy_error"
  | "model_output_error";

export class SandboxError extends Error {
  constructor(
    public readonly type: SandboxErrorType,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}

// ── Path Safety ───────────────────────────────────────────────────────────────

/**
 * Resolve a path relative to a project workspace.
 * Throws if the resolved path escapes the workspace root.
 */
export function safeWorkspacePath(
  workspacePath: string,
  relativePath: string,
): string {
  const resolved = path.resolve(workspacePath, relativePath);
  const normalBase = path.resolve(workspacePath);

  if (!resolved.startsWith(normalBase + path.sep) && resolved !== normalBase) {
    throw new SandboxError(
      "sandbox_error",
      `Path traversal detected: "${relativePath}" escapes workspace`,
      { workspacePath, relativePath, resolved },
    );
  }
  return resolved;
}

/**
 * Validate that a workspace path is within WORKSPACES_BASE_DIR.
 */
export function assertWithinBase(absPath: string): void {
  const base = path.resolve(WORKSPACES_BASE_DIR);
  const resolved = path.resolve(absPath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new SandboxError(
      "sandbox_error",
      `Path "${absPath}" is outside the workspace base directory`,
    );
  }
}

// ── Command Validation ────────────────────────────────────────────────────────

/**
 * Validate a command + args array before passing to child_process.
 * Returns the validated binary name.
 */
export function validateCommand(
  cmd: string,
  args: ReadonlyArray<string> = [],
): void {
  const binary = path.basename(cmd);

  if (!ALLOWED_COMMANDS.has(binary)) {
    throw new SandboxError(
      "sandbox_error",
      `Command "${binary}" is not in the allowed command list`,
      { cmd, allowedCommands: [...ALLOWED_COMMANDS] },
    );
  }

  const fullCmdStr = [cmd, ...args].join(" ");
  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(fullCmdStr)) {
      throw new SandboxError(
        "sandbox_error",
        `Command contains a blocked pattern: ${pattern.source}`,
        { fullCmdStr },
      );
    }
  }
}

// ── Environment Sanitization ──────────────────────────────────────────────────

/**
 * Return a sanitized env object safe to pass to child_process.
 * Strips any vars that don't match the ALLOWED_ENV_PREFIXES allowlist.
 */
export function buildSafeChildEnv(
  extra: Record<string, string> = {},
): Record<string, string> {
  const safe: Record<string, string> = {};

  for (const [key, val] of Object.entries(process.env)) {
    if (
      val !== undefined &&
      ALLOWED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      safe[key] = val;
    }
  }

  for (const [key, val] of Object.entries(extra)) {
    if (ALLOWED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      safe[key] = val;
    }
  }

  return safe;
}

// ── File Extension Allowlist ──────────────────────────────────────────────────

const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".json5",
  ".jsonc",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svg",
  ".md",
  ".mdx",
  ".txt",
  ".env",
  ".env.local",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb",
  ".php",
  ".sh",
  ".bash",
  ".gitignore",
  ".gitattributes",
  ".prettierrc",
  ".eslintrc",
  ".editorconfig",
  ".nvmrc",
  ".node-version",
  "Dockerfile",
  "Makefile",
  ".dockerignore",
]);

export function validateFileExtension(filePath: string): void {
  const ext = path.extname(filePath) || path.basename(filePath);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new SandboxError(
      "validation_error",
      `File extension "${ext}" is not allowed`,
      { filePath },
    );
  }
}

// ── Package Name Validation ───────────────────────────────────────────────────

const BLOCKED_PACKAGES: ReadonlySet<string> = new Set([
  "shelljs",
  "child_process",
  "execa-root",
  "sudo-prompt",
  "node-pty",
]);

export function validatePackageNames(packages: ReadonlyArray<string>): void {
  for (const pkg of packages) {
    if (
      !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[\w.*-]+)?$/.test(
        pkg,
      )
    ) {
      throw new SandboxError(
        "validation_error",
        `Invalid package name: "${pkg}"`,
        { pkg },
      );
    }
    const name = pkg.split("@")[0].split("/").pop() ?? pkg;
    if (BLOCKED_PACKAGES.has(name)) {
      throw new SandboxError("sandbox_error", `Package "${name}" is blocked`, {
        pkg,
      });
    }
  }
}
