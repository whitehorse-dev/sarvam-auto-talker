import { sarvamHttpClient } from "./sarvamClient.js";

export async function translateText({ input, sourceLanguageCode, targetLanguageCode, speakerGender = "Male" }) {
  const client = sarvamHttpClient();
  const response = await client.post("/translate", {
    input,
    source_language_code: sourceLanguageCode,
    target_language_code: targetLanguageCode,
    speaker_gender: speakerGender
  });

  return response.data;
}
