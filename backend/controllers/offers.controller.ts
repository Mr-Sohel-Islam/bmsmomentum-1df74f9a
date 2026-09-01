import { Request, Response } from "express";
import { OffersModel, NotificationsModel, type DispatchResult } from "../models/offers.model";
import { sendSuccess, AppError } from "../utils/response";

function userId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new AppError("Authentication required", 401);
  return id;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUS = ["draft", "scheduled", "active", "paused", "expired"];
const VALID_TYPES = ["employee", "doctor", "trade", "external"];

function validateOfferPayload(body: Record<string, unknown>, requireTitle: boolean) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (requireTitle && !title) throw new AppError("Offer title is required", 400);
  if (title && title.length > 255) throw new AppError("Offer title is too long (max 255)", 400);

  if (body.status && !VALID_STATUS.includes(String(body.status))) {
    throw new AppError(`Status must be one of: ${VALID_STATUS.join(", ")}`, 400);
  }
  if (body.scheduled_at) {
    const when = new Date(String(body.scheduled_at).replace(" ", "T"));
    if (Number.isNaN(when.getTime())) throw new AppError("Schedule date is not a valid date", 400);
  }
  if (body.valid_from && body.valid_to && String(body.valid_to) < String(body.valid_from)) {
    throw new AppError("Valid-to date cannot be before the valid-from date", 400);
  }
  if (body.image_url && !/^https?:\/\//i.test(String(body.image_url))) {
    throw new AppError("Image URL must start with http:// or https://", 400);
  }
  return { ...body, title: title || undefined };
}

function dispatchMessage(result: DispatchResult) {
  if (result.attempted === 0) return "Nothing left to deliver for this offer";
  const parts = [`${result.sent} sent`];
  if (result.retrying > 0) parts.push(`${result.retrying} will retry automatically`);
  if (result.failed > 0) parts.push(`${result.failed} failed permanently`);
  return parts.join(" · ");
}

export class OffersController {
  static async list(req: Request, res: Response) {
    const offers = await OffersModel.list((req.query.status as string) || undefined);
    return sendSuccess(res, offers);
  }

  static async get(req: Request, res: Response) {
    const offer = await OffersModel.findById(String(req.params.id));
    if (!offer) throw new AppError("Offer not found", 404);
    const recipients = await OffersModel.listRecipients(offer.id);
    return sendSuccess(res, { ...offer, recipients });
  }

  static async create(req: Request, res: Response) {
    const payload = validateOfferPayload(req.body || {}, true);
    const offer = await OffersModel.create({ ...payload, created_by: userId(req) });
    return sendSuccess(res, offer, "Offer saved", 201);
  }

  static async update(req: Request, res: Response) {
    const payload = validateOfferPayload(req.body || {}, false);
    const offer = await OffersModel.update(String(req.params.id), payload);
    if (!offer) throw new AppError("Offer not found", 404);
    return sendSuccess(res, offer, "Offer updated");
  }

  static async remove(req: Request, res: Response) {
    const ok = await OffersModel.remove(String(req.params.id));
    if (!ok) throw new AppError("Offer not found", 404);
    return sendSuccess(res, { id: String(req.params.id) }, "Offer deleted");
  }

  static async recipients(req: Request, res: Response) {
    return sendSuccess(res, await OffersModel.listRecipients(String(req.params.id)));
  }

  static async allRecipients(_req: Request, res: Response) {
    return sendSuccess(res, await OffersModel.listRecipients());
  }

  static async send(req: Request, res: Response) {
    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    if (recipients.length === 0) throw new AppError("At least one recipient is required", 400);
    if (recipients.length > 500) throw new AppError("Send to at most 500 recipients at a time", 400);

    for (const r of recipients as Array<Record<string, unknown>>) {
      const type = String(r.recipient_type || "employee");
      if (!VALID_TYPES.includes(type)) {
        throw new AppError(`Unknown recipient type "${type}"`, 400);
      }
      const email = r.recipient_email ? String(r.recipient_email).trim() : "";
      if (type === "external" && !email) {
        throw new AppError("Outside recipients need an email address", 400);
      }
      if (email && !EMAIL_RE.test(email)) {
        throw new AppError(`"${email}" is not a valid email address`, 400);
      }
      if (type !== "external" && !r.recipient_id) {
        throw new AppError("Internal recipients must reference a record", 400);
      }
    }

    const scheduled = req.body?.schedule === true;
    const offer = await OffersModel.findById(String(req.params.id));
    if (!offer) throw new AppError("Offer not found", 404);
    if (scheduled && !offer.scheduled_at) {
      throw new AppError("Set a schedule date on the offer before queueing recipients", 400);
    }

    const result = await OffersModel.addRecipients(String(req.params.id), recipients, userId(req), {
      deliver: !scheduled,
    });

    if (scheduled) {
      return sendSuccess(res, result, "Recipients queued for the scheduled send", 201);
    }
    return sendSuccess(res, result, dispatchMessage(result as DispatchResult), 201);
  }

  static async dispatchNow(req: Request, res: Response) {
    const offer = await OffersModel.findById(String(req.params.id));
    if (!offer) throw new AppError("Offer not found", 404);
    const result = await OffersModel.dispatch(String(req.params.id));
    return sendSuccess(res, result, dispatchMessage(result));
  }
}

export class NotificationsController {
  static async list(req: Request, res: Response) {
    return sendSuccess(res, await NotificationsModel.listForUser(userId(req)));
  }

  static async markRead(req: Request, res: Response) {
    await NotificationsModel.markRead(String(req.params.id), userId(req), req.body?.read !== false);
    return sendSuccess(res, { id: String(req.params.id) });
  }

  static async markAllRead(req: Request, res: Response) {
    await NotificationsModel.markAllRead(userId(req));
    return sendSuccess(res, { ok: true });
  }

  static async clear(req: Request, res: Response) {
    await NotificationsModel.clear(userId(req));
    return sendSuccess(res, { ok: true });
  }
}
