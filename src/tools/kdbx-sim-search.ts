import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import type { KDBConfig } from '../settings.js';
import { getKDBConnection } from '../utils/kdbx.js';
import { getProvider } from '../utils/embeddings.js';
import { getEmbeddingConfig } from '../utils/embeddings-helpers.js';
import { normalizeSearchResult } from '../utils/format-utils.js';
import { z } from 'zod';

export interface SearchResult {
  status: 'success' | 'error';
  table?: string;
  recordsCount?: number;
  records?: any[];
  message?: string;
}

async function kdbxSimilaritySearchImpl(
  tableName: string,
  query: string,
  n: number | undefined,
  config: KDBConfig,
  logger: Logger
): Promise<SearchResult> {
  try {
    const _k = n ?? config.k;
    const embeddingConfig = getEmbeddingConfig(tableName, config);

    if (!embeddingConfig.embeddingColumn || !embeddingConfig.embeddingProvider || !embeddingConfig.embeddingModel) {
      throw new Error(`Table ${tableName} does not have embedding configuration`);
    }

    const provider = getProvider(embeddingConfig.embeddingProvider);
    const _queryVector = await provider.denseEmbed(query, embeddingConfig.embeddingModel);

    const conn = await getKDBConnection(config, logger);

    // Execute similarity search - placeholder
    // In production, this would execute the actual KDB-X query
    const result = await conn.query(
      `{[args] .ai.flat.search[?[args\`table;();();args\`vcol];args\`qvec;args\`n;args\`metric]}`
    );

    const normalized = normalizeSearchResult(result, tableName, config, logger);

    return {
      status: 'success',
      table: tableName,
      recordsCount: normalized.length,
      records: normalized,
    };
  } catch (e: any) {
    logger.error(`Error performing search on table ${tableName}: ${e}`);
    return {
      status: 'error',
      message: String(e),
      table: tableName,
    };
  }
}

async function kdbxHybridSearchImpl(
  tableName: string,
  query: string,
  n: number | undefined,
  config: KDBConfig,
  logger: Logger
): Promise<SearchResult> {
  try {
    const _k = n ?? config.k;
    const embeddingConfig = getEmbeddingConfig(tableName, config);

    if (!embeddingConfig.sparseIndexName) {
      logger.info(`Error performing hybrid search on table ${tableName}: Missing sparse index`);
      return {
        status: 'error',
        message: 'The requested table does not have sparse index',
        table: tableName,
      };
    }

    if (!embeddingConfig.embeddingProvider || !embeddingConfig.embeddingModel) {
      throw new Error(`Table ${tableName} does not have embedding configuration`);
    }

    const denseProvider = getProvider(embeddingConfig.embeddingProvider);
    const sparseProvider =
      embeddingConfig.sparseTokenizerProvider === embeddingConfig.embeddingProvider
        ? denseProvider
        : getProvider(embeddingConfig.sparseTokenizerProvider || embeddingConfig.embeddingProvider);

    const _queryVector = await denseProvider.denseEmbed(query, embeddingConfig.embeddingModel);
    const _querySparse = await sparseProvider.sparseEmbed(
      query,
      embeddingConfig.sparseTokenizerModel || embeddingConfig.embeddingModel
    );

    const conn = await getKDBConnection(config, logger);

    // Execute hybrid search - placeholder
    const result = await conn.query(
      `{[args] .ai.hybrid.rrf[(.ai.flat.search[...];.ai.bm25.search[...]);60]}`
    );

    if (!result || (Array.isArray(result) && result.length === 0)) {
      logger.info(
        `Hybrid search on table ${tableName} returned no results - sparse search may have found no matches`
      );
      return {
        status: 'success',
        table: tableName,
        recordsCount: 0,
        records: [],
        message: 'No results found - the sparse search returned no matches for the query',
      };
    }

    const normalized = normalizeSearchResult(result, tableName, config, logger);

    return {
      status: 'success',
      table: tableName,
      recordsCount: normalized.length,
      records: normalized,
    };
  } catch (e: any) {
    logger.error(`Error performing search on table ${tableName}: ${e}`);
    return {
      status: 'error',
      message: String(e),
      table: tableName,
    };
  }
}

export function registerTool(
  server: McpServer,
  config: KDBConfig,
  logger: Logger,
  aiLibsAvailable: boolean
): void {
  if (!aiLibsAvailable) {
    logger.info('AI Libs not available - skipping similarity search tools');
    return;
  }

  // Use the high-level registerTool API
  server.registerTool(
    'kdbx_similarity_search',
    {
      description: 'Perform vector similarity search on a KDB-X table.',
      inputSchema: {
        table_name: z.string().describe('Name of the table to search'),
        query: z.string().describe('Text query to convert to vector and search'),
        n: z.number().optional().describe('Number of results to return'),
      },
    },
    async ({ table_name, query, n }) => {
      const result = await kdbxSimilaritySearchImpl(table_name, query, n, config, logger);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'kdbx_hybrid_search',
    {
      description:
        'Performs hybrid search on a KDB-X table by combining both vector and text(sparse) search.',
      inputSchema: {
        table_name: z.string().describe('Name of the table to search'),
        query: z.string().describe('Text query to convert to sparse and dense vectors and search'),
        n: z.number().optional().describe('Number of results to return'),
      },
    },
    async ({ table_name, query, n }) => {
      const result = await kdbxHybridSearchImpl(table_name, query, n, config, logger);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}

