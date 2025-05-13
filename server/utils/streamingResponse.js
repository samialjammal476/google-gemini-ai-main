export const streamingResponse = async (prompt, res) => {
  const model = genAI.getGenerativeModel({
    model: aiConfig.gemini.textOnlyModel,
    safetySettings: aiConfig.gemini.safetySettings,
    generationConfig: aiConfig.gemini.generationConfig,
    systemInstruction: aiConfig.gemini.systemInstructions,
  });

  try {
    // Set up streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate content with streaming
    const result = await model.generateContentStream(prompt);
    
    // Process the stream
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    
    res.end();
  } catch (error) {
    console.error("streamingResponse | error", error);
    res.write(`data: ${JSON.stringify({ error: "Error generating response" })}\n\n`);
    res.end();
  }
};