import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "sarvam-live-translate-server",
    timestamp: new Date().toISOString()
  });
});

export default router;
