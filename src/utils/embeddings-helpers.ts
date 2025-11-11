import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import type { KDBConfig } from '../settings.js';

// Global cache for CSV data
let csvCache: Map<string, any[]> = new Map();

export interface EmbeddingConfig {
  embeddingColumn: string | null;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  sparseEmbeddingColumn: string | null;
  sparseIndexName: string | null;
  sparseTokenizerProvider: string | null;
  sparseTokenizerModel: string | null;
}

function getCsvData(csvPath: string): any[] {
  if (csvCache.has(csvPath)) {
    return csvCache.get(csvPath)!;
  }

  try {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      cast: (value: string) => (value === '' ? null : value),
    }) as any[];
    csvCache.set(csvPath, records);
    return records;
  } catch (e) {
    throw new Error(`Failed to read embeddings CSV: ${e}`);
  }
}

export function getEmbeddingConfig(
  table: string,
  config: KDBConfig
): EmbeddingConfig {
  const df = getCsvData(config.embeddingCsvPath);
  const matchingRows = df.filter((row: any) => row.table === table);

  if (matchingRows.length === 0) {
    throw new Error(`No configuration found for table='${table}'`);
  } else if (matchingRows.length > 1) {
    throw new Error(
      `Multiple configurations found for table='${table}'. Please ensure each table has only one configuration row.`
    );
  }

  const row = matchingRows[0];
  return {
    embeddingColumn: row.embedding_column || null,
    embeddingProvider: row.embedding_provider || null,
    embeddingModel: row.embedding_model || null,
    sparseEmbeddingColumn: row.sparse_embedding_column || null,
    sparseIndexName: row.sparse_index_name || null,
    sparseTokenizerProvider: row.sparse_tokenizer_provider || null,
    sparseTokenizerModel: row.sparse_tokenizer_model || null,
  };
}

