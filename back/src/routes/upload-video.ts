import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma";
import { fastifyMultipart } from "@fastify/multipart"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import fs from "node:fs"

const MB = 1_048_576
const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 25 * MB
        }
    })

    app.post('/videos', async (request, reply) => {
        const data = await request.file()

        if (!data) {
            return reply.status(400).send({
                error: 'Missing file input'
            })
        }

        const extension = path.extname(data.filename)

        if (extension !== '.mp3') {
            return reply.status(400).send({
                error: 'Invalid input typ, please upload a mp3 file.'
            })
        }

        const uploadFileBaseName = path.basename(data.filename, extension)
        const uploadFileName = `${uploadFileBaseName}-${randomUUID()}${extension}`
        const uploadFilePath = path.resolve(__dirname, '../../uploads', uploadFileName)

        await pump(data.file, fs.createWriteStream(uploadFilePath))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadFilePath
            }
        })

        return {
            video
        }
    })
}