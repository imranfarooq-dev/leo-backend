import { Inject, Injectable, Logger } from '@nestjs/common';
import { DBFunctions, Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Image,
  ImageWithPresignedUrl,
  ImageWithTranscriptionAndNote,
  InsertImage,
} from '@/types/image';
import { UpdateImageDto } from '@/src/image/dto/update-image.dto';
import { SupabaseService } from '@/src/supabase/supabase.service';

@Injectable()
export class ImageRepository {
  private readonly logger: Logger = new Logger(ImageRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
    private readonly supabaseService: SupabaseService,
  ) { }

  private async addPresignedUrlsToImages(images: Image[]): Promise<ImageWithPresignedUrl[]> {
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        image_url: await this.supabaseService.getPresignedUrl(image.image_path),
        thumbnail_url: await this.supabaseService.getPresignedThumbnailUrl(image.image_path),
      })),
    );
    return imagesWithUrls;
  }

  async createImage(images: InsertImage[]): Promise<ImageWithPresignedUrl[]> {
    try {
      // Find last image of the document if exists
      const { data: lastImage } = await this.supabase
        .from(Tables.Images)
        .select('id')
        .eq('document_id', images[0].document_id)
        .is('next_image_id', null)
        .single();

      // Insert all new images
      const { data: newImages, error } = await this.supabase
        .from(Tables.Images)
        .insert(images)
        .select();

      if (error) throw error;

      // Update the links between new images
      for (let i = 0; i < newImages.length - 1; i++) {
        await this.supabase
          .from(Tables.Images)
          .update({ next_image_id: newImages[i + 1].id })
          .eq('id', newImages[i].id);
      }

      // If there was an existing last image, point it to the first new image
      if (lastImage) {
        await this.supabase
          .from(Tables.Images)
          .update({ next_image_id: newImages[0].id })
          .eq('id', lastImage.id);
      }

      const imagesWithUrls = await this.addPresignedUrlsToImages(newImages);
      return imagesWithUrls;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create image record');
      throw error;
    }
  }

  async fetchImageById(
    imageId: string,
    includeTranscriptionAndNotes: boolean = false,
    attributes?: keyof Image,
  ): Promise<ImageWithTranscriptionAndNote | ImageWithPresignedUrl | null> {
    try {
      let selectQuery = `${attributes ?? '*'}`;

      if (includeTranscriptionAndNotes) {
        selectQuery += `,
        notes (
          id,
          notes_text,
          image_id,
          created_at,
          updated_at
        ),
        transcriptions (
          id,
          current_transcription_text,
          ai_transcription_text,
          transcription_status,
          image_id,
          created_at,
          updated_at
        )`;
      }

      const { data } = await this.supabase
        .from(Tables.Images)
        .select(selectQuery as '*')
        .eq('id', imageId)
        .maybeSingle();

      if (data) {
        const imagesWithUrls = await this.addPresignedUrlsToImages([data]);
        return imagesWithUrls[0];
      }

      return null;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch image by id');
    }
  }

  async fetchImagesByDocumentIds(documentIds: string[]) {
    try {
      const { data, error } = await this.supabase.rpc(
        DBFunctions.getOrderedImagesByDocumentIds,
        { document_ids: documentIds },
      );

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch images by document');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch images by document');
      throw error;
    }
  }

  async fetchImagesByDocumentId(
    documentId: string,
    includeTranscriptionAndNotes: boolean = false,
  ): Promise<ImageWithTranscriptionAndNote[] | ImageWithPresignedUrl[] | null> {
    try {
      const { data, error } = await this.supabase.rpc(
        DBFunctions.getOrderedImagesByDocumentId,
        {
          document_id_param: documentId,
          include_relations: includeTranscriptionAndNotes,
        },
      );

      if (error) {
        throw new Error('Failed to fetch images associated with document');
      }

      if (data) {
        const imagesWithUrls = await this.addPresignedUrlsToImages(data);
        return imagesWithUrls;
      }

      return null;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to fetch images associated with document',
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
        .is('next_image_id', null)
        .order('created_at', { ascending: false })
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
      document_id: string;
      image_name: string;
      image_path: string;
      next_image_id: string | null;
    }[],
  ): Promise<Image[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .upsert(imageOrder, {
          onConflict: 'id', // Specify which column determines if we update or insert
          ignoreDuplicates: false, // We want to update existing records
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

  async updateImageNextId(imageId: string, nextImageId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .update({ next_image_id: nextImageId })
        .eq('id', imageId);

      if (error) {
        throw new Error(`Failed to update image chain: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error(
        error.message ?? 'Failed to Update image next_image_id record',
      );
      throw error;
    }
  }

  async deleteImage(imageId: string): Promise<Image> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Images)
        .delete()
        .eq('id', imageId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to delete image record');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete image record');
      throw error;
    }
  }
}
