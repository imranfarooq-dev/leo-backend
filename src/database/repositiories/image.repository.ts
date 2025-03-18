import { Provides, Tables } from '@/src/shared/constant'
import { SupabaseService } from '@/src/supabase/supabase.service'
import {
  Image,
  BaseImage,
  ImageDB,
  ImageOrder,
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

  async createImage(images: InsertImage[]): Promise<BaseImage[]> {
    try {
      const { data: newImages, error } = await this.supabase
        .from(Tables.Images)
        .insert(images)
        .select("id");

      if (error) {
        throw new Error(error.message ?? 'Failed to create image(s)');
      }

      if (!newImages) {
        return [];
      }

      const { data: imagesData, error: imageSummariesError } = await this.supabase.rpc('get_images_by_ids', { p_image_ids: newImages.map((image) => image.id) });

      if (imageSummariesError) {
        throw new Error(imageSummariesError.message ?? 'Failed to create image(s)');
      }

      const returnImages: Image[] = await Promise.all(imagesData.map(async (image) => {
        const { filename, ...rest } = image;
        return {
          ...rest,
          thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(filename),
        };
      }));

      return returnImages;
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
      const { data } = await this.supabase.rpc("get_images_by_ids", { p_image_ids: [imageId] });

      if (!data) {
        return null;
      }

      const image = data[0];
      const image_url = await this.supabaseService.getPresignedUrl(image.filename);
      const thumbnail_url = await this.supabaseService.getPresignedThumbnailUrl(image.filename);

      const { filename, ...dataWithoutPath } = data;
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

  async userIdsFromImageIds(imageIds: string[]): Promise<string[]> {
    try {
      if (imageIds.length === 0) {
        return [];
      }

      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('document:document_id (user_id)')
        .in('id', imageIds);

      if (error) {
        this.logger.error(error.message ?? 'Failed to fetch user id from image id');
        throw new Error('Failed to fetch user id from image id'); // TODO: Here and elsewhere, actually propagate the error to the FE
      }

      if (!data) {
        return null;
      }

      const documents = data as unknown as { document: { user_id: string } }[];
      return documents.map((document) => document.document.user_id);
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch user id from image id');
      throw error;
    }
  }

  async fetchImagesDBByDocumentId(
    documentId: string,
  ): Promise<ImageDB[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('*')
        .eq('document_id', documentId);

      if (error) {
        throw new Error('Failed to fetch images associated with item');
      }

      if (!data) {
        return [];
      }

      return data;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch images associated with item',
      );
      throw error;
    }
  }

  async fetchImageFilenamesByDocumentId(
    documentId: string,
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select('filename')
        .eq('document_id', documentId);

      if (error) {
        throw new Error('Failed to fetch filenames associated with item');
      }

      if (!data) {
        return [];
      }

      return data.map((image) => image.filename);
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch filenames associated with item',
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
