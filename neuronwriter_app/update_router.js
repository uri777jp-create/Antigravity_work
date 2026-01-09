
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/routers.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// The new implementation logic
const newLogic = `      .mutation(async ({ ctx, input }) => {
        const { searchTavily } = await import("./_core/tavily");
        const { invokeLLM } = await import("./_core/llm");

        // 1. LLMで検証すべき事実（クレーム）を抽出
        const extractionPrompt = \`Information Extraction Specialist Role
You are an expert in information extraction. Convert the following article section into structured claims that require fact-checking.

## Article Section
Heading: \${input.heading}
Content: \${input.content}

## Extraction Rules
- Prioritize numerical data, proper nouns, service specifications (fees, transaction units, etc.), and dates.
- Exclude subjective expressions (e.g., "easy to use", "highly recommended").
- For each claim, suggest 1-2 optimal search keywords for verification.
- Extract up to 5 items.
- Output in JSON format.

## Output Format (JSON)
{
  "claims": [
    {
      "claim": "Claim text",
      "category": "Numeric/Spec/ProperNoun/Date",
      "suggested_queries": ["Search Keyword 1", "Search Keyword 2"]
    }
  ]
}\`;

        const extractionResponse = await invokeLLM({
          messages: [{ role: "user", content: extractionPrompt }],
          response_format: { type: "json_object" }
        });

        const extractionContent = extractionResponse.choices[0]?.message?.content;
        let claimsData: { claim: string; category: string; suggested_queries: string[] }[] = [];
        try {
          const parsed = JSON.parse(typeof extractionContent === "string" ? extractionContent : JSON.stringify(extractionContent));
          claimsData = parsed.claims || [];
        } catch (e) {
          console.error("Fact check extraction failed:", e);
          return { results: [] };
        }

        if (claimsData.length === 0) {
          return { results: [] };
        }

        // 2. Tavilyで裏取り検索
        // 検索クエリの構築: 見出し + 各クレームの推奨キーワード（上位のもの）
        const allKeywords = claimsData.flatMap(c => c.suggested_queries).slice(0, 5); // キーワード過多を防ぐ
        // 重複を除去
        const uniqueKeywords = Array.from(new Set(allKeywords));
        const searchQuery = \`\${input.heading} \${uniqueKeywords.join(" ")}\`.trim();
        
        console.log(\`Fact Check Search: \${searchQuery}\`);
        
        let searchContext = "";
        try {
          const searchResults = await searchTavily(searchQuery, 7); // 少し多めに取得
          searchContext = searchResults.results
            .map((r, i) => \`[Source \${i + 1}] Title: \${r.title} (URL: \${r.url})\\nContent: \${r.content}\`)
            .join("\\n\\n");
        } catch (e) {
          console.error("Fact check search failed:", e);
          // 検索失敗時は検証不能として返す
          return { 
            results: claimsData.map(c => ({ 
              claim: c.claim, 
              status: "unverified", 
              reason: "Search failed",
              thought: "Unable to verify due to search error.",
              confidence: 0,
              sourceUrl: "" 
            })) 
          };
        }

        // 3. LLMで事実検証
        const verificationPrompt = \`Role: Strict Fact Checker
You are a strict fact checker who makes judgments based solely on evidence.

## Verification Target
\${JSON.stringify(claimsData, null, 2)}

## Search Results (Evidence)
\${searchContext}

## Judgment Criteria
- **Verified**: Fully supported by evidence.
- **Partially Verified**: Partially correct but needs context or minor correction.
- **Contradicted**: Clearly incorrect or contradicts evidence.
- **Unverified**: Insufficient evidence to judge.

## Rules
- Write a "thought" process analyzing which parts of the evidence support or contradict the claim.
- Rate your confidence (0-100).

## Output Format (JSON)
{
  "results": [
    {
      "claim": "Claim text",
      "thought": "First, checking Source 1... However, Source 2 states...",
      "status": "Verified" | "Partially Verified" | "Contradicted" | "Unverified",
      "confidence": 80,
      "reason": "Brief summary of judgment",
      "source_url": "Supporting URL from sources"
    }
  ]
}\`;

        const verificationResponse = await invokeLLM({
          messages: [{ role: "system", content: "You are a strict fact checker." }, { role: "user", content: verificationPrompt }],
          response_format: { type: "json_object" }
        });

        const verificationContent = verificationResponse.choices[0]?.message?.content;
        let results = [];
        try {
          const parsed = JSON.parse(typeof verificationContent === "string" ? verificationContent : JSON.stringify(verificationContent));
          // バックエンドのsnake_case等をフロントエンドに合わせて変換
          results = (parsed.results || []).map((r: any) => {
            let status = "unverified";
            const s = r.status?.toLowerCase() || "";
            if (s.includes("partially")) status = "partially_verified";
            else if (s.includes("verified")) status = "verified";
            else if (s.includes("contradicted")) status = "contradicted";

            return {
              claim: r.claim,
              status: status,
              reason: r.reason,
              thought: r.thought,
              confidence: r.confidence,
              sourceUrl: r.source_url || r.sourceUrl // 表記ゆれ対応
            };
          });
        } catch (e) {
          console.error("Fact check verification failed:", e);
          return { results: [] };
        }

        return { results };
      }),`;

