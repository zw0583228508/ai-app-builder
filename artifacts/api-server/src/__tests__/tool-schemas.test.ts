import { describe, it, expect } from "vitest";
import { AnyToolActionSchema } from "../domain/ai-tools/schemas.js";

describe("AnyToolActionSchema — valid actions", () => {
  it("parses create_file", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "create_file",
      input: {
        path: "src/App.tsx",
        content: "export default function App() { return null; }",
      },
    });
    expect(result.success).toBe(true);
  });

  it("parses update_file", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "update_file",
      input: { path: "src/App.tsx", content: "// updated" },
    });
    expect(result.success).toBe(true);
  });

  it("parses read_file", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "read_file",
      input: { path: "package.json" },
    });
    expect(result.success).toBe(true);
  });

  it("parses delete_file", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "delete_file",
      input: { path: "old-file.ts" },
    });
    expect(result.success).toBe(true);
  });

  it("parses list_files with defaults", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "list_files",
      input: {},
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.action === "list_files") {
      expect(result.data.input.recursive).toBe(false);
      expect(result.data.input.directory).toBe(".");
    }
  });

  it("parses install_dependencies", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "install_dependencies",
      input: { packages: ["react", "react-dom"], dev: false },
    });
    expect(result.success).toBe(true);
  });

  it("parses run_command", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "run_command",
      input: { command: "tsc", args: ["--noEmit"] },
    });
    expect(result.success).toBe(true);
  });

  it("parses start_runtime", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "start_runtime",
      input: { command: "node", args: ["server.js"], port: 3000 },
    });
    expect(result.success).toBe(true);
  });

  it("parses stop_runtime", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "stop_runtime",
      input: {},
    });
    expect(result.success).toBe(true);
  });

  it("parses get_project_state", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "get_project_state",
      input: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("AnyToolActionSchema — invalid actions", () => {
  it("rejects unknown action type", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "rm_rf_everything",
      input: { path: "/" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "create_file",
      input: { content: "oops — no path" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty packages array for install_dependencies", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "install_dependencies",
      input: { packages: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized timeout for run_command", () => {
    const result = AnyToolActionSchema.safeParse({
      action: "run_command",
      input: { command: "node", timeoutMs: 999_999_999 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects raw action string (no object)", () => {
    const result = AnyToolActionSchema.safeParse("create_file src/App.tsx");
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = AnyToolActionSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
