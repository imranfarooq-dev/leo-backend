import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Put,
  Query,
} from '@nestjs/common';
import { ListsDocumentsService } from '@/src/lists-documents/lists-documents.service';
import { UpdateListDocumentDto } from '@/src/lists-documents/dto/update-list-document.dto';
import { FetchUserListDocumentDto } from '@/src/lists-documents/dto/fetch-user-list-document.dto';
import { FetchDocumentListDto } from '@/src/lists-documents/dto/fetch-document-lists.dto';

@Controller('lists-documents')
export class ListsDocumentsController {
  constructor(private listsDocumentsService: ListsDocumentsService) {}

  @Put()
  async update(@Body() updateListDocumentDto: UpdateListDocumentDto) {
    try {
      const link = await this.listsDocumentsService.update(
        updateListDocumentDto,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Document added/removed from list successfully',
        link,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while adding/removing document from list',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async fetchDocumentsByListID(@Query() query: FetchUserListDocumentDto) {
    try {
      const documents =
        await this.listsDocumentsService.fetchUserDocumentsByList(query);

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

  @Get('lists')
  async fetchDocumentLists(@Query() query: FetchDocumentListDto) {
    try {
      const lists = await this.listsDocumentsService.fetchDocumentLists(
        query.document_id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Document Lists fetched successfully',
        lists,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the document lists record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
