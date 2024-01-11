import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { z } from "zod";
import { openai } from "./../libs/openai";
import { prisma } from "../libs/prisma";

const paramSchema = z.object({
  videoId: z.string().uuid(),
});
const bodySchema = z.object({
  prompt: z.string(),
});

export async function createTranscriptionRouter(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (req) => {
    const { videoId } = paramSchema.parse(req.params);
    const { prompt } = bodySchema.parse(req.body);

    // Buscar informação do vídeo no banco de dados
    const video = await prisma.video.findFirstOrThrow({
      where: {
        id: videoId,
      },
    });

    // Caminho onde esta gravado o vídeo
    const videoPath = video.path;
    // Ler o arquivo
    const audioReadStream = createReadStream(videoPath);

    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      temperature: 0,
      prompt,
    });

    const transcription = response.text;

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        transcription,
      },
    });

    return { transcription };
  });
}
