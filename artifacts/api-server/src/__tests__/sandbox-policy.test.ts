import { describe, it, expect } from "vitest";
import {
  safeWorkspacePath,
  validateCommand,
  validatePackageNames,
  buildSafeChildEnv,
  validateFileExtension,
  SandboxError,
} from "../domain/sandbox/sandbox-policy.js";
import path from "path";

describe("safeWorkspacePath", () => {
  const base = "/tmp/ai_builder_workspaces/42";

  it("resolves a simple relative path", () => {
    const result = safeWorkspacePath(base, "src/index.ts");
    expect(result).toBe(path.join(base, "src/index.ts"));
  });

  it("throws on path traversal with ../", () => {
    expect(() => safeWorkspacePath(base, "../../etc/passwd")).toThrow(
      SandboxError,
    );
  });

  it("throws on absolute path escaping workspace", () => {
    expect(() => safeWorkspacePath(base, "/etc/passwd")).toThrow(SandboxError);
  });

  it("allows nested paths", () => {
    const result = safeWorkspacePath(base, "src/components/App.tsx");
    expect(result).toContain("src/components/App.tsx");
  });
});

describe("validateCommand", () => {
  it("allows whitelisted commands", () => {
    expect(() => validateCommand("node", ["index.js"])).not.toThrow();
    expect(() => validateCommand("npm", ["install"])).not.toThrow();
    expect(() => validateCommand("pnpm", ["install"])).not.toThrow();
    expect(() => validateCommand("vite", ["build"])).not.toThrow();
    expect(() => validateCommand("tsc", ["--noEmit"])).not.toThrow();
  });

  it("blocks non-allowlisted commands", () => {
    expect(() => validateCommand("bash", ["-c", "rm -rf /"])).toThrow(
      SandboxError,
    );
    expect(() => validateCommand("curl", ["http://example.com"])).toThrow(
      SandboxError,
    );
    expect(() => validateCommand("wget", ["http://example.com"])).toThrow(
      SandboxError,
    );
    expect(() =>
      validateCommand("python3", ["-c", "import os; os.system('rm -rf /')"]),
    ).toThrow(SandboxError);
  });

  it("blocks shell metacharacters in args", () => {
    expect(() => validateCommand("node", ["; rm -rf /"])).toThrow(SandboxError);
    expect(() => validateCommand("npm", ["|", "bash"])).toThrow(SandboxError);
    expect(() => validateCommand("npm", ["`evil`"])).toThrow(SandboxError);
  });

  it("blocks sudo", () => {
    expect(() => validateCommand("sudo", ["npm", "install"])).toThrow(
      SandboxError,
    );
  });
});

describe("validatePackageNames", () => {
  it("accepts valid package names", () => {
    expect(() =>
      validatePackageNames(["react", "react-dom", "@types/node"]),
    ).not.toThrow();
    expect(() =>
      validatePackageNames(["zod", "@tanstack/react-query"]),
    ).not.toThrow();
  });

  it("rejects malformed package names", () => {
    expect(() => validatePackageNames(["../evil"])).toThrow(SandboxError);
    expect(() => validatePackageNames(["; rm -rf /"])).toThrow(SandboxError);
    expect(() => validatePackageNames(["pkg; evil"])).toThrow(SandboxError);
  });

  it("rejects blocked packages", () => {
    expect(() => validatePackageNames(["shelljs"])).toThrow(SandboxError);
    expect(() => validatePackageNames(["sudo-prompt"])).toThrow(SandboxError);
  });
});

describe("validateFileExtension", () => {
  it("allows common dev file types", () => {
    expect(() => validateFileExtension("src/App.tsx")).not.toThrow();
    expect(() => validateFileExtension("package.json")).not.toThrow();
    expect(() => validateFileExtension("index.html")).not.toThrow();
    expect(() => validateFileExtension("styles.css")).not.toThrow();
    expect(() => validateFileExtension(".env")).not.toThrow();
  });

  it("blocks executables and binary files", () => {
    expect(() => validateFileExtension("evil.exe")).toThrow(SandboxError);
    expect(() => validateFileExtension("script.bin")).toThrow(SandboxError);
    expect(() => validateFileExtension("payload.so")).toThrow(SandboxError);
  });
});

describe("buildSafeChildEnv", () => {
  it("only includes whitelisted env prefixes", () => {
    const env = buildSafeChildEnv({
      VITE_API_URL: "https://example.com",
      PORT: "3000",
    });
    expect(env["VITE_API_URL"]).toBe("https://example.com");
    expect(env["PORT"]).toBe("3000");
  });

  it("strips sensitive keys like secrets", () => {
    const env = buildSafeChildEnv({ SECRET_KEY: "should-not-appear" });
    expect(env["SECRET_KEY"]).toBeUndefined();
    expect(env["DATABASE_URL"]).toBeUndefined();
  });
});
