import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiConfig } from "./aiConfig.js";

export const genAI = new GoogleGenerativeAI(aiConfig.gemini.apiKey);