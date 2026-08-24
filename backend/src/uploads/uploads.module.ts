import { Module } from '@nestjs/common'
import { UploadsController } from './uploads.controller'
import { ObjectStorageService } from './object-storage.service'

@Module({ controllers: [UploadsController], providers: [ObjectStorageService] })
export class UploadsModule {}
