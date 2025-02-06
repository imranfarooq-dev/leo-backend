import { Inject, Logger } from '@nestjs/common';
import { Provides, Tables } from '@/src/shared/constant';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@/types/user';
import { CreateUserDto } from '@/src/user/dto/create-user.dto';

export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @Inject(Provides.Supabase) private readonly supabase: SupabaseClient,
  ) { }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Users)
        .insert(createUserDto)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to create user.');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to create user');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const { data } = await this.supabase
        .from(Tables.Users)
        .select()
        .eq('id', userId)
        .maybeSingle();

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to get user');
    }
  }

  async updateUser(userId: string, updateUser: Partial<User>) {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Users)
        .update(updateUser)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message ?? 'Failed to update user.');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to update user.');
    }
  }

  async deleteUser(userId: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from(Tables.Users)
        .delete()
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to delete user.');
      }

      return data;
    } catch (error) {
      this.logger.error(error.message ?? 'Failed to delete user.');
    }
  }
}
