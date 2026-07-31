import { createServerFn } from "@tanstack/react-start";
import { apiClient } from "./api-client";

export interface DoctorRecord {
  id: string;
  name: string;
  department: string;
  area_locality: string;
  whatsapp_contact: string;
  dob: string | null;
  spouse_dob: string | null;
  anniversary_date: string | null;
  child_dobs: any;
  special_day: string | null;
  gift_accepted_details: string | null;
  created_by: string;
  assigned_to: string;
  created_at?: string;
  creator_name?: string;
  assignee_name?: string;
}

export interface TradeEntityRecord {
  id: string;
  category: "chemist" | "wholesaler" | "distributor";
  firm_name: string;
  drug_license_no: string;
  gst_number: string;
  address: string;
  proprietor_name: string;
  contact_number: string;
  email: string | null;
  comm_modes: string | null;
  billing_details: string | null;
  payment_details: string | null;
  offer_scheme_details: string | null;
  created_by: string;
  assigned_to: string;
  created_at?: string;
}

export interface DailyReportRecord {
  id: string;
  user_id: string;
  report_date: string;
  doctor_visits_count: number;
  chemist_visits_count: number;
  wholesale_visits_count: number;
  distributor_visits_count: number;
  billing_amount: number;
  payment_amount: number;
  offers_distributed: string | null;
  special_achievements: string | null;
  notes: string | null;
  created_at?: string;
  user_name?: string;
}

export interface PharmaProductRecord {
  id: string;
  name: string;
  composition: string | null;
  category: string | null;
  packaging: string | null;
  mrp: number;
  ptr: number;
  pts: number;
  image_url: string | null;
  detailing_presentation_url: string | null;
  key_benefits: any;
  active_promotional_scheme: string | null;
  created_at?: string;
}

export const listDoctors = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<DoctorRecord[]>("/pharma/doctors");
});

export const createDoctor = createServerFn({ method: "POST" })
  .validator((d: Partial<DoctorRecord>) => d)
  .handler(async ({ data }) => {
    return apiClient.post<DoctorRecord>("/pharma/doctors", data);
  });

export const updateDoctor = createServerFn({ method: "POST" })
  .validator((d: { id: string; updates: Partial<DoctorRecord> }) => d)
  .handler(async ({ data }) => {
    return apiClient.put<{ updated: boolean }>(`/pharma/doctors/${data.id}`, data.updates);
  });

export const listTradeEntities = createServerFn({ method: "GET" })
  .validator((opts?: { category?: string }) => opts)
  .handler(async ({ data }) => {
    const q = data?.category ? `?category=${data.category}` : "";
    return apiClient.get<TradeEntityRecord[]>(`/pharma/trade-entities${q}`);
  });

export const createTradeEntity = createServerFn({ method: "POST" })
  .validator((d: Partial<TradeEntityRecord>) => d)
  .handler(async ({ data }) => {
    return apiClient.post<TradeEntityRecord>("/pharma/trade-entities", data);
  });

export const listDailyReports = createServerFn({ method: "GET" })
  .validator((opts?: { user_id?: string; date_from?: string; date_to?: string }) => opts)
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data?.user_id) params.append("user_id", data.user_id);
    if (data?.date_from) params.append("date_from", data.date_from);
    if (data?.date_to) params.append("date_to", data.date_to);
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<DailyReportRecord[]>(`/pharma/daily-reports${q}`);
  });

export const createDailyReport = createServerFn({ method: "POST" })
  .validator((d: Partial<DailyReportRecord>) => d)
  .handler(async ({ data }) => {
    return apiClient.post<DailyReportRecord>("/pharma/daily-reports", data);
  });

export const listPharmaProducts = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<PharmaProductRecord[]>("/pharma/pharma-products");
});
