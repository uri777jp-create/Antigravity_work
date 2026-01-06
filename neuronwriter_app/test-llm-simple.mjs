import { invokeLLM } from "./server/_core/llm.ts";

async function test() {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "あなたはSEOライティングの専門家です。" },
      { role: "user", content: "以下のJSON形式で返答してください:\n{\n  \"title\": \"FX比較のタイトル\",\n  \"description\": \"説明文\"\n}" },
    ],
    response_format: { type: "json_object" },
  });
  
  console.log("Response:", JSON.stringify(response, null, 2));
  console.log("\nContent type:", typeof response.choices[0].message.content);
  console.log("Content:", response.choices[0].message.content);
}

test().catch(console.error);
