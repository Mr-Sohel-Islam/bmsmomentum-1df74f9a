import { apiClient } from "./api-client";

export type OfferStatus = "draft" | "scheduled" | "active" | "paused" | "expired";
export type RecipientType = "employee" | "doctor" | "trade" | "external";

export interface Offer {
  id: string;
  title: string;
  promo_code: string | null;
  description: string | null;
  details: string | null;
  image_url: string | null;
  offer_type: string;
  value_details: string | null;
  terms: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: OfferStatus;
  scheduled_at: string | null;
  email_subject: string | null;
  email_body: string | null;
  created_by: string;
  created_at?: string;
  creator_name?: string | null;
  recipient_count?: number;
  sent_count?: number;
}

export interface OfferRecipient {
  id: string;
  offer_id: string;
  recipient_type: RecipientType;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  channel: "email" | "notification" | "both";
  delivery_status: "pending" | "scheduled" | "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
  offer_title?: string;
  promo_code?: string | null;
  created_at?: string;
}

export interface OfferInput {
  title: string;
  promo_code?: string | null;
  description?: string | null;
  details?: string | null;
  image_url?: string | null;
  offer_type?: string;
  value_details?: string | null;
  terms?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: OfferStatus;
  scheduled_at?: string | null;
  email_subject?: string | null;
  email_body?: string | null;
}

export const offersApi = {
  list: () => apiClient.get<Offer[]>("/offers"),
  recipients: () => apiClient.get<OfferRecipient[]>("/offers/recipients"),
  create: (input: OfferInput) => apiClient.post<Offer>("/offers", input),
  update: (id: string, input: Partial<OfferInput>) => apiClient.put<Offer>(`/offers/${id}`, input),
  remove: (id: string) => apiClient.delete(`/offers/${id}`),
  dispatch: (id: string) => apiClient.post<OfferRecipient[]>(`/offers/${id}/dispatch`, {}),
  send: (
    id: string,
    recipients: Array<Partial<OfferRecipient>>,
    schedule = false,
  ) => apiClient.post<OfferRecipient[]>(`/offers/${id}/send`, { recipients, schedule }),
};
