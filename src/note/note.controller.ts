import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { CreateUpdateNoteDto } from '@/src/note/dto/create-update-note.dto';
import { NoteService } from '@/src/note/note.service';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { Param } from '@nestjs/common';

@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) { }

  @Put(":image_id")
  async createOrUpdate(@User() clerkUser: ClerkUser, @Param("image_id") imageId: string, @Body() createUpdateNote: CreateUpdateNoteDto) {
    try {
      const noteId: string = await this.noteService.createOrUpdate(clerkUser, imageId, createUpdateNote);
      return {
        statusCode: HttpStatus.OK,
        message: 'Note created/updated',
        data: noteId,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating/updating the note',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
