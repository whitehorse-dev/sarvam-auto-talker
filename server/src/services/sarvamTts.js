import { sarvamHttpClient } from "./sarvamClient.js";

export async function synthesizeSpeech({ text, targetLanguageCode, speaker }) {
  const client = sarvamHttpClient();
  const payload = {
    text,
    target_language_code: targetLanguageCode
  };

  if (speaker) {
    payload.speaker = speaker;
  }

  const response = await client.post("/text-to-speech", payload);
  return response.data;
}
