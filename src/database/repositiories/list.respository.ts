import { Inject, Injectable, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { List } from '@/types/list';
import { UpdateListDto } from '@/src/list/dto/update-list.dto';

@Injectable()
export class ListRespository {
  private readonly logger: Logger = new Logger(ListRespository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) {}

  async createList(
    user_id: string,
    list_name: string,
    parent_list_id?: number,
  ): Promise<List> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Lists)
        .insert({ user_id, list_name, parent_list_id })
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to create list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create list');
    }
  }

  async fetchListById(
    listId: number,
    attributes?: keyof List,
  ): Promise<List | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Lists)
        .select(attributes as '*')
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
    parent_list_id: number | null,
  ): Promise<List | null> {
    try {
      const query = this.supabase
        .from(Tables.Lists)
        .select('*')
        .eq('user_id', user_id)
        .is('next_list_id', null);

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
    parent_list_id: number | null,
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
    listId: number,
    updateListDto: UpdateListDto,
  ): Promise<List> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Lists)
        .update(updateListDto)
        .eq('id', listId)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to update list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update list');
    }
  }

  async updateListOrder(updates: Partial<List>[]): Promise<List[]> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Lists)
        .upsert(updates, {
          onConflict: 'id', // Specify which column determines if we update or insert
          ignoreDuplicates: false, // We want to update existing records
        })
        .select();

      if (error) throw new Error(error.message);

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update list order');
      throw error;
    }
  }

  async deleteList(listId: number): Promise<List> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Lists)
        .delete()
        .eq('id', listId)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to delete the list');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete list');
    }
  }
}
