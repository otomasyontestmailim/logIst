// =====================================================================
// Supabase DB tipleri — supabase/migrations/0001_init.sql ile elle senkron.
// (MCP token bu projeye erişemediği için `supabase gen types` yerine elle
//  yazıldı. Şema değişince BURAYI da güncelle.)
// =====================================================================

export type UserRole = "admin" | "dispatcher" | "driver";
export type TripStatus = "created" | "loaded" | "in_transit" | "delivered";
export type DocumentType =
  | "cmr"
  | "invoice"
  | "waybill"
  | "weighbridge"
  | "adr"
  | "customs"
  | "delivery_note";
export type DocumentStatus = "pending" | "approved" | "rejected";
export type CustomerType = "shipper" | "consignee" | "both";

// JSON yardımcı tipi (ocr_data jsonb için)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          tax_no: string | null;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tax_no?: string | null;
          plan?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          organization_id: string;
          role: UserRole;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          role?: UserRole;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      driver_profiles: {
        Row: {
          user_id: string;
          license_no: string | null;
          src_expiry: string | null;
          adr_expiry: string | null;
          psikoteknik_expiry: string | null;
          green_card_expiry: string | null;
          plate: string | null;
          trailer_no: string | null;
        };
        Insert: {
          user_id: string;
          license_no?: string | null;
          src_expiry?: string | null;
          adr_expiry?: string | null;
          psikoteknik_expiry?: string | null;
          green_card_expiry?: string | null;
          plate?: string | null;
          trailer_no?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["driver_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: CustomerType;
          country: string | null;
          city: string | null;
          address: string | null;
          contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type?: CustomerType;
          country?: string | null;
          city?: string | null;
          address?: string | null;
          contact?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          organization_id: string;
          driver_id: string | null;
          customer_id: string | null;
          origin: string | null;
          destination: string | null;
          status: TripStatus;
          load_date: string | null;
          delivery_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          driver_id?: string | null;
          customer_id?: string | null;
          origin?: string | null;
          destination?: string | null;
          status?: TripStatus;
          load_date?: string | null;
          delivery_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          trip_id: string;
          uploaded_by: string | null;
          type: DocumentType;
          file_url: string;
          page_count: number;
          ocr_data: Json | null;
          status: DocumentStatus;
          captured_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          trip_id: string;
          uploaded_by?: string | null;
          type: DocumentType;
          file_url: string;
          page_count?: number;
          ocr_data?: Json | null;
          status?: DocumentStatus;
          captured_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: string;
          entity: string | null;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: string;
          entity?: string | null;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string };
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      trip_status: TripStatus;
      document_type: DocumentType;
      document_status: DocumentStatus;
      customer_type: CustomerType;
    };
  };
};
