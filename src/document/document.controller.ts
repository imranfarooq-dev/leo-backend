import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentService } from '@/src/document/document.service';
import { CreateDocumentDto } from '@/src/document/dto/create-document.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DeleteDocumentDto } from '@/src/document/dto/delete-document.dto';
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto';
import { FetchDocumentDto } from '@/src/document/dto/fetch-document.dto';
import { FetchUserDocumentDto } from '@/src/document/dto/fetch-user-document.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as UserType } from '@clerk/clerk-sdk-node';
import { MAX_IMAGE_ALLOWED } from '@/src/shared/constant';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async fetch(@User() user: UserType, @Query() query: FetchUserDocumentDto) {
    try {
      const documents = await this.documentService.fetchDocumentsByUser(
        user,
        query,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Documents fetched successfully',
        data: documents,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the document record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async fetchById(@User() user: UserType, @Param() params: FetchDocumentDto) {
    try {
      const document = await this.documentService.fetchById(user, params);

      return {
        statusCode: HttpStatus.OK,
        message: 'Document fetched successfully',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the document record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_IMAGE_ALLOWED))
  async create(
    @User() user: UserType,
    @Body() createDocument: CreateDocumentDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    try {
      const document = await this.documentService.create(
        user,
        createDocument,
        files,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Document created successfully',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while creating the document record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param() params: DeleteDocumentDto) {
    try {
      const document = await this.documentService.delete(params);

      return {
        statusCode: HttpStatus.OK,
        message: 'Document deleted successfully',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while deleting the document record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param() params: { id: number },
    @Body() updateDocument: UpdateDocumentDto,
  ) {
    try {
      const document = await this.documentService.update(
        params.id,
        updateDocument,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Document Updated successfully',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while updating the document record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
