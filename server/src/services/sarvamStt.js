import FormData from "form-data";
import { sarvamHttpClient } from "./sarvamClient.js";

export async function transcribeAudio({ fileBuffer, filename = "audio.wav", mimeType = "audio/wav", model = "saaras:v3", mode = "transcribe" }) {
  const form = new FormData();
  form.append("model", model);
  form.append("mode", mode);
  form.append("file", fileBuffer, { filename, contentType: mimeType });

  const client = sarvamHttpClient();
  const response = await client.post("/speech-to-text", form, {
    headers: {
      ...form.getHeaders()
    }
  });

  return response.data;
}
