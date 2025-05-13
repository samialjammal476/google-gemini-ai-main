import { textOnly, deleteCache, updateCacheTTL, listCaches } from "../utils/textOnly.js";
import { textAndImage } from "../utils/textAndImage.js";

export const aiController = async (req, res) => {
  const modelType = req.body.modelType;

  if (modelType === "text_only") {
    const { prompt, cacheId, createCache, cacheTTL } = req.body;
    const botReply = await textOnly(prompt, cacheId, createCache, cacheTTL);

    if (botReply?.Error) {
      return res.status(404).json({ Error: botReply.Error });
    }

    res.status(200).json({ 
      result: botReply.result,
      cacheId: botReply.cacheId // Return cacheId if one was created or used
    });
  } else if (modelType === "text_and_image") {
    const botReply = await textAndImage(req.body.prompt, req.body.imageParts);

    if (botReply?.Error) {
      return res.status(404).json({ Error: botReply.Error });
    }

    res.status(200).json({ result: botReply.result });
  } else {
    res.status(404).json({ result: "Invalid Model Selected" });
  }
};

// New endpoint to manage caches
export const cacheController = async (req, res) => {
  const { action, cacheId, ttl } = req.body;
  
  switch (action) {
    case 'delete':
      if (!cacheId) {
        return res.status(400).json({ error: "cacheId is required" });
      }
      const deleteResult = await deleteCache(cacheId);
      return res.status(deleteResult.success ? 200 : 404).json(deleteResult);
      
    case 'update':
      if (!cacheId || !ttl) {
        return res.status(400).json({ error: "cacheId and ttl are required" });
      }
      const updateResult = await updateCacheTTL(cacheId, ttl);
      return res.status(updateResult.success ? 200 : 404).json(updateResult);
      
    case 'list':
      const listResult = await listCaches();
      return res.status(listResult.success ? 200 : 500).json(listResult);
      
    default:
      return res.status(400).json({ error: "Invalid action. Use 'delete', 'update', or 'list'" });
  }
};
