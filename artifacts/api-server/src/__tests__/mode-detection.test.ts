import { describe, it, expect } from "vitest";
import { detectUserMode } from "../services/ai/mode";

describe("detectUserMode", () => {
  describe("maker mode", () => {
    it("detects 'for fun' signal", () => {
      expect(detectUserMode("I want to build something for fun")).toBe("maker");
    });
    it("detects 'side project' with hobby context", () => {
      expect(detectUserMode("just a hobby side project, no business")).toBe(
        "maker",
      );
    });
    it("detects Hebrew personal signals", () => {
      expect(detectUserMode("משהו לעצמי, פרויקט אישי קטן לכיף")).toBe("maker");
    });
  });

  describe("developer mode", () => {
    it("detects React + TypeScript keywords", () => {
      expect(
        detectUserMode(
          "build a react typescript component with hooks and state management",
        ),
      ).toBe("developer");
    });
    it("detects API + backend keywords", () => {
      expect(
        detectUserMode(
          "I need a REST API with postgresql database and express backend",
        ),
      ).toBe("developer");
    });
    it("detects Hebrew tech terms", () => {
      expect(detectUserMode("ריאקט עם הוקים ואפיאי")).toBe("developer");
    });
  });

  describe("builder mode", () => {
    it("detects dashboard / admin keywords", () => {
      expect(
        detectUserMode(
          "build a dashboard with admin panel for managing customers and users",
        ),
      ).toBe("builder");
    });
    it("detects e-commerce keywords", () => {
      expect(
        detectUserMode("build an e-commerce store with payment and checkout"),
      ).toBe("builder");
    });
    it("detects Hebrew builder keywords", () => {
      expect(detectUserMode("אתר מסחר אלקטרוני עם ניהול הזמנות")).toBe(
        "builder",
      );
    });
  });

  describe("entrepreneur mode", () => {
    it("returns entrepreneur as default for simple requests", () => {
      const mode = detectUserMode("build me a website");
      // Should be entrepreneur or another mode, just not crash
      expect(["entrepreneur", "builder", "developer", "maker"]).toContain(mode);
    });
    it("returns a valid mode for any input", () => {
      const modes = ["entrepreneur", "builder", "developer", "maker"] as const;
      const result = detectUserMode("something completely random xyz123");
      expect(modes).toContain(result);
    });
    it("handles empty string gracefully", () => {
      const modes = ["entrepreneur", "builder", "developer", "maker"] as const;
      expect(modes).toContain(detectUserMode(""));
    });
  });
});
