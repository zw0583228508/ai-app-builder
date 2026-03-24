const PROMPT_LIBRARY_KEY = "builder_prompt_library";

export function loadPrompts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PROMPT_LIBRARY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePrompts(prompts: string[]): void {
  try {
    localStorage.setItem(PROMPT_LIBRARY_KEY, JSON.stringify(prompts));
  } catch {}
}
