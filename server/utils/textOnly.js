import { GoogleGenerativeAI } from "@google/generative-ai";

import { aiConfig } from "../config/aiConfig.js";
const genAI = new GoogleGenerativeAI(aiConfig.gemini.apiKey);

// Cache storage to keep track of conversations and their responses
const cacheRegistry = new Map();

export const textOnly = async (prompt, cacheId = null, createCache = false, cacheTTL = 3600 ,models=2 ) => {
  var modelaa = models==2?aiConfig.gemini.textOnlyModel:aiConfig.gemini.textAndImageModel
    const model = genAI.getGenerativeModel({
      model: modelaa,
      safetySettings: aiConfig.gemini.safetySettings,
      generationConfig: aiConfig.gemini.generationConfig,
    tools: [{ codeExecution: {} }],
      systemInstruction: aiConfig.gemini.systemInstructions,
      
    });

  try {
    // If cacheId is provided, try to use existing cache
    if (cacheId && cacheRegistry.has(cacheId)) {
      const cachedData = cacheRegistry.get(cacheId);
      
      // Check if cache has expired
      if (Date.now() < cachedData.expiresAt) {
        // Use the cached chat history
        const chat = model.startChat({
          history: cachedData.history,
          generationConfig: aiConfig.gemini.generationConfig,
        });
        
        // Send the new message
        const result = await chat.sendMessage(prompt);
        const chatResponse = result.response.text();
        
        // Update the cache with the new conversation
        cachedData.history.push({ role: "user", parts: [{ text: prompt }] });
        cachedData.history.push({ role: "model", parts: [{ text: chatResponse }] });
        
        return { result: chatResponse, cacheId };
      } else {
        // Cache expired, remove it
        cacheRegistry.delete(cacheId);
      }
    }
    
    // If createCache is true, create a new cache for this content
    if (createCache) {
      try {
        // Generate a unique ID for this cache
        const newCacheId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        // Start a new chat
        const chat = model.startChat({
          history: [],
          generationConfig: aiConfig.gemini.generationConfig,
        });
        
        // Send the initial message
        const result = await chat.sendMessage(prompt);
        const chatResponse = result.response.text();
        
        // Store the conversation in our cache
        const history = [
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: chatResponse }] }
        ];
        
        // Calculate expiration time (current time + TTL in seconds)
        const expiresAt = Date.now() + (parseInt(cacheTTL) * 1000);
        
        // Save to cache registry
        cacheRegistry.set(newCacheId, {
          history,
          expiresAt,
          createdAt: Date.now()
        });
        
        return { result: chatResponse, cacheId: newCacheId };
      } catch (cacheError) {
        console.error("textOnly | cache creation error", cacheError);
        // Fall back to regular processing if caching fails
      }
    }

    // Default behavior (no caching) - use chat as before
    const chat = model.startChat({
      history: [],
      generationConfig: aiConfig.gemini.generationConfig,
    });
    
    const result = await chat.sendMessage(prompt);
    const chatResponse = result.response.text();

    return { result: chatResponse };
  } catch (error) {
    console.error("textOnly | error", error);
    return { Error: "Uh oh! Caught error while fetching AI response" };
  }
};

// Helper function to delete a cache
export const deleteCache = async (cacheId) => {
  try {
    if (cacheRegistry.has(cacheId)) {
      cacheRegistry.delete(cacheId);
      return { success: true, message: "Cache deleted successfully" };
    }
    return { success: false, message: "Cache ID not found" };
  } catch (error) {
    console.error("deleteCache | error", error);
    return { success: false, message: "Error deleting cache", error: error.message };
  }
};

// Helper function to update cache TTL
export const updateCacheTTL = async (cacheId, newTTL) => {
  try {
    if (cacheRegistry.has(cacheId)) {
      const cachedData = cacheRegistry.get(cacheId);
      // Update expiration time
      cachedData.expiresAt = Date.now() + (parseInt(newTTL) * 1000);
      cacheRegistry.set(cacheId, cachedData);
      return { success: true, message: "Cache TTL updated successfully" };
    }
    return { success: false, message: "Cache ID not found" };
  } catch (error) {
    console.error("updateCacheTTL | error", error);
    return { success: false, message: "Error updating cache TTL", error: error.message };
  }
};

// Helper function to list all active caches
export const listCaches = async () => {
  try {
    const caches = [];
    
    for (const [cacheId, cachedData] of cacheRegistry.entries()) {
      caches.push({
        id: cacheId,
        createTime: new Date(cachedData.createdAt).toISOString(),
        expireTime: new Date(cachedData.expiresAt).toISOString(),
        messageCount: cachedData.history.length / 2, // Divide by 2 since each exchange has user and model messages
        isExpired: Date.now() > cachedData.expiresAt
      });
    }
    
    return { success: true, caches };
  } catch (error) {
    console.error("listCaches | error", error);
    return { success: false, message: "Error listing caches", error: error.message };
  }
};
