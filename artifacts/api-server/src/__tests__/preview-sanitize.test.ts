import { describe, it, expect } from "vitest";
import { sanitizeImageUrls } from "../services/ai/preview";

describe("sanitizeImageUrls", () => {
  it("passes through https images unchanged", () => {
    const html = `<img src="https://example.com/img.png" alt="test">`;
    expect(sanitizeImageUrls(html)).toBe(html);
  });

  it("passes through absolute paths unchanged", () => {
    const html = `<img src="/images/logo.png">`;
    expect(sanitizeImageUrls(html)).toBe(html);
  });

  it("passes through relative paths unchanged", () => {
    const html = `<img src="./assets/photo.jpg">`;
    expect(sanitizeImageUrls(html)).toBe(html);
  });

  it("blocks javascript: protocol — XSS vector", () => {
    const html = `<img src="javascript:alert(document.cookie)">`;
    expect(sanitizeImageUrls(html)).toContain(`src=""`);
    expect(sanitizeImageUrls(html)).not.toContain("javascript:");
  });

  it("blocks data: URI — content injection vector", () => {
    const html = `<img src="data:image/png;base64,abc123">`;
    expect(sanitizeImageUrls(html)).toContain(`src=""`);
    expect(sanitizeImageUrls(html)).not.toContain("data:");
  });

  it("blocks http: (non-secure) images", () => {
    const html = `<img src="http://malicious.com/track.gif">`;
    expect(sanitizeImageUrls(html)).toContain(`src=""`);
  });

  it("handles multiple images — blocks bad, keeps good", () => {
    const html = `
      <img src="https://good.com/a.png">
      <img src="javascript:evil()">
      <img src="/relative/path.jpg">
    `;
    const result = sanitizeImageUrls(html);
    expect(result).toContain(`src="https://good.com/a.png"`);
    expect(result).toContain(`src="/relative/path.jpg"`);
    expect(result).not.toContain("javascript:");
  });

  it("returns unchanged string when no img tags present", () => {
    const html = `<div><p>no images here</p></div>`;
    expect(sanitizeImageUrls(html)).toBe(html);
  });
});
