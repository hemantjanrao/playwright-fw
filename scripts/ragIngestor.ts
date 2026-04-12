import * as fs from 'fs';
import * as path from 'path';

// Transformers.js handles running ML models locally on CPU
import { pipeline, env } from '@xenova/transformers';

// Disable setting local model paths to ensure it pulls from HuggingFace on first run
env.localModelPath = '';
env.allowRemoteModels = true;

const DB_PATH = path.resolve(__dirname, 'rag-db.json');
const PAGES_DIR = path.resolve(__dirname, '../pages');

interface RAGDocument {
  id: string;
  filename: string;
  content: string;
  embedding: number[];
}

async function getEmbedding(
  text: string,
  extractor: (input: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>
): Promise<number[]> {
  // Extract embeddings
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function main() {
  console.log('🔄 Initializing Local Embedding Model (Xenova/all-MiniLM-L6-v2)...');
  console.log('⏳ (This might take a few seconds on first run to download the 22MB model)');

  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const files = fs.readdirSync(PAGES_DIR).filter(file => file.endsWith('.ts'));
  const db: RAGDocument[] = [];

  console.log(`\n📂 Found ${files.length} Page Object(s) to index.\n`);

  for (const file of files) {
    const filePath = path.join(PAGES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // To improve accuracy, we compress the text slightly (removing excessive spaces)
    const normalizedContent = content.replace(/\s+/g, ' ').trim();

    console.log(`🧠 Generating mathematical embedding for: ${file}`);
    const embedding = await getEmbedding(normalizedContent, extractor);

    db.push({
      id: file,
      filename: file,
      content, // we store the full content so we can inject it exactly as written
      embedding,
    });
  }

  // Save our lightweight database
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  console.log(`\n✅ Successfully ingested ${files.length} documents into the Vector DB!`);
  console.log(`💾 Saved to: ${DB_PATH}`);
}

main().catch(console.error);
