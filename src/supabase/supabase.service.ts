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
  ) {}

  async getPresignedUrls(
    filenames: (string | null)[],
    thumbnail: boolean = false,
    expiresIn: number = 3600,
  ): Promise<(string | null)[]> {
    try {
      // Filter out null filenames and keep track of their positions
      const validFilenamesWithIndex = filenames
        .map((filename, index) => ({ filename, index }))
        .filter((item) => item.filename !== null);

      // If no valid filenames, return array of nulls with same length
      if (validFilenamesWithIndex.length === 0) {
        return filenames.map(() => null);
      }

      // Create paths only for valid filenames
      const paths = validFilenamesWithIndex.map(({ filename }) =>
        thumbnail
          ? `${ThumbnailStoragePath}/${filename}`
          : `${ImageStoragePath}/${filename}`,
      );

      const { data, error } = await this.supabase.storage
        .from(SupabaseStorageId)
        .createSignedUrls(paths, expiresIn);

      if (error) throw error;

      // Initialize result array with nulls
      const result = Array(filenames.length).fill(null);

      // Place signed URLs in their correct positions
      validFilenamesWithIndex.forEach(({ index }, i) => {
        result[index] = data[i].signedUrl;
      });

      return result;
    } catch (error) {
      console.error(`Failed to generate presigned URL: ${error.message}`);
      return filenames.map(() => null);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<UploadedImage[]> {
    try {
      const batchSize = 10;
      const batches = chunk(files, batchSize);
      let allUploadedImages: UploadedImage[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const uploadPromises = batch.map(async (file) => {
          const fileExtension = file.originalname.split('.').pop() || '';
          let filename = `${uuid()}.${fileExtension}`;
          let filepath = `${ImageStoragePath}/${filename}`;
          let thumbnailPath = `${ThumbnailStoragePath}/${filename}`;

          // Convert HEIC/HEIF to JPEG if needed
          let processedBuffer = file.buffer;
          let processedMimeType = file.mimetype;

          if (
            file.mimetype === 'image/heic' ||
            file.mimetype === 'image/heif'
          ) {
            processedBuffer = await sharp(file.buffer)
              .rotate() // auto-rotate based on EXIF data
              .jpeg({ quality: 100 }) // lossless conversion
              .toBuffer();
            processedMimeType = 'image/jpeg';
            // Update filename to use .jpg extension
            const newFilename = `${uuid()}.jpg`;
            filename = newFilename;
            filepath = `${ImageStoragePath}/${filename}`;
            thumbnailPath = `${ThumbnailStoragePath}/${filename}`;
          }

          // Generate thumbnail buffer using sharp
          const thumbnailBuffer = await sharp(processedBuffer)
            .rotate()
            .resize(96, 96, {
              fit: 'cover',
              position: 'center',
            })
            .toBuffer();

          // Upload main image and thumbnail in parallel
          const [mainUpload, thumbnailUpload] = await Promise.all([
            this.supabase.storage
              .from(SupabaseStorageId)
              .upload(filepath, processedBuffer, {
                contentType: processedMimeType,
              }),
            this.supabase.storage
              .from(SupabaseStorageId)
              .upload(thumbnailPath, thumbnailBuffer, {
                contentType: processedMimeType,
              }),
          ]);

          if (mainUpload.error) {
            throw new Error(
              `Failed to upload ${file.originalname}: ${mainUpload.error.message}`,
            );
          }

          if (thumbnailUpload.error) {
            throw new Error(
              `Failed to upload thumbnail: ${thumbnailUpload.error.message}`,
            );
          }

          return {
            id: mainUpload.data.id,
            originalFilename: file.originalname,
            path: mainUpload.data.path,
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
