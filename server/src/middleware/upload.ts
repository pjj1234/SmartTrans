import multer from 'multer'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { config } from '../config'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.paths.uploads),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
})

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
})

const ALLOWED_KNOWLEDGE_EXT = ['.md', '.txt', '.markdown']

export const uploadKnowledge = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const extOk = ALLOWED_KNOWLEDGE_EXT.includes(ext)
    cb(null, extOk)
  },
})
