import { invokeLLM } from "./server/_core/llm.ts";

async function testLLMResponse() {
  try {
    console.log("Testing LLM API response structure...");
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Generate a title and description for an article about 'FX trading comparison'." },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "title_description",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Article title" },
              description: { type: "string", description: "Article description" },
            },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    console.log("\n=== Full Response ===");
    console.log(JSON.stringify(response, null, 2));

    console.log("\n=== Response Structure ===");
    console.log("Has choices:", !!response.choices);
    console.log("Choices length:", response.choices?.length);
    
    if (response.choices && response.choices.length > 0) {
      const firstChoice = response.choices[0];
      console.log("\n=== First Choice ===");
      console.log("Message:", firstChoice.message);
      console.log("Content type:", typeof firstChoice.message.content);
      console.log("Content is array:", Array.isArray(firstChoice.message.content));
      console.log("Content value:", firstChoice.message.content);
      
      if (Array.isArray(firstChoice.message.content)) {
        console.log("\n=== Content Array Details ===");
        firstChoice.message.content.forEach((part, index) => {
          console.log(`Part ${index}:`, part);
        });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testLLMResponse();
