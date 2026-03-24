import { describe, it, expect } from "vitest";
import {
  applyPatch,
  hasPatchBlocks,
  countPatchBlocks,
  validatePatchFormat,
} from "../services/ai/patching/index";

describe("applyPatch", () => {
  it("replaces a single patch block correctly", () => {
    const original = "<div>old content</div>";
    const patch = `<<<REPLACE>>>
old content
<<<WITH>>>
new content
<<<END>>>`;
    expect(applyPatch(original, patch)).toBe("<div>new content</div>");
  });

  it("applies multiple patch blocks in sequence", () => {
    const original = "<div>A</div><span>B</span>";
    const patch = `<<<REPLACE>>>
A
<<<WITH>>>
Alpha
<<<END>>>
<<<REPLACE>>>
B
<<<WITH>>>
Beta
<<<END>>>`;
    const result = applyPatch(original, patch);
    expect(result).toContain("Alpha");
    expect(result).toContain("Beta");
  });

  it("returns original if find string not found in original", () => {
    const original = "<div>hello</div>";
    const patch = `<<<REPLACE>>>
nonexistent content
<<<WITH>>>
replacement
<<<END>>>`;
    expect(applyPatch(original, patch)).toBe(original);
  });

  it("returns original if response has no patch blocks", () => {
    const original = "<div>content</div>";
    const patch = "Here is the updated content without patch markers";
    expect(applyPatch(original, patch)).toBe(original);
  });

  it("returns original if patchResponse is empty", () => {
    const original = "<div>content</div>";
    expect(applyPatch(original, "")).toBe(original);
  });

  it("handles multiline replacements", () => {
    const original = `<div>
  <p>old line 1</p>
  <p>old line 2</p>
</div>`;
    const patch = `<<<REPLACE>>>
<p>old line 1</p>
  <p>old line 2</p>
<<<WITH>>>
<p>new line 1</p>
  <p>new line 2</p>
<<<END>>>`;
    const result = applyPatch(original, patch);
    expect(result).toContain("new line 1");
    expect(result).toContain("new line 2");
    expect(result).not.toContain("old line 1");
  });

  it("does not apply patch if find block is empty", () => {
    const original = "<div>content</div>";
    const patch = `<<<REPLACE>>>
<<<WITH>>>
something
<<<END>>>`;
    expect(applyPatch(original, patch)).toBe(original);
  });
});

describe("hasPatchBlocks", () => {
  it("returns true when response has both REPLACE and WITH markers", () => {
    expect(hasPatchBlocks("<<<REPLACE>>>old<<<WITH>>>new<<<END>>>")).toBe(true);
  });

  it("returns false when response has no markers", () => {
    expect(hasPatchBlocks("plain text response")).toBe(false);
  });

  it("returns false when only REPLACE marker present", () => {
    expect(hasPatchBlocks("<<<REPLACE>>>text")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasPatchBlocks("")).toBe(false);
  });
});

describe("countPatchBlocks", () => {
  it("returns 0 for no patch blocks", () => {
    expect(countPatchBlocks("no patches here")).toBe(0);
  });

  it("returns 1 for a single patch block", () => {
    expect(countPatchBlocks("<<<REPLACE>>>a<<<WITH>>>b<<<END>>>")).toBe(1);
  });

  it("returns correct count for multiple blocks", () => {
    const multi =
      "<<<REPLACE>>>a<<<WITH>>>b<<<END>>>" +
      "<<<REPLACE>>>c<<<WITH>>>d<<<END>>>" +
      "<<<REPLACE>>>e<<<WITH>>>f<<<END>>>";
    expect(countPatchBlocks(multi)).toBe(3);
  });
});

describe("validatePatchFormat", () => {
  it("returns true for a well-formed single patch", () => {
    expect(validatePatchFormat("<<<REPLACE>>>a<<<WITH>>>b<<<END>>>")).toBe(
      true,
    );
  });

  it("returns true for multiple well-formed patches", () => {
    const multi =
      "<<<REPLACE>>>a<<<WITH>>>b<<<END>>>" +
      "<<<REPLACE>>>c<<<WITH>>>d<<<END>>>";
    expect(validatePatchFormat(multi)).toBe(true);
  });

  it("returns false for mismatched REPLACE/WITH/END counts", () => {
    expect(validatePatchFormat("<<<REPLACE>>>a<<<WITH>>>b")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validatePatchFormat("")).toBe(false);
  });

  it("returns false when only REPLACE markers present", () => {
    expect(validatePatchFormat("<<<REPLACE>>><<<REPLACE>>>")).toBe(false);
  });
});
