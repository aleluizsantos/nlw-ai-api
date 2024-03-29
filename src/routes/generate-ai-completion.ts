import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { openai } from "./../libs/openai";
import { prisma } from "../libs/prisma";

const bodySchema = z.object({
  videoId: z.string().uuid(),
  template: z.string(),
  temperature: z.number().min(0).max(1).default(0.5),
});

export async function generateAICompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (req, reply) => {
    const { videoId, template, temperature } = bodySchema.parse(req.body);

    const video = await prisma.video.findFirstOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return reply
        .status(400)
        .send({ error: "Video transcription was not generated yet" });
    }

    const promptMessage = template.replace(
      "{transcription}",
      video.transcription
    );

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      temperature,
      messages: [{ role: "user", content: promptMessage }],
    });

    return response;
  });
}
