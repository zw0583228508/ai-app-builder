import { describe, it, expect } from "vitest";
import { isHtmlUsable } from "../utils/html";

describe("isHtmlUsable", () => {
  it("rejects empty string", () => {
    expect(isHtmlUsable("")).toBe(false);
  });

  it("rejects string shorter than 200 chars", () => {
    expect(isHtmlUsable("<html><body>hello</body></html>")).toBe(false);
  });

  it("rejects content without <html> or <body>", () => {
    const content = "a".repeat(200);
    expect(isHtmlUsable(content)).toBe(false);
  });

  it("rejects truncated HTML with no closing </html>", () => {
    const truncated = `<!DOCTYPE html><html><head><title>Test</title></head><body>` + "x".repeat(300);
    expect(isHtmlUsable(truncated)).toBe(false);
  });

  it("rejects HTML where </html> appears too early (first 40%)", () => {
    const early = `<html><body><p>content</p></html>` + "x".repeat(300);
    expect(isHtmlUsable(early)).toBe(false);
  });

  it("accepts a well-formed HTML document", () => {
    const valid = `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8">
  <title>Test Page</title>
  <style>body { font-family: sans-serif; }</style>
</head>
<body>
  <h1>שלום עולם</h1>
  <p>This is a test paragraph with enough content to be valid.</p>
  <p>Adding more content to ensure the document reaches the minimum length threshold.</p>
  <p>Even more content here to make sure we exceed 200 characters total.</p>
</body>
</html>`;
    expect(isHtmlUsable(valid)).toBe(true);
  });

  it("accepts HTML with <body> but no explicit <html> wrapper", () => {
    const bodyOnly = `<body>` + "<p>paragraph content</p>".repeat(15) + `</body></html>`;
    expect(isHtmlUsable(bodyOnly)).toBe(true);
  });

  it("is case-insensitive for html/body tags", () => {
    const upper = `<!DOCTYPE HTML>
<HTML><BODY>` + "content ".repeat(30) + `</BODY></HTML>`;
    expect(isHtmlUsable(upper)).toBe(true);
  });
});
