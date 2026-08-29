/**
 * Packaging categories for BCRS eligibility classification.
 *
 * Each category maps to a BCRS material type and eligibility status:
 *   can/aluminium  → aluminium → eligible
 *   can/steel      → steel     → eligible
 *   bottle/plastic → pet       → eligible (if 150ml–3L)
 *   bottle/glass   → glass     → not eligible
 *   packet/tetrapak → other    → not eligible
 */
export type PackagingCategory =
  | "can/aluminium"
  | "can/steel"
  | "bottle/plastic"
  | "bottle/glass"
  | "packet/tetrapak";

export interface ClassificationResult {
  category: PackagingCategory;
  confidence: number;
  /** Top-3 predictions sorted by confidence */
  predictions: Array<{ category: PackagingCategory; confidence: number }>;
  /** BCRS material hint derived from the visual classification */
  materialHint: "aluminium" | "steel" | "pet" | "glass" | "other";
  /** Whether this packaging type is eligible for BCRS (material-level only, size not checked) */
  bcrsEligible: boolean;
  /** Human-readable label */
  label: string;
}

export interface ClassifierState {
  /** Whether the model has finished loading */
  ready: boolean;
  /** Loading progress message */
  loadingMessage: string | null;
  /** Any error during model loading */
  error: string | null;
}

/** Reference embedding stored per category for few-shot classification */
export interface ReferenceEmbedding {
  category: PackagingCategory;
  /** 1024-dim MobileNet v2 embedding, stored as Float32Array */
  embedding: number[];
}

/** Shape of the cached reference embeddings file */
export interface ReferenceEmbeddingsStore {
  version: number;
  generatedAt: string;
  embeddings: ReferenceEmbedding[];
}
