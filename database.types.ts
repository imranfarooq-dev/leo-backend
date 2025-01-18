export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      credits: {
        Row: {
          created_at: string | null;
          id: number;
          image_limits: number | null;
          lifetime_credits: number | null;
          monthly_credits: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          image_limits?: number | null;
          lifetime_credits?: number | null;
          monthly_credits?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          image_limits?: number | null;
          lifetime_credits?: number | null;
          monthly_credits?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          archive: string | null;
          box: string | null;
          collection: string | null;
          created_at: string | null;
          creator_name: string | null;
          date: string | null;
          document_name: string;
          folder: string | null;
          id: number;
          identifier: string | null;
          rights: string | null;
          type: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          archive?: string | null;
          box?: string | null;
          collection?: string | null;
          created_at?: string | null;
          creator_name?: string | null;
          date?: string | null;
          document_name: string;
          folder?: string | null;
          id?: number;
          identifier?: string | null;
          rights?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          archive?: string | null;
          box?: string | null;
          collection?: string | null;
          created_at?: string | null;
          creator_name?: string | null;
          date?: string | null;
          document_name?: string;
          folder?: string | null;
          id?: number;
          identifier?: string | null;
          rights?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      images: {
        Row: {
          created_at: string | null;
          document_id: number;
          id: number;
          image_name: string | null;
          image_path: string;
          image_url: string;
          next_image_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_id: number;
          id?: number;
          image_name?: string | null;
          image_path: string;
          image_url: string;
          next_image_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_id?: number;
          id?: number;
          image_name?: string | null;
          image_path?: string;
          image_url?: string;
          next_image_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'images_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      lists: {
        Row: {
          created_at: string | null;
          id: number;
          list_name: string;
          next_list_id: number | null;
          parent_list_id: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          list_name: string;
          next_list_id?: number | null;
          parent_list_id?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          list_name?: string;
          next_list_id?: number | null;
          parent_list_id?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_parent_list_id_fkey';
            columns: ['parent_list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      lists_documents: {
        Row: {
          created_at: string | null;
          document_id: number;
          list_id: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_id: number;
          list_id: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_id?: number;
          list_id?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_documents_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lists_documents_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          created_at: string | null;
          id: number;
          image_id: number | null;
          notes_text: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          image_id?: number | null;
          notes_text?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          image_id?: number | null;
          notes_text?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_image';
            columns: ['image_id'];
            isOneToOne: true;
            referencedRelation: 'images';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string | null;
          current_period_end: string | null;
          current_period_start: string | null;
          free_plan_status: Database['public']['Enums']['plan_status'];
          id: number;
          lifetime_tokens_awarded: boolean;
          price: string | null;
          status: Database['public']['Enums']['subscription_status'] | null;
          stripe_customer_id: string;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          free_plan_status?: Database['public']['Enums']['plan_status'];
          id?: number;
          lifetime_tokens_awarded?: boolean;
          price?: string | null;
          status?: Database['public']['Enums']['subscription_status'] | null;
          stripe_customer_id: string;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          free_plan_status?: Database['public']['Enums']['plan_status'];
          id?: number;
          lifetime_tokens_awarded?: boolean;
          price?: string | null;
          status?: Database['public']['Enums']['subscription_status'] | null;
          stripe_customer_id?: string;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transcriptions: {
        Row: {
          ai_transcription_text: string | null;
          created_at: string | null;
          current_transcription_text: string | null;
          id: number;
          image_id: number;
          transcription_status:
            | Database['public']['Enums']['transcription_status_enum']
            | null;
          updated_at: string | null;
        };
        Insert: {
          ai_transcription_text?: string | null;
          created_at?: string | null;
          current_transcription_text?: string | null;
          id?: number;
          image_id: number;
          transcription_status?:
            | Database['public']['Enums']['transcription_status_enum']
            | null;
          updated_at?: string | null;
        };
        Update: {
          ai_transcription_text?: string | null;
          created_at?: string | null;
          current_transcription_text?: string | null;
          id?: number;
          image_id?: number;
          transcription_status?:
            | Database['public']['Enums']['transcription_status_enum']
            | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transcriptions_image_id_fkey';
            columns: ['image_id'];
            isOneToOne: true;
            referencedRelation: 'images';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email_address: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          should_fetch_document: boolean;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email_address: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          should_fetch_document?: boolean;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email_address?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          should_fetch_document?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fetch_documents_for_lists: {
        Args: {
          list_ids: number[];
          _from?: number;
          _to?: number;
        };
        Returns: {
          id: number;
          document_name: string;
          creator_name: string;
          date: string;
          type: string;
          archive: string;
          collection: string;
          box: string;
          folder: string;
          identifier: string;
          rights: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          total_count: number;
        }[];
      };
      get_list_with_children: {
        Args: {
          _id: number;
        };
        Returns: {
          id: number;
        }[];
      };
      get_ordered_images_by_document_id: {
        Args: {
          document_id_param: number;
          include_relations?: boolean;
        };
        Returns: {
          id: number;
          document_id: number;
          image_name: string;
          image_url: string;
          image_path: string;
          created_at: string;
          updated_at: string;
          next_image_id: number;
          notes: Json;
          transcriptions: Json;
        }[];
      };
      get_ordered_images_by_document_ids: {
        Args: {
          document_ids: number[];
        };
        Returns: {
          id: number;
          document_id: number;
          image_name: string;
          image_url: string;
          image_path: string;
          created_at: string;
          updated_at: string;
          next_image_id: number;
        }[];
      };
      search_documents_and_lists: {
        Args: {
          search_term: string;
          user_id_param: string;
        };
        Returns: {
          id: number;
          name: string;
          type: string;
        }[];
      };
    };
    Enums: {
      plan_status: 'never_subscribed' | 'previously_subscribed' | 'subscribed';
      subscription_status:
        | 'incomplete'
        | 'incomplete_expired'
        | 'trialing'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'unpaid'
        | 'paused';
      transcription_status_enum: 'draft' | 'transcribed' | 'finalised';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
