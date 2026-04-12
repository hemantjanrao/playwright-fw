import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { pipeline, env } from '@xenova/transformers';

// Setup Transformers
env.localModelPath = '';
env.allowRemoteModels = true;

// Load variables from .env.develop as the default
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') });

const { JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN, ANTHROPIC_API_KEY } = process.env;

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DB_PATH = path.resolve(__dirname, 'rag-db.json');

// --- Helper: Cosine Similarity ---
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function fetchJiraTicket(ticketId: string) {
  if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error('❌ Missing Jira credentials in .env.develop file.');
  }

  const endpoint = `${JIRA_URL}/rest/api/2/issue/${ticketId}`;
  const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ticket. Status: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return {
    summary: data.fields?.summary || 'No Summary',
    description: data.fields?.description || 'No Description',
  };
}

// Retrieves the most relevant Page Object logic from the Vector DB
async function retrieveContext(query: string): Promise<string> {
  if (!fs.existsSync(DB_PATH)) {
    console.log('⚠️ No RAG Database found. Proceeding without context.');
    return '';
  }

  console.log('🔍 Querying Vector Database for relevant Page Objects...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const output = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data) as number[];

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  let bestMatch = null;
  let highestScore = -1;

  for (const doc of db) {
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = doc;
    }
  }

  if (bestMatch && highestScore > 0.4) {
    console.log(
      `🎯 Found explicitly matching Page Object Context: ${bestMatch.filename} (Score: ${highestScore.toFixed(2)})`
    );
    return `
=== PROJECT PAGE OBJECT CONTEXT ===
We found an exact matching Page Object for this feature:
File: pages/${bestMatch.filename}
Code:
${bestMatch.content}
===================================
`;
  }

  console.log(
    `🧠 No highly relevant Page Object found (Highest Score: ${highestScore.toFixed(2)}). An autonomous POM generation will be enforced.`
  );
  return '';
}

async function generatePlaywrightTest(ticketId: string, summary: string, description: string) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('❌ Missing ANTHROPIC_API_KEY in .env.develop file.');
  }

  const ragContext = await retrieveContext(`Ticket: ${summary}\n${description}`);

  const systemPrompt = `
You are an Expert SDET writing Playwright End-to-End tests in TypeScript.
Your job is to read the provided Jira ticket (Summary and Acceptance Criteria) and output fully functioning code.

STRICT INSTRUCTIONS:
1. You MUST respond with BOTH a Page Object file AND a Test file using the exact XML structure below.
2. If the RAG Context (PROJECT PAGE OBJECT CONTEXT) provides a suitable page object, use it! But if no exact context is provided (or it's missing the required methods), you MUST generate a new, fully populated Page Object Model file that handles all the locators and actions described in the Jira ticket.
3. The Spec file MUST import the Page Object you provide.
4. Output your response strictly wrapped in XML tags as shown:

<pom>
  <filename>FeatureNamePage.ts</filename>
  <code>
    ... TypeScript POM Class goes here ...
  </code>
</pom>
<spec>
  <filename>ticket-id.test.ts</filename>
  <code>
    ... Playwright Test matching Jira AC goes here ...
  </code>
</spec>

${ragContext}
  `;

  const userPrompt = `
Jira Ticket: ${ticketId}
Summary: ${summary}
Acceptance Criteria:
${description}

Please generate the Playwright files using the strict XML format.
  `;

  console.log(`\n🤖 Sending strict XML generation requirements to Claude (${CLAUDE_MODEL})...`);

  const response = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4000, // Increased to support 2 files
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API failed. Status: ${response.status} - ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.content[0].text;
}

function extractXML(responseString: string, tag: string) {
  const fileRegex = new RegExp(
    `<${tag}>[\\s\\S]*?<filename>(.*?)<\\/filename>[\\s\\S]*?<code>([\\s\\S]*?)<\\/code>[\\s\\S]*?<\\/${tag}>`,
    'i'
  );
  const match = responseString.match(fileRegex);

  if (match && match.length >= 3) {
    let cleanCode = match[2].trim();
    if (cleanCode.startsWith('```typescript')) {
      cleanCode = cleanCode.replace(/```typescript\n|```/g, '');
    }
    return {
      filename: match[1].trim(),
      code: cleanCode,
    };
  }
  return null;
}

async function main() {
  const ticketId = process.argv[2];

  if (!ticketId) {
    console.error('❌ Please provide a ticket ID. Example: npm run test:generate -- SCRUM-5');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Connecting to Jira for Ticket: ${ticketId}...`);
    const { summary, description } = await fetchJiraTicket(ticketId);
    console.log(`✅ Fetched Jira details: "${summary}"`);

    const llmResponse = await generatePlaywrightTest(ticketId, summary, description);

    const pomFile = extractXML(llmResponse, 'pom');
    const specFile = extractXML(llmResponse, 'spec');

    if (!pomFile && !specFile) {
      throw new Error('Failed to parse XML from LLM response. The AI might have deviated from the required structure.');
    }

    // Save POM File
    if (pomFile) {
      const pagesDir = path.resolve(__dirname, '../pages');
      if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

      const pomPath = path.join(pagesDir, pomFile.filename);
      fs.writeFileSync(pomPath, pomFile.code);
      console.log(`\n📄 Created Page Object successfully! saved to:\n➡️  ${pomPath}`);
    }

    // Save Spec File
    if (specFile) {
      const testsDir = path.resolve(__dirname, '../tests/e2e/generated');
      if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });

      const specPath = path.join(testsDir, specFile.filename);
      fs.writeFileSync(specPath, specFile.code);
      console.log(`\n🧪 Created Spec successfully! saved to:\n➡️  ${specPath}\n`);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
