import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import healthRoutes from "./routes/health.js";
import verifyRoutes from "./routes/verify.js";
import turnRoutes from "./routes/turn.js";
import { config } from "./config.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "../../web");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(webDir));
app.use((req, _res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

app.use(healthRoutes);
app.use("/api", verifyRoutes);
app.use("/api", turnRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || err.response?.status || 500;
  const providerData = err.response?.data || err.details || null;

  res.status(status).json({
    ok: false,
    error: err.message || "Internal server error",
    provider: providerData || null
  });
});

app.listen(config.port, () => {
  console.log(`[server] running on http://localhost:${config.port}`);
});
