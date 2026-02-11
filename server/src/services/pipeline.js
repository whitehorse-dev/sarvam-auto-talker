import { config } from "../config.js";
import { transcribeAudio } from "./sarvamStt.js";
import { translateText } from "./sarvamTranslate.js";
import { synthesizeSpeech } from "./sarvamTts.js";
import { withRetry } from "./retry.js";

function roleLanguageMapping(speakerRole) {
  if (speakerRole === "A") {
    return {
      sourceLanguage: config.defaultHindiLang,
      targetLanguage: config.defaultEnglishLang
    };
  }
  if (speakerRole === "B") {
    return {
      sourceLanguage: config.defaultEnglishLang,
      targetLanguage: config.defaultHindiLang
    };
  }
  return null;
}

function pickFirstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractTranscript(sttPayload) {
  return pickFirstString([
    sttPayload?.transcript,
    sttPayload?.text,
    sttPayload?.result?.transcript,
    sttPayload?.result?.text,
    sttPayload?.results?.[0]?.transcript,
    sttPayload?.results?.[0]?.text
  ]);
}

function extractTranslation(translatePayload) {
  return pickFirstString([
    translatePayload?.translated_text,
    translatePayload?.translation,
    translatePayload?.output,
    translatePayload?.result?.translated_text,
    translatePayload?.result?.translation
  ]);
}

function normalizeAudio(ttsPayload) {
  const base64 = pickFirstString([
    ttsPayload?.audio?.base64,
    ttsPayload?.audio_base64,
    ttsPayload?.audios?.[0]?.audio_base64,
    ttsPayload?.result?.audio_base64
  ]);

  const url = pickFirstString([
    ttsPayload?.audio?.url,
    ttsPayload?.audio_url,
    ttsPayload?.audios?.[0]?.url,
    ttsPayload?.result?.audio_url
  ]);

  const mimeType = pickFirstString([
    ttsPayload?.audio?.mime_type,
    ttsPayload?.mime_type,
    ttsPayload?.audios?.[0]?.mime_type
  ]) || "audio/wav";

  return {
    mime_type: mimeType,
    base64: base64 || null,
    url: url || null
  };
}

function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details || null;
  return error;
}

export async function processTurn({
  fileBuffer,
  filename,
  mimeType,
  speakerRole,
  requestId
}) {
  const mapping = roleLanguageMapping(speakerRole);
  if (!mapping) {
    throw httpError(400, "speaker_role must be 'A' or 'B'");
  }

  const latency = {};
  const startTotal = Date.now();

  const startStt = Date.now();
  const sttPayload = await withRetry(
    () => transcribeAudio({ fileBuffer, filename, mimeType, model: "saaras:v3", mode: "transcribe" }),
    { maxRetries: 1, delayMs: 350 }
  );
  latency.stt = Date.now() - startStt;

  const transcript = extractTranscript(sttPayload);
  if (!transcript) {
    throw httpError(502, "Could not extract transcript from STT response", { sttPayload });
  }

  const startTranslate = Date.now();
  const translatePayload = await withRetry(
    () =>
      translateText({
        input: transcript,
        sourceLanguageCode: mapping.sourceLanguage,
        targetLanguageCode: mapping.targetLanguage
      }),
    { maxRetries: 1, delayMs: 350 }
  );
  latency.translate = Date.now() - startTranslate;

  const translation = extractTranslation(translatePayload);
  if (!translation) {
    throw httpError(502, "Could not extract translation from Translate response", { translatePayload });
  }

  const startTts = Date.now();
  const ttsPayload = await withRetry(
    () =>
      synthesizeSpeech({
        text: translation,
        targetLanguageCode: mapping.targetLanguage
      }),
    { maxRetries: 1, delayMs: 350 }
  );
  latency.tts = Date.now() - startTts;
  latency.total = Date.now() - startTotal;

  console.log(
    JSON.stringify({
      level: "info",
      event: "turn_processed",
      request_id: requestId,
      speaker_role: speakerRole,
      source_language: mapping.sourceLanguage,
      target_language: mapping.targetLanguage,
      latency_ms: latency
    })
  );

  return {
    speakerRole,
    sourceLanguage: mapping.sourceLanguage,
    targetLanguage: mapping.targetLanguage,
    transcript,
    translation,
    audio: normalizeAudio(ttsPayload),
    latencyMs: latency,
    provider: {
      stt: sttPayload,
      translate: translatePayload,
      tts: ttsPayload
    }
  };
}

