import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NoteRepository } from '@/src/database/repositiories/note.repository';
import { CreateUpdateNoteDto } from '@/src/note/dto/create-update-note.dto';
import { ImageRepository } from '@/src/database/repositiories/image.repository';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';

@Injectable()
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly imageRepository: ImageRepository,
  ) { }

  async createOrUpdate(clerkUser: ClerkUser, imageId: string, createUpdateNote: CreateUpdateNoteDto): Promise<string> {
    try {
      const { notes_text } = createUpdateNote;

      const userId: string | null = await this.imageRepository.userIdFromImageId(imageId);

      if (!userId) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      if (userId !== clerkUser.id) {
        throw new HttpException('You are not authorized to update this image', HttpStatus.UNAUTHORIZED);
      }

      const noteExist = await this.noteRepository.fetchNoteByImageId(imageId);

      if (noteExist) {
        await this.noteRepository.updateNote(noteExist.id, {
          notes_text,
        });
        return noteExist.id;
      }

      return await this.noteRepository.createNote({ image_id: imageId, notes_text });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while creating/updating the transcription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
