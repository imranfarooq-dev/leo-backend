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
} from '@nestjs/common';
import { DocumentService } from '@/src/document/document.service';
import { CreateDocumentDto } from '@/src/document/dto/create-document.dto';
import { DeleteDocumentDto } from '@/src/document/dto/delete-document.dto';
import { UpdateDocumentDto } from '@/src/document/dto/update-document.dto';
import { FetchDocumentDto } from '@/src/document/dto/fetch-document.dto';
import { FetchUserDocumentDto } from '@/src/document/dto/fetch-user-document.dto';
import { User, UserType } from '@/src/comon/decorators/user.decorator';
import { Document, DocumentDB } from '@/types/document';
import * as Sentry from '@sentry/node';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async fetch(@User() user: UserType, @Query() query: FetchUserDocumentDto) {
    try {
      const documents: {
        documents: Document[];
        currentPage: number;
        totalPages: number;
        totalDocuments: number;
      } = await this.documentService.fetchDocumentsByUser(user, query);

      return {
        statusCode: HttpStatus.OK,
        message: 'Items fetched',
        data: documents,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while fetching the items',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('full/:id')
  async fetchById(@User() user: UserType, @Param() params: FetchDocumentDto) {
    try {
      const document: Document = await this.documentService.fetchById(
        user,
        params,
        true,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Item fetched',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary/:id')
  async fetchSummaryById(
    @User() user: UserType,
    @Param() params: FetchDocumentDto,
  ) {
    try {
      const document: Document = await this.documentService.fetchById(
        user,
        params,
        false,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Item fetched',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async create(
    @User() user: UserType,
    @Body() createDocument: CreateDocumentDto,
  ) {
    try {
      const document: Document = await this.documentService.create(
        user,
        createDocument,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Item created',
        data: document,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while creating the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@User() user: UserType, @Param() params: DeleteDocumentDto) {
    try {
      await this.documentService.delete(user, params);

      return {
        statusCode: HttpStatus.OK,
        message: 'Item deleted',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while deleting the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(
    @User() user: UserType,
    @Param() params: { id: string },
    @Body() updateDocument: UpdateDocumentDto,
  ) {
    try {
      await this.documentService.update(user, params.id, updateDocument);

      return {
        statusCode: HttpStatus.OK,
        message: 'Item updated',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while updating the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
