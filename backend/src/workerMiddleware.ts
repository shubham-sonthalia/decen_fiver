import { NextFunction, Request, Response } from "express";
import { WORKER_JWT_SECRET } from ".";
import jwt from "jsonwebtoken";

export function workerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"] ?? "";
  try {
    const decoded = jwt.verify(authHeader, WORKER_JWT_SECRET);
    console.log(decoded);
    //@ts-ignore
    if (decoded.userId) {
      //@ts-ignore
      req.userId = decoded.userId;
      return next();
    }
  } catch (e) {
    return res.status(403).json({ message: "You are not logged in" });
  }
}
