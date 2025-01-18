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
} from '@nestjs/common';
import { ListService } from '@/src/list/list.service';
import { CreateListDto } from '@/src/list/dto/create-list.dto';
import { User } from '@/src/comon/decorators/user.decorator';
import { User as UserType } from '@clerk/clerk-sdk-node';
import { UpdateListDto } from '@/src/list/dto/update-list.dto';
import { List, ListTree } from '@/types/list';
import { UpdateOrderListDto } from '@/src/list/dto/update-order-list.dto';

@Controller('list')
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post()
  async create(@Body() createListDto: CreateListDto, @User() user: UserType) {
    try {
      const list: List = await this.listService.create(createListDto, user.id);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'List created successfully',
        list,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while creating the list record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('update-order')
  async updateListOrder(
    @Body() { list_id, new_index, old_index }: UpdateOrderListDto,
    @User() user: UserType,
  ) {
    try {
      const lists = await this.listService.updateListOrder(
        list_id,
        new_index,
        old_index,
        user.id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'List order updated successfully',
        lists,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while updating the list order',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async fetch(@User() user: UserType) {
    try {
      const list: ListTree[] = await this.listService.fetch(user.id);

      return {
        statusCode: HttpStatus.OK,
        message: 'List fetched successfully',
        list,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ??
            'An error occurred while fetching the user list record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param() params: { id: number },
    @Body() updateListDto: UpdateListDto,
    @User() user: UserType,
  ) {
    try {
      const list: List = await this.listService.update(
        updateListDto,
        user.id,
        params.id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'List updated successfully',
        list,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while updating the list record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param() params: { id: string }, @User() user: UserType) {
    try {
      const list: List = await this.listService.delete(
        parseInt(params.id),
        user.id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'List deleted successfully',
        list,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error.message ?? 'An error occurred while deleting the list record',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
