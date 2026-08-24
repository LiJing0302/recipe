import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import sharp = require('sharp')

export interface ImageUpload {
  filename: string
  mimetype: string
  buffer: Buffer
}

@Injectable()
export class ObjectStorageService {
  private readonly client: S3Client | undefined

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY
    if (endpoint && accessKey && secretKey) {
      this.client = new S3Client({
        endpoint,
        region: process.env.MINIO_REGION || 'us-east-1',
        forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== 'false',
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
      })
    }
  }

  async uploadImage(file: ImageUpload, kind: 'cover' | 'step') {
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('只支持图片文件')
    if (!file.buffer.length) throw new BadRequestException('图片上传内容为空')
    if (/image\/hei[cf]/i.test(file.mimetype) || /\.hei[cf]$/i.test(file.filename)) {
      throw new BadRequestException('暂不支持 HEIC/HEIF，请选择 JPG、PNG 或 WEBP 图片')
    }
    const client = this.getClient()
    const bucket = this.getBucket()
    const optimized = await this.optimizeImage(file, kind)
    const key = `recipes/${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable'
    }))

    return { key, url: this.objectUrl(key), contentType: 'image/webp', size: optimized.length }
  }

  private async optimizeImage(file: ImageUpload, kind: 'cover' | 'step') {
    const maxSize = kind === 'cover' ? 1600 : 1200
    const quality = kind === 'cover' ? 82 : 80
    try {
      return await sharp(file.buffer)
        .rotate()
        .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer()
    } catch (error) {
      console.error('[uploads] sharp decode failed', {
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.buffer.length,
        message: error instanceof Error ? error.message : String(error)
      })
      throw new BadRequestException('图片格式不支持或图片已损坏')
    }
  }

  async getImage(key: string) {
    if (!key || key.includes('..') || !key.startsWith('recipes/')) throw new BadRequestException('图片路径无效')
    return this.getClient().send(new GetObjectCommand({ Bucket: this.getBucket(), Key: key }))
  }

  private objectUrl(key: string) {
    const baseUrl = (process.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
    return `${baseUrl}/api/uploads/object?key=${encodeURIComponent(key)}`
  }

  private getClient() {
    if (!this.client) throw new InternalServerErrorException('MinIO 尚未配置，请检查后端环境变量')
    return this.client
  }

  private getBucket() {
    const bucket = process.env.MINIO_BUCKET
    if (!bucket) throw new InternalServerErrorException('MINIO_BUCKET 尚未配置')
    return bucket
  }
}
