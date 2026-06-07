// Load model TF.js + dự đoán nhãn từ chuỗi landmark
import * as tf from "@tensorflow/tfjs";
import {
  MODEL_URL,
  LABELS_URL,
  SEQ_LEN,
  FEATURES_PER_FRAME,
} from "./constants";

let model: tf.LayersModel | null = null;
let labels: string[] = [];

export interface Prediction {
  label: string;
  confidence: number;
}

export async function loadClassifier(): Promise<void> {
  if (model && labels.length) return;
  const [m, res] = await Promise.all([
    tf.loadLayersModel(MODEL_URL),
    fetch(LABELS_URL),
  ]);
  model = m;
  labels = await res.json();
}

export function getLabels(): string[] {
  return labels;
}

export function isReady(): boolean {
  return !!model && labels.length > 0;
}

// sequence: Float32Array(SEQ_LEN * FEATURES_PER_FRAME) -> Prediction
export async function predict(sequence: Float32Array): Promise<Prediction> {
  if (!model) throw new Error("Model chưa load");
  const input = tf.tensor(sequence, [1, SEQ_LEN, FEATURES_PER_FRAME]);
  const output = model.predict(input) as tf.Tensor;
  const probs = (await output.data()) as Float32Array;
  input.dispose();
  output.dispose();

  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }
  return { label: labels[best] ?? "?", confidence: probs[best] };
}
