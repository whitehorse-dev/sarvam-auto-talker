import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/sarvamStt.js";
import { translateText } from "../services/sarvamTranslate.js";
import { synthesizeSpeech } from "../services/sarvamTts.js";
import { config } from "../config.js";

const upload = multer();
const router = Router();

router.post("/verify/stt", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file field 'audio'" });
    }

    const data = await transcribeAudio({
      fileBuffer: req.file.buffer,
      filename: req.file.originalname || "audio.wav",
      mimeType: req.file.mimetype || "audio/wav",
      model: String(req.body.model || "saaras:v3"),
      mode: String(req.body.mode || "transcribe")
    });

    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify/translate", async (req, res, next) => {
  try {
    const input = String(req.body.input || "").trim();
    if (!input) {
      return res.status(400).json({ error: "Missing body field 'input'" });
    }

    const sourceLanguageCode = String(req.body.source_language_code || "auto");
    const targetLanguageCode = String(req.body.target_language_code || config.defaultEnglishLang);

    const data = await translateText({
      input,
      sourceLanguageCode,
      targetLanguageCode,
      speakerGender: String(req.body.speaker_gender || "Male")
    });

    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify/tts", async (req, res, next) => {
  try {
    const text = String(req.body.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Missing body field 'text'" });
    }

    const targetLanguageCode = String(req.body.target_language_code || config.defaultHindiLang);

    const data = await synthesizeSpeech({
      text,
      targetLanguageCode,
      speaker: req.body.speaker ? String(req.body.speaker) : undefined
    });

    return res.json({ ok: true, data });
  } catch (error) {
    return next(error);
  }
});

export default router;
