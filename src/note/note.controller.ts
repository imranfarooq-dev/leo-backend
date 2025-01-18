import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { CreateUpdateNoteDto } from '@/src/note/dto/create-update-note.dto';
import { NoteService } from '@/src/note/note.service';

@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Put()
  async creatOrUpdate(@Body() createUpdateNote: CreateUpdateNoteDto) {
    try {
      const note = await this.noteService.createOrUpdate(createUpdateNote);

      return {
        statusCode: HttpStatus.OK,
        message: 'Note created/updated successfully',
        data: note,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating/updating the note record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
