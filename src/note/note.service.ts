import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NoteRepository } from '@/src/database/repositiories/note.repository';
import { CreateUpdateNoteDto } from '@/src/note/dto/create-update-note.dto';
import { ImageRepository } from '@/src/database/repositiories/image.repository';

@Injectable()
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly imageRepository: ImageRepository,
  ) {}

  async createOrUpdate(createUpdateNote: CreateUpdateNoteDto) {
    try {
      const { image_id, notes_text } = createUpdateNote;

      const imageExist = await this.imageRepository.fetchImageById(image_id);

      if (!imageExist) {
        throw new HttpException('Image does not exist', HttpStatus.NOT_FOUND);
      }

      const noteExist = await this.noteRepository.fetchNoteByImageId(image_id);

      if (noteExist) {
        return await this.noteRepository.updateNote(noteExist.id, {
          notes_text,
        });
      }

      return await this.noteRepository.createNote({ image_id, notes_text });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while creating/updating the transcription record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
