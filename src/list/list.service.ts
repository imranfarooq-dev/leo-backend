import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateListDto } from '@/src/list/dto/create-list.dto';
import { ListRespository } from '@/src/database/repositiories/list.respository';
import { UpdateListDto } from '@/src/list/dto/update-list.dto';
import { List, ListOrder, ListTree } from '@/types/list';
import { constructListTree } from '@/src/utils';

@Injectable()
export class ListService {
  constructor(private readonly listRepository: ListRespository) { }

  async create(createListDto: CreateListDto, user_id: string): Promise<string> {
    try {
      const { list_name, parent_list_id } = createListDto;

      const lastListChild =
        await this.listRepository.fetchLastListInCurrentLevel(
          user_id,
          parent_list_id,
        );

      const newOrder = lastListChild ? lastListChild.order + 1 : 1;

      // Create new list
      const newListId = await this.listRepository.createList(
        user_id,
        list_name,
        newOrder,
        parent_list_id,
      );

      return newListId;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occured while creating list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetch(user_id: string): Promise<ListTree[]> {
    try {
      const lists: List[] =
        await this.listRepository.fetchListByUserId(user_id);

      return constructListTree(lists);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while fetching the lists',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    updateListDto: UpdateListDto,
    user_id: string,
    list_id: string,
  ): Promise<void> {
    try {
      const listExist = await this.listRepository.fetchListById(list_id);

      if (!listExist) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      if (listExist.user_id !== user_id) {
        throw new HttpException(
          'You do not have permission to modify this list.',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.listRepository.updateList(list_id, updateListDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while updating the list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateListOrder(
    updates: { id: string; order: number }[],
    user_id: string,
  ) {
    try {
      if (!updates.length) {
        throw new HttpException('No lists found to update order.', HttpStatus.BAD_REQUEST);
      }

      const list = await this.listRepository.fetchListById(updates[0].id);

      if (!list) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      const lists = await this.listRepository.fetchListsByParentId(
        user_id,
        list.parent_list_id,
      );

      if (!lists.length) {
        throw new HttpException('No lists found to update order.', HttpStatus.BAD_REQUEST);
      }

      // Check that listss IDs and the list IDs are equivalent.
      if (lists.some(list => !updates.some(update => update.id === list.id))) {
        throw new HttpException('Lists do not have consistent parents', HttpStatus.BAD_REQUEST);
      }

      // Check that the list IDs are unique.
      if (new Set(updates.map(update => update.id)).size !== updates.length) {
        throw new HttpException('List IDs must be unique', HttpStatus.BAD_REQUEST);
      }

      // Validate order values
      const sortedOrders = [...updates.map(update => update.order)].sort((a, b) => a - b);
      const expectedSequence = Array.from({ length: updates.length }, (_, i) => i + 1);

      if (!sortedOrders.every((order, index) => order === expectedSequence[index])) {
        throw new HttpException(
          'Order values must form a complete 1-indexed sequence',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.listRepository.updateListOrder(updates);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while updating the list order',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(list_id: string, userId: string): Promise<ListOrder[]> {
    try {
      const listToDelete = await this.listRepository.fetchListById(list_id);

      if (!listToDelete) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      if (listToDelete.user_id !== userId) {
        throw new HttpException(
          'You do not have permission to delete this list.',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.listRepository.deleteList(list_id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while deleting the list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
