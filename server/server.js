import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { appConfig } from "./config/appConfig.js";
import { aiController, cacheController } from "./controllers/aiController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: appConfig.corsConfig.origin,
    methods: appConfig.corsConfig.methods,
    allowedHeaders: ["Content-Type", "application/json"],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Get Gemini API Response
app.post("/chat-with-gemini", aiController);

// New endpoint for cache management
app.post("/manage-cache", cacheController);

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// App listening
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
