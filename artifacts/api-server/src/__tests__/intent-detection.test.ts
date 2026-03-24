import { describe, it, expect } from "vitest";
import { detectChatIntent } from "../services/ai/intent";

describe("detectChatIntent", () => {
  describe("deploy intent", () => {
    it("detects 'deploy' keyword", () => {
      expect(detectChatIntent("deploy the app now", false).intent).toBe("deploy");
    });
    it("detects Hebrew deploy keywords", () => {
      expect(detectChatIntent("פרסם את האתר", true).intent).toBe("deploy");
      expect(detectChatIntent("הפוך לחי", true).intent).toBe("deploy");
    });
    it("detects netlify keyword", () => {
      expect(detectChatIntent("publish to netlify", false).intent).toBe("deploy");
    });
  });

  describe("git_push intent", () => {
    it("detects github keyword", () => {
      expect(detectChatIntent("push to github", true).intent).toBe("git_push");
    });
    it("detects Hebrew git keywords", () => {
      expect(detectChatIntent("סנכרן github", true).intent).toBe("git_push");
    });
    it("returns correct label and emoji", () => {
      const result = detectChatIntent("commit and push", true);
      expect(result.intent).toBe("git_push");
      expect(result.emoji).toBe("📦");
    });
  });

  describe("fix intent", () => {
    it("detects 'fix' keyword", () => {
      expect(detectChatIntent("fix the button", true).intent).toBe("fix");
    });
    it("detects 'error' keyword", () => {
      expect(detectChatIntent("there is an error in the form", true).intent).toBe("fix");
    });
    it("detects Hebrew fix keywords", () => {
      expect(detectChatIntent("תקן את הבאג", true).intent).toBe("fix");
      expect(detectChatIntent("לא עובד הכפתור", true).intent).toBe("fix");
    });
    it("detects 'not working' variant", () => {
      expect(detectChatIntent("the login doesn't work", true).intent).toBe("fix");
    });
  });

  describe("inspect intent", () => {
    it("detects 'what is' with existing code", () => {
      expect(detectChatIntent("what is in this project", true).intent).toBe("inspect");
    });
    it("detects Hebrew inspect keywords", () => {
      expect(detectChatIntent("מה יש כאן", true).intent).toBe("inspect");
      expect(detectChatIntent("מה עשית", true).intent).toBe("inspect");
    });
    it("does not trigger inspect without existing code", () => {
      const result = detectChatIntent("what is the app", false);
      expect(result.intent).not.toBe("inspect");
    });
  });

  describe("add_feature intent", () => {
    it("detects 'add' with existing code", () => {
      expect(detectChatIntent("add a login button", true).intent).toBe("add_feature");
    });
    it("detects Hebrew add keywords", () => {
      expect(detectChatIntent("הוסף כפתור", true).intent).toBe("add_feature");
    });
    it("detects continue keywords with existing code", () => {
      expect(detectChatIntent("continue building", true).intent).toBe("add_feature");
      expect(detectChatIntent("המשך", true).intent).toBe("add_feature");
    });
    it("does not trigger add_feature without existing code", () => {
      const result = detectChatIntent("add a login page", false);
      expect(["create", "general"]).toContain(result.intent);
    });
  });

  describe("edit intent", () => {
    it("detects 'change' with existing code", () => {
      expect(detectChatIntent("change the color to blue", true).intent).toBe("edit");
    });
    it("detects 'update' with existing code", () => {
      expect(detectChatIntent("update the title text", true).intent).toBe("edit");
    });
    it("detects Hebrew edit keywords", () => {
      expect(detectChatIntent("שנה את הצבע", true).intent).toBe("edit");
      expect(detectChatIntent("עדכן את הכותרת", true).intent).toBe("edit");
    });
  });

  describe("create intent", () => {
    it("triggers create when no existing code", () => {
      expect(detectChatIntent("build me a landing page", false).intent).toBe("create");
    });
    it("triggers create on 'from scratch' even with existing code", () => {
      expect(detectChatIntent("rebuild from scratch", true).intent).toBe("create");
    });
    it("triggers create on 'start over'", () => {
      expect(detectChatIntent("start over with a new design", true).intent).toBe("create");
    });
    it("triggers create on Hebrew rebuild keywords", () => {
      expect(detectChatIntent("בנה מחדש", true).intent).toBe("create");
    });
    it("returns create emoji", () => {
      const result = detectChatIntent("make a new website", false);
      expect(result.emoji).toBe("🏗️");
    });
  });

  describe("priority ordering", () => {
    it("deploy takes priority over edit keywords", () => {
      expect(detectChatIntent("deploy and update the colors", true).intent).toBe("deploy");
    });
    it("fix takes priority over add keywords", () => {
      expect(detectChatIntent("fix and add a button", true).intent).toBe("fix");
    });
    it("git_push takes priority over fix", () => {
      expect(detectChatIntent("push to github fix commit", true).intent).toBe("git_push");
    });
  });
});
