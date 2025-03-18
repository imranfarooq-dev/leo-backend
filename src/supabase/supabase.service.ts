import { Inject, Injectable } from '@nestjs/common';
import {
  ImageStoragePath,
  Provides,
  SupabaseStorageId,
  ThumbnailStoragePath,
} from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { FileBufferDownloadResult, UploadedImage } from '@/types/image';
import { chunk } from 'lodash';
import * as sharp from 'sharp';


@Injectable()
export class SupabaseService {
  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async getPresignedUrls(filenames: string[], thumbnail: boolean = false, expiresIn: number = 3600): Promise<string[]> {
    try {
      const paths = filenames.map((filename) => thumbnail ? `${ThumbnailStoragePath}/${filename}` : `${ImageStoragePath}/${filename}`);
      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .createSignedUrls(paths, expiresIn);

      if (error) throw error;
      return data.map((item) => item.signedUrl);
    } catch (error) {
      console.error(`Failed to generate presigned URL: ${error.message}`);
      return null;
    }
  }

  async uploadFiles(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<UploadedImage[]> {
    try {
      const batchSize = 10;
      const batches = chunk(files, batchSize);
      let allUploadedImages: UploadedImage[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const uploadPromises = batch.map(async (file) => {
          const fileExtension = file.originalname.split('.').pop() || '';
          const filename = `${uuid()}.${fileExtension}`;
          const filepath = `${ImageStoragePath}/${filename}`;
          const thumbnailPath = `${ThumbnailStoragePath}/${filename}`;

          const { data, error } = await this.supabase.storage
            .from(SupabaseStorageId)
            .upload(filepath, file.buffer, { contentType: file.mimetype });

          if (error) {
            throw new Error(
              `Failed to upload ${file.originalname}: ${error.message}`,
            );
          }

          // Generate thumbnail buffer using sharp
          const thumbnailBuffer = await sharp(file.buffer)
            .rotate() // auto-rotate based on EXIF data
            .resize(96, 96, {
              fit: 'cover',
              position: 'center'
            })
            .toBuffer();

          // Upload the thumbnail
          const { error: thumbnailError } = await this.supabase.storage
            .from(SupabaseStorageId)
            .upload(thumbnailPath, thumbnailBuffer, {
              contentType: file.mimetype,
            });

          if (thumbnailError) {
            throw new Error(`Failed to upload thumbnail: ${thumbnailError.message}`);
          }

          return {
            id: data.id,
            originalFilename: file.originalname,
            path: data.path,
            filename: filename,
          };
        });

        const batchResults = await Promise.all(uploadPromises);
        allUploadedImages = [...allUploadedImages, ...batchResults];
      }

      return allUploadedImages;
    } catch (error) {
      throw new Error(`File upload error: ${error.message}`);
    }
  }

  async downloadFileBufferFromSupabase(
    filePath: string,
    fileName: string,
  ): Promise<FileBufferDownloadResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .download(filePath);

      if (!!error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      return {
        buffer: buffer,
        fileType: data.type,
      };
    } catch (error) {
      return {
        buffer: null,
        fileType: null,
        error: `Failed to download file ${fileName}: ${error.message}`,
      };
    }
  }

  async deleteFiles(paths: string[]) {
    try {
      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .remove(paths);

      if (error) {
        throw new Error(`Failed to delete file: ${paths}`);
      }

      return data;
    } catch (error) {
      throw new Error(`File delete error: ${error.message}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      let hasMoreFiles: boolean = true;
      const batchSize: number = 2;

      while (hasMoreFiles) {
        const { data, error } = await this.supabase.storage
          .from(SupabaseStorageId)
          .list(folderPath, { limit: batchSize });

        if (error) {
          throw new Error(error.message ?? 'Failed to list files');
        }

        if (!data || !data.length) {
          hasMoreFiles = false;
          break;
        }

        const filePaths: string[] = data.map(
          (file) => `${folderPath}/${file.name}`,
        );

        await this.deleteFiles(filePaths);
      }
    } catch (error) {
      throw new Error(`Failed to delete folder: ${folderPath}`);
    }
  }
}
