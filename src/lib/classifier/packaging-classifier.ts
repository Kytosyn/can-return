import type {
  PackagingCategory,
  ClassificationResult,
  ClassifierState,
  ReferenceEmbedding,
} from "./types";

// --- Constants ---

const CATEGORY_META: Record<
  PackagingCategory,
  { material: ClassificationResult["materialHint"]; eligible: boolean; label: string }
> = {
  "can/aluminium": { material: "aluminium", eligible: true, label: "Aluminium Can" },
  "can/steel": { material: "steel", eligible: true, label: "Steel Can" },
  "bottle/plastic": { material: "pet", eligible: true, label: "Plastic Bottle (PET)" },
  "bottle/glass": { material: "glass", eligible: false, label: "Glass Bottle" },
  "packet/tetrapak": { material: "other", eligible: false, label: "Tetra Pak / Carton" },
};

const EMBEDDING_DIM = 1280; // MobileNet v2 output dimension

// --- Singleton state ---

let mobilenetModel: any = null;
let tf: any = null;
let referenceEmbeddings: ReferenceEmbedding[] = [];
let state: ClassifierState = { ready: false, loadingMessage: null, error: null };
const listeners = new Set<(s: ClassifierState) => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...state }));
}

export function subscribeClassifier(fn: (s: ClassifierState) => void): () => void {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

export function getClassifierState(): ClassifierState {
  return { ...state };
}

// --- Model loading ---

export async function initClassifier(): Promise<void> {
  if (state.ready) return;
  if (state.loadingMessage) return; // already loading

  state = { ready: false, loadingMessage: "Loading TensorFlow.js…", error: null };
  notifyListeners();

  try {
    // Dynamic import to code-split the heavy TF.js bundle
    tf = await import("@tensorflow/tfjs");

    state.loadingMessage = "Loading MobileNet model (~8 MB, cached after first load)…";
    notifyListeners();

    const mobilenet = await import("@tensorflow-models/mobilenet");
    mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });

    state.loadingMessage = "Computing reference embeddings…";
    notifyListeners();

    // In production, load pre-computed embeddings from a JSON file.
    // For the scaffold, generate placeholder embeddings so the architecture works.
    referenceEmbeddings = generatePlaceholderEmbeddings();

    state = { ready: true, loadingMessage: null, error: null };
    notifyListeners();
  } catch (err: any) {
    state = {
      ready: false,
      loadingMessage: null,
      error: `Failed to load model: ${err.message}`,
    };
    notifyListeners();
    throw err;
  }
}

// --- Inference ---

/**
 * Compute a MobileNet v2 embedding (1280-dim Float32Array) from an image element.
 */
export async function computeEmbedding(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<Float32Array> {
  if (!mobilenetModel || !tf) throw new Error("Classifier not initialised");

  // mobilenet.infer returns a 3D tensor; passing true gives the internal activation
  const activation = mobilenetModel.infer(image, true);
  const squeezed = activation.squeeze();
  const arr = await squeezed.data();
  activation.dispose();
  squeezed.dispose();
  return new Float32Array(arr);
}

/**
 * Classify a container image against the reference embeddings.
 * Returns the best-matching category with confidence scores.
 */
export async function classifyPackaging(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<ClassificationResult> {
  if (!state.ready) throw new Error("Classifier not initialised — call initClassifier() first");

  const embedding = await computeEmbedding(image);

  // Compute cosine similarity against each reference embedding
  const similarities = referenceEmbeddings.map((ref) => ({
    category: ref.category,
    similarity: cosineSimilarity(embedding, new Float32Array(ref.embedding)),
  }));

  // Group by category and average similarities (multiple refs per category)
  const categoryScores = new Map<PackagingCategory, number[]>();
  for (const s of similarities) {
    const existing = categoryScores.get(s.category) ?? [];
    existing.push(s.similarity);
    categoryScores.set(s.category, existing);
  }

  const averaged: Array<{ category: PackagingCategory; avg: number }> = [];
  for (const [category, scores] of categoryScores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    averaged.push({ category, avg });
  }

  // Normalize to softmax-like probabilities
  averaged.sort((a, b) => b.avg - a.avg);
  const total = averaged.reduce((sum, x) => sum + Math.exp(x.avg), 0);
  const predictions = averaged.map((x) => ({
    category: x.category,
    confidence: Math.exp(x.avg) / total,
  }));

  const best = predictions[0];
  const meta = CATEGORY_META[best.category];

  return {
    category: best.category,
    confidence: best.confidence,
    predictions: predictions.slice(0, 3),
    materialHint: meta.material,
    bcrsEligible: meta.eligible,
    label: meta.label,
  };
}

// --- Utilities ---

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate placeholder reference embeddings.
 *
 * In production these would be loaded from a JSON file computed offline
 * from labelled reference images. The placeholders use random unit vectors
 * so the architecture is fully wired — swap in real embeddings to get
 * accurate classification.
 */
function generatePlaceholderEmbeddings(): ReferenceEmbedding[] {
  const categories: PackagingCategory[] = [
    "can/aluminium",
    "can/steel",
    "bottle/plastic",
    "bottle/glass",
    "packet/tetrapak",
  ];

  // Each category gets3 reference embeddings for robustness
  const refs: ReferenceEmbedding[] = [];
  for (const cat of categories) {
    for (let i = 0; i < 3; i++) {
      const emb = new Array(EMBEDDING_DIM);
      for (let j = 0; j < EMBEDDING_DIM; j++) {
        emb[j] = Math.random() * 2 - 1;
      }
      // Normalize to unit vector
      const norm = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
      refs.push({
        category: cat,
        embedding: emb.map((v) => v / norm),
      });
    }
  }
  return refs;
}

/**
 * Utility: capture a still frame from a video element to a canvas.
 * Useful for passing to classifyPackaging().
 */
export function videoToCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Utility: load an image file (from <input type="file">) into an HTMLImageElement.
 */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
