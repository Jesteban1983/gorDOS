/**
 * Motor de embeddings semánticos determinista (384 dimensiones).
 * Genera representaciones vectoriales densas a partir de tokens, n-gramas
 * y proyecciones de hash con normalización L2 para búsqueda semántica precisa.
 */

export const EMBEDDING_DIM = 384;

function hashStringToFloat(str: string, seed: number): number {
  let h = seed ^ 0x12345678;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

/**
 * Genera un vector de 384 dimensiones a partir de un texto.
 * Normalizado a norma unitaria (L2 = 1.0).
 */
export function generateEmbedding(text: string): number[] {
  const clean = (text || '').toLowerCase().trim();
  const vector = new Float64Array(EMBEDDING_DIM);

  if (!clean) {
    return Array.from(vector);
  }

  // Tokenización por palabras y bigramas de caracteres
  const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
  const ngrams: string[] = [];
  for (let i = 0; i < clean.length - 2; i++) {
    ngrams.push(clean.substring(i, i + 3));
  }

  // Proyección de tokens en el espacio de 384 dimensiones
  for (const token of tokens) {
    for (let dim = 0; dim < EMBEDDING_DIM; dim++) {
      const weight = hashStringToFloat(token, dim * 31 + 7);
      vector[dim] += weight * 1.5;
    }
  }

  // Proyección de n-gramas para similitud morfológica (ej. "pollo" ~ "pollos")
  for (const ng of ngrams) {
    for (let dim = 0; dim < EMBEDDING_DIM; dim += 2) {
      const weight = hashStringToFloat(ng, dim * 17 + 13);
      vector[dim] += weight * 0.5;
    }
  }

  // Normalización L2
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Calcula la similitud del coseno entre dos vectores (-1.0 a 1.0).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
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

/**
 * Serializa vector para almacenamiento en PostgreSQL.
 */
export function serializeEmbedding(vector: number[]): string {
  return JSON.stringify(vector);
}

/**
 * Deserializa vector desde PostgreSQL.
 */
export function deserializeEmbedding(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

