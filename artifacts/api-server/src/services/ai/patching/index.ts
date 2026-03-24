/**
 * Patch Mode Engine
 *
 * Handles <<<REPLACE>>>...<<<WITH>>>...<<<END>>> patch format.
 */

/**
 * Apply <<<REPLACE>>>...<<<WITH>>>...<<<END>>> patch blocks to existing HTML.
 * Returns the patched HTML, or the original if patching fails.
 */
export function applyPatch(original: string, patchResponse: string): string {
  let result = original;
  const patchRegex = /<<<REPLACE>>>([\s\S]*?)<<<WITH>>>([\s\S]*?)<<<END>>>/g;
  let match: RegExpExecArray | null;
  let patchApplied = false;

  while ((match = patchRegex.exec(patchResponse)) !== null) {
    const find = match[1].trim();
    const replace = match[2].trim();
    if (find && result.includes(find)) {
      result = result.replace(find, replace);
      patchApplied = true;
    }
  }

  return patchApplied ? result : original;
}

/**
 * Detects whether an AI response contains patch format blocks.
 */
export function hasPatchBlocks(response: string): boolean {
  return response.includes("<<<REPLACE>>>") && response.includes("<<<WITH>>>");
}

/**
 * Count the number of patch blocks in a response.
 */
export function countPatchBlocks(response: string): number {
  return (response.match(/<<<REPLACE>>>/g) || []).length;
}

/**
 * Validates that each REPLACE block has a matching WITH and END.
 * Returns true if the patch format is well-formed.
 */
export function validatePatchFormat(response: string): boolean {
  const replaceCount = (response.match(/<<<REPLACE>>>/g) || []).length;
  const withCount = (response.match(/<<<WITH>>>/g) || []).length;
  const endCount = (response.match(/<<<END>>>/g) || []).length;
  return (
    replaceCount === withCount && withCount === endCount && replaceCount > 0
  );
}
