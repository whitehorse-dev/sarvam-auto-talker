import axios from "axios";
import { config } from "../config.js";

export function sarvamHttpClient() {
  return axios.create({
    baseURL: config.sarvamBaseUrl,
    timeout: 30000,
    headers: {
      "api-subscription-key": config.sarvamApiKey
    }
  });
}
