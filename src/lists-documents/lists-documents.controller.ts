import { User } from '@/src/comon/decorators/user.decorator'
import { FetchUserListDocumentDto } from '@/src/lists-documents/dto/fetch-user-list-document.dto'
import { UpdateListDocumentDto } from '@/src/lists-documents/dto/update-list-document.dto'
import { ListsDocumentsService } from '@/src/lists-documents/lists-documents.service'
import { DocumentWithImageSummaries } from '@/types/document'
import { ListSummary } from '@/types/list'
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
        message: 'Item added/removed from list',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while adding/removing item from list',
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
      const documents: { documents: DocumentWithImageSummaries[]; currentPage: number; totalPages: number; totalDocuments: number } =
        await this.listsDocumentsService.fetchUserDocumentsByList(listId, user, query);

      return {
        statusCode: HttpStatus.OK,
        message: 'Items fetched',
        data: documents,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the item',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('lists/:document_id')
  async fetchDocumentLists(@User() user: UserType, @Param('document_id') documentId: string) {
    try {
      const lists: ListSummary[] = await this.listsDocumentsService.fetchDocumentLists(
        user,
        documentId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Item lists fetched',
        lists,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the item lists',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
