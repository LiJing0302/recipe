import { BadRequestException, Controller, Get, InternalServerErrorException, Post, Query, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ObjectStorageService } from './object-storage.service'

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: ObjectStorageService) {}

  @Post('images')
  async uploadImage(@Req() request: FastifyRequest) {
    let file: { filename: string; mimetype: string; buffer: Buffer } | undefined
    let kind: 'cover' | 'step' = 'cover'
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (file) throw new BadRequestException('一次只能上传一张图片')
        file = { filename: part.filename, mimetype: part.mimetype, buffer: await part.toBuffer() }
      } else if (part.fieldname === 'kind' && part.value === 'step') {
        kind = 'step'
      }
    }
    if (!file) throw new BadRequestException('请选择图片文件')
    return this.storage.uploadImage(file, kind)
  }

  @Get('object')
  async getImage(@Query('key') key: string, @Res() reply: FastifyReply) {
    const object = await this.storage.getImage(key)
    if (!object.Body) throw new BadRequestException('图片不存在')
    reply.header('Content-Type', object.ContentType || 'application/octet-stream')
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    return reply.send(object.Body)
  }

  @Get('external')
  async getExternalImage(@Query('url') rawUrl: string, @Res() reply: FastifyReply) {
    if (!rawUrl) throw new BadRequestException('图片地址不能为空')
    let target: URL
    try {
      target = new URL(rawUrl)
    } catch {
      throw new BadRequestException('图片地址无效')
    }
    if (target.protocol !== 'http:' || !['cp1.douguo.net', 'cp2.douguo.net'].includes(target.hostname)) {
      throw new BadRequestException('不支持的图片来源')
    }

    const response = await fetch(target)
    if (!response.ok) throw new InternalServerErrorException(`图片源响应 ${response.status}`)
    reply.header('Content-Type', response.headers.get('content-type') || 'image/jpeg')
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(Buffer.from(await response.arrayBuffer()))
  }
}
