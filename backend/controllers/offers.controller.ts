import { Request, Response } from "express";
import { OffersModel, NotificationsModel } from "../models/offers.model";
import { sendSuccess, AppError } from "../utils/response";

function userId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new AppError("Authentication required", 401);
  return id;
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
    if (!req.body?.title) throw new AppError("Offer title is required", 400);
    const offer = await OffersModel.create({ ...req.body, created_by: userId(req) });
    return sendSuccess(res, offer, "Offer saved", 201);
  }

  static async update(req: Request, res: Response) {
    const offer = await OffersModel.update(String(req.params.id), req.body || {});
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
    const invalid = recipients.find(
      (r: { recipient_type?: string; recipient_id?: string; recipient_email?: string }) =>
        r.recipient_type === "external" && !r.recipient_email,
    );
    if (invalid) throw new AppError("Outside recipients need an email address", 400);

    const result = await OffersModel.addRecipients(String(req.params.id), recipients, userId(req), {
      deliver: req.body?.schedule !== true,
    });
    return sendSuccess(
      res,
      result,
      req.body?.schedule === true ? "Recipients queued for the scheduled send" : "Offer sent",
      201,
    );
  }

  static async dispatchNow(req: Request, res: Response) {
    const result = await OffersModel.dispatch(String(req.params.id));
    return sendSuccess(res, result, "Offer dispatched");
  }

  static async removeRecipient(req: Request, res: Response) {
    const ok = await OffersModel.removeRecipient(String(req.params.recipientId));
    if (!ok) throw new AppError("Recipient not found", 404);
    return sendSuccess(res, { id: String(req.params.recipientId) }, "Recipient removed");
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
