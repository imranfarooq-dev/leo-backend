import { User } from '@/src/comon/decorators/user.decorator'
import { FetchUserListDocumentDto } from '@/src/lists-documents/dto/fetch-user-list-document.dto'
import { UpdateListDocumentDto } from '@/src/lists-documents/dto/update-list-document.dto'
import { ListsDocumentsService } from '@/src/lists-documents/lists-documents.service'
import { DocumentSummary } from '@/types/document'
import { User as UserType } from '@clerk/clerk-sdk-node'
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common'

@Controller('lists-documents')
export class ListsDocumentsController {
  constructor(private listsDocumentsService: ListsDocumentsService) { }

  @Put(':document_id')
  async update(@User() user: UserType, @Param('document_id') documentId: string, @Body() updateListDocumentDto: UpdateListDocumentDto) {
    try {
      await this.listsDocumentsService.update(
        documentId,
        updateListDocumentDto,
        user,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Document added/removed from list successfully',
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

  @Get(':list_id')
  async fetchDocumentsByListID(
    @User() user: UserType,
    @Param('list_id') listId: string,
    @Query() query: FetchUserListDocumentDto,
  ) {
    try {
      const documents: { documents: DocumentSummary[]; currentPage: number; totalPages: number; totalDocuments: number } =
        await this.listsDocumentsService.fetchUserDocumentsByList(listId, user, query);

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

  @Get('lists/:document_id')
  async fetchDocumentLists(@Param('document_id') documentId: string) {
    try {
      const lists = await this.listsDocumentsService.fetchDocumentLists(
        documentId,
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
