import { Request, Response } from "express";
import { PerformanceModel } from "../models/performance.model";
import { sendSuccess, AppError } from "../utils/response";

export class PerformanceController {
  static async getMetrics(req: Request, res: Response) {
    const metrics = await PerformanceModel.findAllMetrics();
    return sendSuccess(res, metrics);
  }

  static async createMetric(req: Request, res: Response) {
    const { name, description, unit, weight, active } = req.body;
    if (!name) {
      throw new AppError("Metric name is required", 400);
    }
    const metric = await PerformanceModel.createMetric({
      name,
      description: description || null,
      unit: unit || null,
      weight: Number(weight) || 1,
      active: active !== undefined ? Boolean(active) : true,
    });
    return sendSuccess(res, metric, "Metric created", 201);
  }

  static async updateMetric(req: Request, res: Response) {
    const id = req.params.id as string;
    const metric = await PerformanceModel.updateMetric(id, req.body);
    if (!metric) {
      throw new AppError("Metric not found", 404);
    }
    return sendSuccess(res, metric, "Metric updated");
  }

  static async deleteMetric(req: Request, res: Response) {
    const id = req.params.id as string;
    const deleted = await PerformanceModel.deleteMetric(id);
    if (!deleted) {
      throw new AppError("Metric not found", 404);
    }
    return sendSuccess(res, { id }, "Metric deleted");
  }

  static async getAllScores(req: Request, res: Response) {
    const scores = await PerformanceModel.findAllScores();
    return sendSuccess(res, scores);
  }

  static async getUserScores(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const scores = await PerformanceModel.findMetricScoresByUser(userId);
    return sendSuccess(res, scores);
  }

  static async addScore(req: Request, res: Response) {
    const { metric_id, user_id, score, value, period, evaluated_by, recorded_by } = req.body;
    const numVal = Number(score ?? value);
    if (!metric_id || !user_id || isNaN(numVal) || !period) {
      throw new AppError("metric_id, user_id, score/value, and period are required", 400);
    }
    const scoreRecord = await PerformanceModel.addMetricScore({
      metric_id,
      user_id,
      score: numVal,
      period,
      evaluated_by: evaluated_by || recorded_by || req.user?.id || null,
    });
    return sendSuccess(res, scoreRecord, "Metric score recorded", 201);
  }

  static async deleteScore(req: Request, res: Response) {
    const id = req.params.id as string;
    const deleted = await PerformanceModel.deleteMetricScore(id);
    if (!deleted) {
      throw new AppError("Score not found", 404);
    }
    return sendSuccess(res, { id }, "Metric score deleted");
  }
}
