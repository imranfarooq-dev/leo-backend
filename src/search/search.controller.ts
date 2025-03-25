import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SearchDto } from '@/src/search/dto/search.dto';
import { SearchService } from '@/src/search/search.service';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as UserType } from '@clerk/express';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() { search_keyword }: SearchDto, @User() user: UserType) {
    try {
      const search = await this.searchService.searchDocumentAndList(
        search_keyword,
        user.id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Searched documents and lists',
        search,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while searching',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
