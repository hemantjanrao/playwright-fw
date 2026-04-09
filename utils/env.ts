import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define exactly what the environment variables should look like
const envSchema = z.object({
  BASE_URL: z.string().url().default('https://careers.osapiens.com'),
  CI: z.string().optional(),
  // Add more dynamic environment variables here as the framework grows
  // For example:
  // API_TOKEN: z.string().min(10, 'Token must be at least 10 chars'),
  // TIMEOUT: z.coerce.number().default(30000),
});

// Parse and validate the environment
// This will throw a very clear, easy-to-read error if any variable is missing or wrong type
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
