import { Request, Response } from "express";
import { PharmaModel } from "../models/pharma.model";
import { sendSuccess, AppError } from "../utils/response";
import { AuthRequest } from "../middleware/auth.middleware";

export class PharmaController {
  // Doctors
  static async getDoctors(req: AuthRequest, res: Response) {
    const userId = req.user?.id || "mr.das";
    const isRootAdmin =
      req.user?.roles?.includes("super_admin") ||
      req.user?.roles?.includes("admin") ||
      req.user?.roles?.includes("director") ||
      false;

    const doctors = await PharmaModel.getDoctorsForUser(userId, isRootAdmin);
    return sendSuccess(res, doctors, "Doctors fetched successfully");
  }

  static async createDoctor(req: AuthRequest, res: Response) {
    const userId = req.user?.id || "mr.das";
    const {
      name,
      department,
      area_locality,
      whatsapp_contact,
      dob,
      spouse_dob,
      anniversary_date,
      child_dobs,
      special_day,
      gift_accepted_details,
      assigned_to,
    } = req.body;

    if (!name || !department || !area_locality || !whatsapp_contact) {
      throw new AppError("Name, department, area, and whatsapp contact are required", 400);
    }

    const doc = await PharmaModel.createDoctor({
      name,
      department,
      area_locality,
      whatsapp_contact,
      dob: dob || null,
      spouse_dob: spouse_dob || null,
      anniversary_date: anniversary_date || null,
      child_dobs: child_dobs || [],
      special_day: special_day || null,
      gift_accepted_details: gift_accepted_details || null,
      created_by: userId,
      assigned_to: assigned_to || userId,
    });

    return sendSuccess(res, doc, "Doctor entry created successfully");
  }

  static async updateDoctor(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    const isRootAdmin =
      req.user?.roles?.includes("super_admin") ||
      req.user?.roles?.includes("admin") ||
      req.user?.roles?.includes("director") ||
      false;

    if (!isRootAdmin) {
      throw new AppError("Only Admins and Directors can modify or reassign doctor entries", 403);
    }

    const updated = await PharmaModel.updateDoctor(id, req.body);
    return sendSuccess(res, { updated }, "Doctor entry updated successfully");
  }

  // Trade Entities (Chemists, Wholesalers, Distributors)
  static async getTradeEntities(req: Request, res: Response) {
    const category = req.query.category as string | undefined;
    const entities = await PharmaModel.getTradeEntities(category);
    return sendSuccess(res, entities, "Trade entities fetched successfully");
  }

  static async createTradeEntity(req: AuthRequest, res: Response) {
    const userId = req.user?.id || "mr.das";
    const {
      category,
      firm_name,
      drug_license_no,
      gst_number,
      address,
      proprietor_name,
      contact_number,
      email,
      comm_modes,
      billing_details,
      payment_details,
      offer_scheme_details,
      assigned_to,
    } = req.body;

    if (!category || !firm_name || !drug_license_no || !gst_number || !address || !proprietor_name || !contact_number) {
      throw new AppError("Category, Firm Name, Drug License, GST, Address, Proprietor, and Contact Number are required", 400);
    }

    const entity = await PharmaModel.createTradeEntity({
      category,
      firm_name,
      drug_license_no,
      gst_number,
      address,
      proprietor_name,
      contact_number,
      email: email || null,
      comm_modes: comm_modes || null,
      billing_details: billing_details || null,
      payment_details: payment_details || null,
      offer_scheme_details: offer_scheme_details || null,
      created_by: userId,
      assigned_to: assigned_to || userId,
    });

    return sendSuccess(res, entity, "Trade firm entity created successfully");
  }

  // Daily Reports
  static async getDailyReports(req: Request, res: Response) {
    const userId = req.query.user_id as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const reports = await PharmaModel.getDailyReports(userId, dateFrom, dateTo);
    return sendSuccess(res, reports, "Daily workstation reports fetched successfully");
  }

  static async createDailyReport(req: AuthRequest, res: Response) {
    const userId = req.user?.id || "mr.das";
    const {
      report_date,
      doctor_visits_count,
      chemist_visits_count,
      wholesale_visits_count,
      distributor_visits_count,
      billing_amount,
      payment_amount,
      offers_distributed,
      special_achievements,
      notes,
    } = req.body;

    const report = await PharmaModel.createDailyReport({
      user_id: userId,
      report_date: report_date || new Date().toISOString().split("T")[0],
      doctor_visits_count: Number(doctor_visits_count) || 0,
      chemist_visits_count: Number(chemist_visits_count) || 0,
      wholesale_visits_count: Number(wholesale_visits_count) || 0,
      distributor_visits_count: Number(distributor_visits_count) || 0,
      billing_amount: Number(billing_amount) || 0,
      payment_amount: Number(payment_amount) || 0,
      offers_distributed: offers_distributed || null,
      special_achievements: special_achievements || null,
      notes: notes || null,
    });

    return sendSuccess(res, report, "Daily workstation report submitted successfully");
  }

  // 3D Detailing Pharma Products
  static async getPharmaProducts(_req: Request, res: Response) {
    const products = await PharmaModel.getPharmaProducts();
    return sendSuccess(res, products, "3D Detailing products fetched successfully");
  }
}
