import { Request, Response, NextFunction } from "express";
import { AppError, sendError } from "../utils/response";
import { logger } from "../utils/logger";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`, { path: req.path });
    return sendError(res, err.message, err.statusCode);
  }

  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.error(`Unhandled Backend Error: ${errorMessage}`, {
    path: req.path,
    method: req.method,
    stack: err instanceof Error ? err.stack : undefined,
  });

  return sendError(res, errorMessage || "Internal Server Error", 500);
}
