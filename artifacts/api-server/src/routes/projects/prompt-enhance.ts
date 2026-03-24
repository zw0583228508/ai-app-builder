import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { GetProjectParams } from "@workspace/api-zod";

const router = Router({ mergeParams: true });

router.post("/:id/enhance-prompt", async (req, res) => {
  const params = GetProjectParams.parse(req.params);
  void params;
  const { prompt, mode } = req.body as { prompt: string; mode?: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt required" });
    return;
  }

  const modeHint =
    mode === "developer"
      ? "The user is a developer. Enhance technically with architecture, tech stack, and implementation details."
      : mode === "builder"
        ? "The user is a builder/maker. Enhance with feature set, user flows, and UI/UX details."
        : "The user is an entrepreneur/non-technical. Enhance with business purpose, user value, and key features in simple language.";

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a prompt engineer for an AI web app builder. Expand the following short prompt into a detailed, specific prompt (2-4 sentences max) that will produce a better result. Keep it concise and in the same language as the input. Do not add any explanation — output ONLY the enhanced prompt.\n\n${modeHint}\n\nShort prompt: "${prompt}"`,
        },
      ],
    });

    const enhanced = (
      response.content[0] as { type: string; text: string }
    ).text?.trim();
    res.json({ enhanced: enhanced || prompt });
  } catch {
    res.json({ enhanced: prompt });
  }
});

export default router;
