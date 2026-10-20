// Hand-written to match db/schema.sql (same shape `supabase gen types` produces).

export type ShareRole = "viewer" | "editor";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; email: string };
        Insert: { id?: string; name: string; email: string };
        Update: { id?: string; name?: string; email?: string };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          content: string;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          content?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          content?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_shares: {
        Row: {
          document_id: string;
          user_id: string;
          role: ShareRole;
          created_at: string;
        };
        Insert: {
          document_id: string;
          user_id: string;
          role?: ShareRole;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          user_id?: string;
          role?: ShareRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
