export type TripStatus =
  | "requested"
  | "driver_approval"
  | "dispatched"
  | "loading"
  | "in_transit"
  | "delivering"
  | "delivery_approval"
  | "completed";

export type DocumentType =
  | "cmr"
  | "invoice"
  | "waybill"
  | "weighbridge"
  | "adr"
  | "customs"
  | "delivery_note";

export type DocumentStatus = "pending" | "approved" | "rejected";
export type UserRole = "admin" | "dispatcher" | "driver";

export type Trip = {
  id: string;
  organization_id: string;
  driver_id: string | null;
  customer_id: string | null;
  origin: string | null;
  destination: string | null;
  status: TripStatus;
  load_date: string | null;
  delivery_date: string | null;
  cargo_type: string | null;
  tonnage_kg: number | null;
  notes: string | null;
  tracking_token: string | null;
  delivery_signature_url: string | null;
  delivered_at: string | null;
  freight_amount: number | null;
  freight_currency: string | null;
};

export type TripDocument = {
  id: string;
  organization_id: string;
  trip_id: string;
  uploaded_by: string | null;
  type: DocumentType;
  status: DocumentStatus;
  file_url: string;
  captured_at: string | null;
  created_at: string;
};

export type AppUser = {
  id: string;
  organization_id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type Customer = {
  id: string;
  name: string;
};

type TableDef<R, I = Partial<R>, U = Partial<R>> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      trips: TableDef<
        Trip,
        Partial<Trip> & Pick<Trip, "organization_id" | "status">,
        Partial<Trip>
      >;
      documents: TableDef<
        TripDocument,
        Partial<TripDocument> &
          Pick<
            TripDocument,
            "organization_id" | "trip_id" | "type" | "file_url"
          >,
        Partial<TripDocument>
      >;
      users: TableDef<AppUser>;
      customers: TableDef<Customer>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
