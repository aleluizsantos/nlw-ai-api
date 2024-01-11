import fastifyMultipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import path from "node:path";
import { prisma } from "../libs/prisma";

/**
 * Promisify é um conceito muito útil no Node.js que permite transformar
 * funções assíncronas baseadas em callbacks em funções que retornam Promises.
 */
const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 25, // 25MB
    },
  });

  app.post("/videos", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Missing file input." });

    const extension = path.extname(data.filename);

    if (extension !== ".mp3")
      return reply
        .status(400)
        .send({ error: "Invalid input type, please upload a MP3" });

    // Retornar o nome do arquivo sem extensão
    const filebasename = path.basename(data.filename, extension);
    const fileUploadName = `${filebasename}-${randomUUID()}${extension}`;
    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    // Realizar o upload
    await pump(data.file, fs.createWriteStream(uploadDestination));

    // Salvar dados do vídeo no bando de dados
    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return { video };
  });
}
