import { Router, Request, Response } from "express";
import { resolveSessionLocation, createSession } from "../lib/sessionLocation";
import { asyncHandler } from "../utils/asyncHandler";

export const createSessionsRouter = () => {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const { user_zip } = req.body;
      if (!user_zip || typeof user_zip !== "string") {
        return res.status(400).json({ error: "user_zip required" });
      }

      const location = await resolveSessionLocation(user_zip);
      const session_id = await createSession(
        user_zip,
        location?.lat ?? null,
        location?.lng ?? null
      );

      return res.status(201).json({ session_id });
    })
  );

  return router;
};
