/**
 * Notion integration utilities
 */

import { Client } from '@notionhq/client';
import { Env, BenchmarkRun } from './types';

/**
 * Create a Notion client from environment variables
 */
export function createNotionClient(env: Env): Client | null {
  if (!env.NOTION_TOKEN) {
    return null;
  }

  return new Client({
    auth: env.NOTION_TOKEN,
  });
}

/**
 * Sync a benchmark run to Notion
 */
export async function syncToNotion(
  client: Client,
  databaseId: string,
  run: BenchmarkRun
): Promise<void> {
  // TODO: Implement Notion page creation
  // This would create a page in the Notion database with all the benchmark data
}
