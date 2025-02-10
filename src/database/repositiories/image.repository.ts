import { UpdateImageDto } from '@/src/image/dto/update-image.dto'
import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import {
  Image,
  ImageDB,
  ImageOrder,
  ImageSummary,
  InsertImage,
} from '@/types/image'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ImageRepository {
  private readonly logger: Logger = new Logger(ImageRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
    private readonly supabaseService: SupabaseService,
  ) { }

  async createImage(images: InsertImage[]): Promise<ImageSummary[]> {
    try {
      const { data: newImages, error } = await this.supabase
        .from(Tables.Images)
        .insert(images)
        .select("id, document_id, image_name, image_path, order");

      if (error) {
        throw new Error(error.message ?? 'Failed to create image');
      }
      const imageSummaries: ImageSummary[] = await Promise.all(newImages.map(async (image) => {
        const { image_path, ...rest } = image;
        return {
          ...rest,
          thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image_path),
        };
      }));

      return imageSummaries;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create image');
      throw error;
    }
  }

  async fetchImageDB(
    imageId: string,
  ): Promise<ImageDB | null> {
    try {
      const { data, error } = await this.supabase.from(Tables.Images).select('*').eq('id', imageId).maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch image by id');
      }

      if (!data) {
        return null;
      }

      return data
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch image by id');
      throw error;
    }
  }

  async fetchImageById(
    imageId: string,
  ): Promise<Image | null> {
    try {
      const data = this.supabase.rpc("get_image_by_id", { p_image_id: imageId }) as any;

      if (!data) {
        return null;
      }

      const image_url = await this.supabaseService.getPresignedUrl(data.image_path);
      const thumbnail_url = await this.supabaseService.getPresignedThumbnailUrl(data.image_path);

      const { image_path, ...dataWithoutPath } = data;
      return { ...dataWithoutPath, image_url, thumbnail_url };
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch image by id');
    }
  }

  async countImagesByUserId(userId: string) {
    try {
      const { data, error } = await this.supabase.rpc(
        "get_total_images_by_user_id",
        { p_user_id: userId },
      );

      if (error) {
        throw new Error(error.message ?? 'Failed to count images by user id');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to count images by user id');
      throw error;
    }
  }

  async fetchImagesByDocumentId2(
    documentId: string,
  ): Promise<ImageDB[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('*')
        .eq('document_id', documentId);

      if (error) {
        throw new Error('Failed to fetch images associated with document');
      }

      return data;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch images associated with document',
      );
      throw error;
    }
  }

  async userIdFromImageId(imageId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('document:document_id (user_id)')
        .eq('id', imageId)
        .maybeSingle();

      if (error) {
        throw new Error('Failed to fetch user id from image id');
      }

      if (!data) {
        return null;
      }

      const document = data.document as unknown as { user_id: string };
      return document.user_id;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch user id from image id');
      throw error;
    }
  }

  async fetchImageSummariesByDocumentId(
    documentId: string,
  ): Promise<ImageSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('id, document_id, image_name, order, image_path')
        .eq('document_id', documentId);

      if (error) {
        throw new Error('Failed to fetch images associated with document');
      }

      if (!data) {
        return [];
      }

      const imageSummaries: ImageSummary[] = await Promise.all(data.map(async (image) => {
        const { image_path, ...rest } = image;
        return { ...rest, thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image_path) };
      }));

      return imageSummaries;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch images associated with document',
      );
      throw error;
    }
  }

  async fetchImagePathsByDocumentId(
    documentId: string,
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('image_path')
        .eq('document_id', documentId);

      if (error) {
        throw new Error('Failed to fetch image paths associated with document');
      }

      if (!data) {
        return [];
      }

      return data.map((image) => image.image_path);
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch image paths associated with document',
      );
      throw error;
    }
  }

  async getLastImageOrder(documentId: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('order')
        .eq('document_id', documentId)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error(`Failed to fetch last image: ${error.message}`);
        throw error;
      }

      return data?.order ?? null;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch last document image');
      throw error;
    }
  }

  async fetchImagesByIds(imageIds: string[]): Promise<ImageDB[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select()
        .in('id', imageIds);

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch images by ids');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch images by ids');
      throw error;
    }
  }

  async updateImage(imageId: string, imageName: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .update({ image_name: imageName })
        .eq('id', imageId)

      if (error) {
        throw new Error(error.message ?? 'Failed to update image}');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update image');
      throw new Error(error.message ?? 'Failed to update image');
    }
  }

  async updateImageOrder(
    updates: { id: string; order: number }[],
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_image_orders', { updates })

      if (error) {
        throw new Error(error.message ?? 'Failed to update image order}');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update image order');
      throw error;
    }
  }

  async deleteImage(imageId: string): Promise<ImageOrder[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('delete_image_and_reorder', { p_image_id: imageId })
        .select()

      if (error) {
        throw new Error(error.message ?? 'Failed to delete the list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete image');
      throw error;
    }
  }
}
