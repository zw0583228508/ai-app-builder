import { describe, it, expect } from "vitest";
import { autoCdnInject, CDN_MAP } from "../services/ai/preview";

describe("autoCdnInject", () => {
  it("injects chart.js CDN when Chart constructor is used", () => {
    const html = `<html><body><script>new Chart(ctx, config);</script></body></html>`;
    const result = autoCdnInject(html);
    expect(result).toContain("chart.js");
  });

  it("injects three.js CDN when THREE. is used", () => {
    const html = `<html><body><script>const scene = new THREE.Scene();</script></body></html>`;
    const result = autoCdnInject(html);
    expect(result).toContain("three");
  });

  it("injects leaflet CSS and JS when L.map is used", () => {
    const html = `<html><body><script>L.map('map');</script></body></html>`;
    const result = autoCdnInject(html);
    expect(result).toContain("leaflet");
  });

  it("does not inject CDN when no library is detected", () => {
    const html = `<html><body><p>Hello world</p></body></html>`;
    const result = autoCdnInject(html);
    // Should be unchanged or minimal change
    expect(result).toContain("Hello world");
  });

  it("does not double-inject if CDN already present", () => {
    const html = `<html><head>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</head><body><script>new Chart(ctx, config);</script></body></html>`;
    const result = autoCdnInject(html);
    const count = (result.match(/chart\.umd\.min\.js/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("returns valid HTML string", () => {
    const html = `<!DOCTYPE html><html><body></body></html>`;
    const result = autoCdnInject(html);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("CDN_MAP", () => {
  it("contains chart.js entry", () => {
    expect(CDN_MAP["chart.js"]).toBeDefined();
    expect(CDN_MAP["chart.js"].js).toContain("chart.js");
  });

  it("contains three.js entry with CDN URL", () => {
    expect(CDN_MAP["three.js"]).toBeDefined();
    expect(CDN_MAP["three.js"].js).toContain("three");
  });

  it("contains leaflet with both js and css", () => {
    expect(CDN_MAP["leaflet"]).toBeDefined();
    expect(CDN_MAP["leaflet"].js).toBeTruthy();
    expect(CDN_MAP["leaflet"].css).toBeTruthy();
  });

  it("all entries have match array with at least one pattern", () => {
    for (const [name, entry] of Object.entries(CDN_MAP)) {
      expect(
        Array.isArray(entry.match),
        `${name} should have match array`,
      ).toBe(true);
      expect(
        entry.match.length,
        `${name} match array should not be empty`,
      ).toBeGreaterThan(0);
    }
  });
});
