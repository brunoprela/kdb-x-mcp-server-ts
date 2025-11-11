import type { Logger } from './logging.js';
import type { KDBConfig } from '../settings.js';
import { getEmbeddingConfig } from './embeddings-helpers.js';

export interface TableRow {
    [key: string]: any;
}

export function removeVectorColumns(
    data: TableRow[],
    tableName: string,
    config: KDBConfig,
    logger: Logger
): TableRow[] {
    try {
        const embeddingConfig = getEmbeddingConfig(tableName, config);
        const embeddingColumn = embeddingConfig.embeddingColumn;
        const sparseEmbeddingColumn = embeddingConfig.sparseEmbeddingColumn;

        return data.map((row) => {
            const newRow = { ...row };
            if (embeddingColumn && embeddingColumn in newRow) {
                delete newRow[embeddingColumn];
                logger.debug(`Removed embedding column '${embeddingColumn}' from results`);
            }
            if (sparseEmbeddingColumn && sparseEmbeddingColumn in newRow) {
                delete newRow[sparseEmbeddingColumn];
                logger.debug(`Removed sparse embedding column '${sparseEmbeddingColumn}' from results`);
            }
            return newRow;
        });
    } catch (e) {
        logger.debug(`Could not get embedding config for table ${tableName}: ${e}`);
        return data;
    }
}

export function formatDataForDisplay(data: any, _tableName?: string, _logger?: Logger): string {
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return 'No data';
        }
        // Format as table
        const headers = Object.keys(data[0]);
        const rows = data.map((row) => headers.map((h) => String(row[h] ?? '')));
        const colWidths = headers.map((h, i) =>
            Math.max(h.length, ...rows.map((r) => r[i].length))
        );

        const formatRow = (values: string[]) =>
            '  ' + values.map((v, i) => v.padEnd(colWidths[i])).join(' | ');

        const lines = [
            formatRow(headers),
            '  ' + colWidths.map((w) => '-'.repeat(w)).join('-|-'),
            ...rows.map(formatRow),
        ];

        return lines.join('\n');
    }

    if (typeof data === 'object' && data !== null) {
        // Format schema/metadata
        const lines: string[] = [];
        for (const [key, value] of Object.entries(data)) {
            const keyStr = Array.isArray(key) ? key[0] : String(key);
            if (typeof value === 'object' && value !== null) {
                const t = (value as any).t ?? '';
                const f = (value as any).f ?? '';
                const a = (value as any).a ?? '';
                lines.push(`  ${keyStr.padEnd(20)} | type=${String(t).padEnd(3)} | f=${String(f).padEnd(5)} | a=${a}`);
            } else {
                lines.push(`  ${keyStr}: ${String(value)}`);
            }
        }
        return lines.join('\n');
    }

    return String(data);
}

export function normalizeSearchResult(
    data: TableRow[],
    tableName: string,
    config: KDBConfig,
    logger: Logger
): TableRow[] {
    // Convert timespan/duration types
    const normalized = data.map((row) => {
        const newRow: TableRow = {};
        for (const [key, value] of Object.entries(row)) {
            // Handle time types - convert to ISO string if needed
            if (value instanceof Date) {
                newRow[key] = value.toISOString();
            } else if (typeof value === 'object' && value !== null && 'toISOString' in value) {
                newRow[key] = (value as any).toISOString();
            } else {
                newRow[key] = value;
            }
        }
        return newRow;
    });

    return removeVectorColumns(normalized, tableName, config, logger);
}

