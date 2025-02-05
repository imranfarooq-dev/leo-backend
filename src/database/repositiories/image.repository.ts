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

  async createImage(images: InsertImage[]): Promise<Image[]> {
    try {
      // Insert all new images
      const { data: newImages, error } = await this.supabase
        .from(Tables.Images)
        .insert(images)
        .select();

      if (error) throw error;

      const imagesWithUrls = await Promise.all(newImages.map(async (image) => ({
        ...image,
        thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image.image_path),
      })));

      return imagesWithUrls;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create image record');
      throw error;
    }
  }

  async fetchImageById(
    imageId: string,
  ): Promise<Image | null> {
    try {
      const data = this.supabase.rpc("get_image_by_id", { image_id: imageId }) as any;

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
        { user_id: userId },
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

  async fetchLastDocumentImage(documentId: string): Promise<ImageWithPresignedUrl | null> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select()
        .eq('document_id', documentId)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error(`Failed to fetch last image: ${error.message}`);
        throw error;
      }

      if (data) {
        const imagesWithUrls = await this.addPresignedUrlsToImages([data]);
        return imagesWithUrls[0];
      }

      return null;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch last document image');
      throw error;
    }
  }

  async fetchImagesByIds(imageIds: string[]) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .select()
        .in('id', imageIds);

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch images by ids');
      }

      if (data) {
        const imagesWithUrls = await this.addPresignedUrlsToImages(data);
        return imagesWithUrls;
      }

      return null;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch images by ids');
      throw error;
    }
  }

  async updateImage(updateImage: UpdateImageDto) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .update({ image_name: updateImage.image_name })
        .eq('id', updateImage.image_id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to update image record}');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update image record');
      throw new Error(error.message ?? 'Failed to update image record');
    }
  }

  async updateImageOrder(
    imageOrder: {
      id: string;
      document_id: string;  // TODO: Remove all this unnecesary fields from here and elsewhere
      image_name: string;
      image_path: string;
      order: number;
    }[],
  ): Promise<Image[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .upsert(imageOrder, {  // TODO: This should probably be an update? Check here and elsewhere
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select('*');

      if (error) {
        throw new Error(error.message ?? 'Failed to update image order}');
      }

      return data;
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
      this.logger.error(error.message ?? 'Failed to delete image record');
      throw error;
    }
  }
}
