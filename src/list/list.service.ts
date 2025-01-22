import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateListDto } from '@/src/list/dto/create-list.dto';
import { ListRespository } from '@/src/database/repositiories/list.respository';
import { UpdateListDto } from '@/src/list/dto/update-list.dto';
import { List, ListTree } from '@/types/list';
import { constructListTree, sortListsByNextId } from '@/src/utils';

@Injectable()
export class ListService {
  constructor(private readonly listRepository: ListRespository) { }

  async create(createListDto: CreateListDto, user_id: string): Promise<List> {
    try {
      const { list_name, parent_list_id } = createListDto;

      // First, find the last list in the current level to set next_list_id
      const lastListChild =
        await this.listRepository.fetchLastListInCurrentLevel(
          user_id,
          parent_list_id,
        );

      // Create new list
      const newList = await this.listRepository.createList(
        user_id,
        list_name,
        parent_list_id,
      );

      // If there was a previous last list, update its next_list_id
      if (lastListChild) {
        await this.listRepository.updateListOrder([
          {
            ...lastListChild,
            next_list_id: newList.id,
          },
        ]);
      }

      return newList;
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
  ): Promise<List> {
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

      return await this.listRepository.updateList(list_id, updateListDto);
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
    list_id: string | null,
    new_index: number,
    old_index: number,
    user_id: string,
  ) {
    try {
      const list = await this.listRepository.fetchListById(list_id);

      if (!list) {
        throw new HttpException('List does not exist', HttpStatus.NOT_FOUND);
      }

      const lists = await this.listRepository.fetchListsByParentId(
        user_id,
        list.parent_list_id,
      );

      if (!lists.length) {
        throw new HttpException(
          'No lists found to update order.',
          HttpStatus.NOT_FOUND,
        );
      }

      const sortedLists = sortListsByNextId(lists);

      // Return early if indices are invalid or no change is needed
      if (
        old_index === new_index ||
        old_index < 0 ||
        new_index < 0 ||
        old_index >= lists.length ||
        new_index >= lists.length
      ) {
        return sortedLists;
      }

      const reorderedLists = [...sortedLists];
      const [movedItem] = reorderedLists.splice(old_index, 1);
      reorderedLists.splice(new_index, 0, movedItem);

      const updates = reorderedLists.map((list, index) => ({
        ...list,
        next_list_id:
          index === reorderedLists.length - 1
            ? null
            : reorderedLists[index + 1].id,
      }));

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

  async delete(list_id: string, userId: string) {
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

      // Fetch sibling lists to update next_list_id if needed
      const lists = await this.listRepository.fetchListsByParentId(
        userId,
        listToDelete.parent_list_id,
      );

      // Find the previous sibling
      const previousSibling = lists.find(
        (sibling) => sibling.next_list_id === list_id,
      );

      if (previousSibling) {
        // Update previous sibling's next_list_id to skip the deleted list
        await this.listRepository.updateListOrder([
          { ...previousSibling, next_list_id: listToDelete.next_list_id },
        ]);
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
