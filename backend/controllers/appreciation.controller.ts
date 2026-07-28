import { Request, Response } from "express";
import { AppreciationModel } from "../models/appreciation.model";
import { sendSuccess, AppError } from "../utils/response";

export class AppreciationController {
  static async getAppreciations(req: Request, res: Response) {
    const items = await AppreciationModel.findAll();
    return sendSuccess(res, items);
  }

  static async createAppreciation(req: Request, res: Response) {
    const { from_user, to_user, message, points } = req.body;
    if (!from_user || !to_user || !message) {
      throw new AppError("from_user, to_user, and message are required", 400);
    }
    const item = await AppreciationModel.create({
      from_user,
      to_user,
      message,
      points: Number(points) || 10,
    });
    return sendSuccess(res, item, "Appreciation sent", 201);
  }
}
