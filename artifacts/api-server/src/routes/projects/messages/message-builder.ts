export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: string; data: string };
    };

export interface Attachment {
  name: string;
  type: string;
  data: string;
}

export interface FinalUserContentCtx {
  isAfterSpecPhase: boolean;
  previewHtml: string | null;
  existingMessages: Array<{ role: string; content: string }>;
  isReactStackForPrompt: boolean;
  existingProjectFiles: Array<{
    path: string;
    language: string;
    content: string;
  }>;
  intent: string;
  isFirstMessage: boolean;
}

export function buildUserContent(
  text: string,
  attachments?: Attachment[],
): string | ContentBlock[] {
  if (!attachments || attachments.length === 0) return text;
  const blocks: ContentBlock[] = [{ type: "text", text }];
  for (const att of attachments) {
    const mime = att.type.toLowerCase();
    if (
      mime.startsWith("image/jpeg") ||
      mime.startsWith("image/png") ||
      mime.startsWith("image/gif") ||
      mime.startsWith("image/webp")
    ) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: att.type as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: att.data,
        },
      });
    } else if (mime === "application/pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: att.data,
        },
      });
    } else {
      blocks.push({
        type: "text",
        text: `\n\n---\nתוכן הקובץ "${att.name}":\n${att.data}`,
      });
    }
  }
  return blocks;
}

export function buildFinalUserContent(
  text: string,
  attachments: Attachment[] | undefined,
  ctx: FinalUserContentCtx,
): string | ContentBlock[] {
  let enrichedText = text;

  if (ctx.isAfterSpecPhase && !ctx.previewHtml) {
    const specContent = ctx.existingMessages[3]?.content ?? "";
    enrichedText = `[PRODUCT SPEC — USE THIS AS BLUEPRINT]\n${specContent}\n[END PRODUCT SPEC]\n\nUSER CONFIRMATION: ${text}\n\nBuild the complete app based on the Product Spec above.`;
  }

  if (ctx.isReactStackForPrompt && ctx.existingProjectFiles.length > 0) {
    const filesBlock = ctx.existingProjectFiles
      .map(
        (f) =>
          `FILE: ${f.path}\n\`\`\`${f.language === "typescript" ? "tsx" : f.language}\n${f.content}\n\`\`\``,
      )
      .join("\n\n");
    enrichedText = `[CURRENT PROJECT FILES — START]\nThese are the current React files. ONLY output files that need to change.\n\n${filesBlock}\n[CURRENT PROJECT FILES — END]\n\nUSER REQUEST: ${text}`;
  } else if (!ctx.isFirstMessage && ctx.previewHtml) {
    const isPatchIntent = ctx.intent === "fix" || ctx.intent === "edit";
    const MAX_PATCH_HTML_CHARS = 18_000;
    let htmlForContext = ctx.previewHtml;
    if (isPatchIntent && htmlForContext.length > MAX_PATCH_HTML_CHARS) {
      const head = htmlForContext.slice(0, 15_000);
      const tail = htmlForContext.slice(-3_000);
      htmlForContext = `${head}\n\n<!-- ... [${Math.round((htmlForContext.length - 18_000) / 1000)}KB truncated] ... -->\n\n${tail}`;
    }
    enrichedText = `[CURRENT APP CODE — START]\nThe app currently has the following complete HTML. ${isPatchIntent ? "Use the PATCH FORMAT (<<<REPLACE>>>...<<<WITH>>>...<<<END>>>) to return ONLY the changed sections — do NOT rewrite the full file." : "You MUST use this as your exact base. Return the complete updated HTML."}\n\n\`\`\`html\n${htmlForContext}\n\`\`\`\n[CURRENT APP CODE — END]\n\nUSER REQUEST: ${text}`;
  }

  return buildUserContent(enrichedText, attachments);
}
