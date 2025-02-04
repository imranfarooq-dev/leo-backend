import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { ListDB, ListOrder } from '@/types/list';
import { UpdateListDto } from '@/src/list/dto/update-list.dto';

@Injectable()
export class ListRespository {
  private readonly logger: Logger = new Logger(ListRespository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async createList(
    user_id: string,
    list_name: string,
    order: number,
    parent_list_id?: string,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Lists)
        .insert({ user_id, list_name, parent_list_id, order })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create list');
      }

      return data.id;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create list');
    }
  }

  async fetchListById(
    listId: string,
  ): Promise<ListDB | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Lists)
        .select('*')
        .eq('id', listId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch list by id');
    }
  }

  async fetchListByUserId(
    userId: string,
    attributes?: keyof List,
  ): Promise<List[] | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Lists)
        .select(attributes as '*')
        .eq('user_id', userId);

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch list by id');
    }
  }

  async fetchLastListInCurrentLevel(
    user_id: string,
    parent_list_id: string | null,
  ): Promise<List | null> {
    try {
      const query = this.supabase
        .from(Tables.Lists)
        .select('*')
        .eq('user_id', user_id)
        .order('order', { ascending: false })
        .limit(1);

      !!parent_list_id
        ? query.eq('parent_list_id', parent_list_id)
        : query.is('parent_list_id', null);

      const { data } = await query.maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch last list in level');
    }
  }

  async fetchListsByParentId(
    user_id: string,
    parent_list_id: string | null,
  ): Promise<List[] | null> {
    try {
      const query = this.supabase
        .from(Tables.Lists)
        .select('*')
        .eq('user_id', user_id);

      !!parent_list_id
        ? query.eq('parent_list_id', parent_list_id)
        : query.is('parent_list_id', null);

      const { data } = await query;

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to fetch last list in level');
    }
  }

  async updateList(
    listId: string,
    updateListDto: UpdateListDto,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(Tables.Lists)
        .update(updateListDto)
        .eq('id', listId)

      if (error) {
        throw new Error(error.message ?? 'Failed to update list');
      }
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update list');
    }
  }

  async updateListOrder(updates: { id: string; order: number }[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_list_orders', { updates })

      if (error) throw new Error(error.message);
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update list order');
      throw error;
    }
  }

  async deleteList(listId: string): Promise<ListOrder[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('delete_list_and_reorder', { p_list_id: listId })
        .select()

      if (error) {
        throw new Error(error.message ?? 'Failed to delete the list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete list');
    }
  }
}