// Regex to find the factCheckSection mutation including the body
// Starts with factCheckSection: protectedProcedure... .mutation(async
// Ends closely before the closing brace of the mutation
// Since we have clean input code, we can allow for some flexibility or finding the exact start point
// Let's use string manipulation to be safer than regex on multi-line complex code

const startMarker = 'factCheckSection: protectedProcedure';
const mutationStart = '.mutation(async ({ ctx, input }) => {';
const mutationEnd = '}),'; // This is fragile if there are other mutations, but we know where we are in file

const startIndex = fileContent.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Could not find factCheckSection start');
    process.exit(1);
}

const mutationStartIndex = fileContent.indexOf(mutationStart, startIndex);
if (mutationStartIndex === -1) {
    console.error('Could not find mutation start');
    process.exit(1);
}

// Find the end of this mutation block. 
// We know it ends with `}),` followed by newline or subsequent code, 
// AND it should be the matching closing brace for the mutation logic.
// However, since we are replacing the *whole* mutation call `mutation(...)`, let's find the closing `})` that matches.

// A simpler heuristic: Find the next `factCheckSection` or end of file? No.
// Let's assume the previous view was correct about indentation: `      }),`
// Let's search for `      }),` after the start index.
// Or effectively, we want to replace from `mutationStartIndex` up to `}),`

// Let's scan forward from mutationStartIndex counting braces? No, async string manipulation is hard.
// Let's use the known OLD content start to identify the block to remove.

const oldStartContent = `const { searchTavily } = await import("./_core/tavily");
        const { invokeLLM } = await import("./_core/llm");

        // 1. LLMで検証すべき事実（クレーム）を抽出
        const extractionPrompt = \`以下の記事セクションから`;

// Normalize whitespace for search?
function normalize(str) {
    return str.replace(/\\s+/g, ' ').trim();
}

// Just search for the unique "extractionPrompt" line to be sure we are in the right place
const extractionPromptKey = 'const extractionPrompt = `以下の記事セクションから';
const keyIndex = fileContent.indexOf(extractionPromptKey, mutationStartIndex);

if (keyIndex === -1) {
    console.error('Could not find old extractionPrompt line');
    process.exit(1);
}

// Now we know we are inside the old block.
// We want to replace everything from `mutationStartIndex`...
// ...until the closing `}),` of this mutation.
// Let's find the matching closing parens/brace for `.mutation(`.
// Or simpler: The code ends with `return { results };` followed by `}),`

const oldEndMarker = `return { results };
      }),`;

// Note: windows line endings might be \r\n
// Let's try to match loosely.

const endSearchArea = fileContent.slice(keyIndex);
// Need to find the `return { results };` and the `}),` following it.
const returnIndex = endSearchArea.indexOf('return { results };');
if (returnIndex === -1) {
    console.error('Could not find return statement');
    process.exit(1);
}

const closingBraceIndex = endSearchArea.indexOf('}),', returnIndex);
if (closingBraceIndex === -1) {
    console.error('Could not find closing brace');
    process.exit(1);
}

// Calculate absolute end index
const absoluteEndIndex = keyIndex + closingBraceIndex + 3; // length of '}),'

// Now we replace from mutationStartIndex to absoluteEndIndex with newLogic
const newFileContent = fileContent.slice(0, mutationStartIndex) +
    newLogic +
    fileContent.slice(absoluteEndIndex);

fs.writeFileSync(filePath, newFileContent, 'utf8');
console.log('Successfully updated server/routers.ts');
