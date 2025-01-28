import { Inject, Injectable } from '@nestjs/common';
import {
  ImageStoragePath,
  Provides,
  SupabaseStorageId,
} from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { FileBufferDownloadResult, UploadedImage } from '@/types/image';
import { chunk } from 'lodash';


@Injectable()
export class SupabaseService {
  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async getPresignedUrl(path: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .createSignedUrl(path, 3600); // 1 hour expiration

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  async getPresignedThumbnailUrl(path: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .createSignedUrl(path, 3600, { // 1 hour expiration
          transform: {
            width: 96,
            height: 96,
            resize: 'cover'
          }
        });

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
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
          const filepath = `${ImageStoragePath}/${uuid()}.${fileExtension}`;

          const { data, error } = await this.supabase.storage
            .from(SupabaseStorageId)
            .upload(filepath, file.buffer, { contentType: file.mimetype });

          if (error) {
            throw new Error(
              `Failed to upload ${file.originalname}: ${error.message}`,
            );
          }

          const { data: signedUrlData, error: signedUrlError } =
            await this.supabase.storage
              .from(SupabaseStorageId)
              .createSignedUrl(data.path, 3600);

          if (signedUrlError) throw signedUrlError;

          return {
            id: data.id,
            publicUrl: signedUrlData.signedUrl,
            fileName: file.originalname,
            path: data.path,
            fullPath: data.fullPath,
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
