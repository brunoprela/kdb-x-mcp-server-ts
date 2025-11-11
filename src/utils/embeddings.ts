import OpenAI from 'openai';
import { pipeline, env } from '@xenova/transformers';
import type { Logger } from './logging.js';

// Disable local model downloads warning
env.allowLocalModels = false;

export interface EmbeddingProvider {
    denseEmbed(text: string, modelName: string): Promise<number[]>;
    sparseEmbed(text: string, modelName: string): Promise<Record<string, number>>;
    cleanup?(): void;
}

// Provider registry
const providerRegistry = new Map<string, () => EmbeddingProvider>();

export function registerProvider(name: string, factory: () => EmbeddingProvider): void {
    providerRegistry.set(name, factory);
}

export function getProvider(name: string): EmbeddingProvider {
    const factory = providerRegistry.get(name);
    if (!factory) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return factory();
}

// OpenAI Provider
class OpenAIProvider implements EmbeddingProvider {
    private client: OpenAI | null = null;

    private getClient(): OpenAI {
        if (!this.client) {
            this.client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.client;
    }

    async denseEmbed(text: string, modelName: string): Promise<number[]> {
        const client = this.getClient();
        const response = await client.embeddings.create({
            model: modelName,
            input: text,
        });
        return response.data[0].embedding;
    }

    async sparseEmbed(_text: string, _modelName: string): Promise<Record<string, number>> {
        // For OpenAI, we use tiktoken-like tokenization
        // Note: This is a simplified version. For production, use tiktoken library
        // or implement proper tokenization
        const tokens = _text.split(/\s+/);
        const tokenCounts: Record<string, number> = {};
        for (const token of tokens) {
            // Simple hash-based token ID (in production, use actual tokenizer)
            const tokenId = this.simpleHash(token);
            tokenCounts[tokenId] = (tokenCounts[tokenId] || 0) + 1;
        }
        return tokenCounts;
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return String(Math.abs(hash));
    }

    cleanup(): void {
        this.client = null;
    }
}

// SentenceTransformers Provider (using @xenova/transformers)
class SentenceTransformerProvider implements EmbeddingProvider {
    private modelCache = new Map<string, any>();

    async getModel(modelName: string): Promise<any> {
        if (this.modelCache.has(modelName)) {
            return this.modelCache.get(modelName);
        }

        const model = await pipeline('feature-extraction', modelName);
        this.modelCache.set(modelName, model);
        return model;
    }

    async denseEmbed(text: string, modelName: string): Promise<number[]> {
        const model = await this.getModel(modelName);
        const output = await model(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    async sparseEmbed(_text: string, modelName: string): Promise<Record<string, number>> {
        // For sentence transformers, we can use the tokenizer if available
        await this.getModel(modelName);
        // Simple tokenization fallback
        const tokens = _text.split(/\s+/);
        const tokenCounts: Record<string, number> = {};
        for (const token of tokens) {
            const tokenId = this.simpleHash(token);
            tokenCounts[tokenId] = (tokenCounts[tokenId] || 0) + 1;
        }
        return tokenCounts;
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return String(Math.abs(hash));
    }

    cleanup(): void {
        this.modelCache.clear();
    }
}

// Register providers
registerProvider('openai', () => new OpenAIProvider());
registerProvider('sentence_transformers', () => new SentenceTransformerProvider());

// Preload models from config
export async function preloadModelsFromConfig(
    embeddingCsvPath: string,
    logger: Logger
): Promise<void> {
    try {
        const { readFileSync } = await import('fs');
        const { parse } = await import('csv-parse/sync');

        const content = readFileSync(embeddingCsvPath, 'utf-8');
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
        }) as any[];

        const uniqueConfigs = new Set<string>();
        const sparseConfigs = new Set<string>();

        for (const row of records) {
            if (row.embedding_provider && row.embedding_model) {
                uniqueConfigs.add(`${row.embedding_provider}:${row.embedding_model}`);
            }
            if (row.sparse_tokenizer_provider && row.sparse_tokenizer_model) {
                sparseConfigs.add(`${row.sparse_tokenizer_provider}:${row.sparse_tokenizer_model}`);
            }
        }

        logger.info('Preloading embedding models...');

        // Preload dense models
        for (const config of uniqueConfigs) {
            const [providerName, modelName] = config.split(':');
            try {
                const provider = getProvider(providerName);
                if (providerName === 'sentence_transformers') {
                    await (provider as SentenceTransformerProvider).getModel(modelName);
                }
                logger.info(`Preloaded ${config}`);
            } catch (e) {
                logger.warn(`Failed to preload ${config} - ${e}`);
            }
        }

        // Preload sparse tokenizers
        for (const config of sparseConfigs) {
            const [providerName, modelName] = config.split(':');
            try {
                const provider = getProvider(providerName);
                if (providerName === 'sentence_transformers') {
                    await (provider as SentenceTransformerProvider).getModel(modelName);
                }
                logger.info(`Preloaded sparse tokenizer ${config}`);
            } catch (e) {
                logger.warn(`Failed to preload sparse tokenizer ${config} - ${e}`);
            }
        }

        logger.info('Model preloading completed');
    } catch (e) {
        logger.error(`Error during model preloading: ${e}`);
    }
}

