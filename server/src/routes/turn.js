import { Router } from "express";
import multer from "multer";
import { processTurn } from "../services/pipeline.js";

const router = Router();
const upload = multer({
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

router.post("/turn", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Missing file field 'audio'" });
    }

    const speakerRole = String(req.body.speaker_role || "").trim().toUpperCase();
    const sessionId = String(req.body.session_id || "").trim();
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing body field 'session_id'" });
    }

    const result = await processTurn({
      fileBuffer: req.file.buffer,
      filename: req.file.originalname || "audio.wav",
      mimeType: req.file.mimetype || "audio/wav",
      speakerRole,
      requestId: req.requestId
    });

    return res.json({
      ok: true,
      session_id: sessionId,
      speaker_role: result.speakerRole,
      source_language: result.sourceLanguage,
      target_language: result.targetLanguage,
      transcript: result.transcript,
      translation: result.translation,
      audio: result.audio,
      latency_ms: result.latencyMs
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

