import dotenv from "dotenv";

dotenv.config();

const required = ["SARVAM_API_KEY"];

for (const key of required) {
  if (!process.env[key]) {
    // Keep startup failure explicit so missing secrets do not fail later.
    console.warn(`[config] Missing environment variable: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT || 8080),
  env: process.env.NODE_ENV || "development",
  sarvamApiKey: process.env.SARVAM_API_KEY || "",
  sarvamBaseUrl: process.env.SARVAM_BASE_URL || "https://api.sarvam.ai",
  defaultHindiLang: process.env.DEFAULT_HINDI_LANG || "hi-IN",
  defaultEnglishLang: process.env.DEFAULT_ENGLISH_LANG || "en-IN"
};
