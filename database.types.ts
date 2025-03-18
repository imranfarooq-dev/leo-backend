export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      credits: {
        Row: {
          created_at: string | null
          id: string
          image_limits: number | null
          lifetime_credits: number | null
          monthly_credits: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_limits?: number | null
          lifetime_credits?: number | null
          monthly_credits?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_limits?: number | null
          lifetime_credits?: number | null
          monthly_credits?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_credits_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archive: string | null
          box: string | null
          collection: string | null
          created_at: string | null
          creator_name: string | null
          date: string | null
          document_name: string
          folder: string | null
          id: string
          identifier: string | null
          rights: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archive?: string | null
          box?: string | null
          collection?: string | null
          created_at?: string | null
          creator_name?: string | null
          date?: string | null
          document_name: string
          folder?: string | null
          id?: string
          identifier?: string | null
          rights?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archive?: string | null
          box?: string | null
          collection?: string | null
          created_at?: string | null
          creator_name?: string | null
          date?: string | null
          document_name?: string
          folder?: string | null
          id?: string
          identifier?: string | null
          rights?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          created_at: string | null
          document_id: string
          filename: string
          id: string
          image_name: string | null
          order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          filename: string
          id?: string
          image_name?: string | null
          order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          filename?: string
          id?: string
          image_name?: string | null
          order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_images_document_id"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string | null
          id: string
          list_name: string
          order: number
          parent_list_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          list_name: string
          order: number
          parent_list_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          list_name?: string
          order?: number
          parent_list_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lists_parent_list_id"
            columns: ["parent_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lists_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lists_documents: {
        Row: {
          created_at: string | null
          document_id: string
          list_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          list_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          list_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lists_documents_document_id"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lists_documents_list_id"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string | null
          id: string
          image_id: string | null
          notes_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          notes_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          notes_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notes_image_id"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          free_plan_status: Database["public"]["Enums"]["plan_status"]
          id: string
          lifetime_tokens_awarded: boolean
          price: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          free_plan_status?: Database["public"]["Enums"]["plan_status"]
          id?: string
          lifetime_tokens_awarded?: boolean
          price?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          free_plan_status?: Database["public"]["Enums"]["plan_status"]
          id?: string
          lifetime_tokens_awarded?: boolean
          price?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscriptions_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_jobs: {
        Row: {
          created_at: string | null
          external_job_id: string
          id: string
          image_id: string | null
          status: Database["public"]["Enums"]["transcription_job_status"]
          transcript_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_job_id: string
          id?: string
          image_id?: string | null
          status: Database["public"]["Enums"]["transcription_job_status"]
          transcript_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_job_id?: string
          id?: string
          image_id?: string | null
          status?: Database["public"]["Enums"]["transcription_job_status"]
          transcript_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcription_jobs_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          ai_transcription_text: string | null
          created_at: string | null
          current_transcription_text: string | null
          id: string
          image_id: string | null
          transcription_status:
          | Database["public"]["Enums"]["transcription_status_enum"]
          | null
          updated_at: string | null
        }
        Insert: {
          ai_transcription_text?: string | null
          created_at?: string | null
          current_transcription_text?: string | null
          id?: string
          image_id?: string | null
          transcription_status?:
          | Database["public"]["Enums"]["transcription_status_enum"]
          | null
          updated_at?: string | null
        }
        Update: {
          ai_transcription_text?: string | null
          created_at?: string | null
          current_transcription_text?: string | null
          id?: string
          image_id?: string | null
          transcription_status?:
          | Database["public"]["Enums"]["transcription_status_enum"]
          | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transcriptions_image_id"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email_address: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_address: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_address?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_image_and_reorder: {
        Args: {
          p_image_id: string
        }
        Returns: {
          id: string
          order: number
        }[]
      }
      delete_list_and_reorder: {
        Args: {
          p_list_id: string
        }
        Returns: {
          id: string
          order: number
        }[]
      }
      get_document_summaries_by_ids: {
        Args: {
          p_document_ids: string[]
        }
        Returns: Json
      }
      get_documents_by_ids: {
        Args: {
          p_document_ids: string[]
        }
        Returns: Json
      }
      get_documents_by_list_id: {
        Args: {
          p_list_id: string
          page_size?: number
          page_number?: number
        }
        Returns: Json
      }
      get_documents_by_user_id: {
        Args: {
          p_user_id: string
          page_size?: number
          page_number?: number
        }
        Returns: Json
      }
      get_image_summaries_by_ids: {
        Args: {
          p_image_ids: string[]
        }
        Returns: Json
      }
      get_images_by_ids: {
        Args: {
          p_image_ids: string[]
        }
        Returns: Json
      }
      get_latest_transcription_jobs: {
        Args: {
          p_image_ids: string[]
          p_earliest_created_at?: string
        }
        Returns: Json
      }
      get_list_with_children: {
        Args: {
          _id: string
        }
        Returns: {
          id: string
        }[]
      }
      get_total_images_by_user_id: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      get_untranscribed_image_ids: {
        Args: {
          p_document_ids: string[]
        }
        Returns: Json
      }
      search_documents_and_lists: {
        Args: {
          search_term: string
          user_id_param: string
        }
        Returns: {
          id: string
          name: string
          type: string
        }[]
      }
      update_image_orders: {
        Args: {
          updates: Json[]
        }
        Returns: undefined
      }
      update_list_orders: {
        Args: {
          updates: Json[]
        }
        Returns: undefined
      }
    }
    Enums: {
      plan_status: "never_subscribed" | "previously_subscribed" | "subscribed"
      subscription_status:
      | "incomplete"
      | "incomplete_expired"
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "unpaid"
      | "paused"
      transcription_job_status: "IN_PROGRESS" | "COMPLETED" | "FAILED"
      transcription_status_enum: "draft" | "transcribed" | "finalised"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
