import { Request, Response, NextFunction } from "express";
import { AgentMemory } from "../types/memory";

export const dignityCheckMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const memory: AgentMemory = req.body;

  if (!memory.agentId || !memory.context) {
    return res.status(400).json({
      error: "Invalid memory payload",
    });
  }

  const dignityResult = {
    preserved: memory.dignityPreserved,
    score: 1.0,
  };

  if (!dignityResult.preserved) {
    return res.status(403).json({
      error: "Dignity violation detected",
    });
  }

  (req as any).dignity = dignityResult;
  next();
};
