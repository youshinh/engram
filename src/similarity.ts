import { Note } from './db';

/**
 * 2つのベクトルの内積を計算する
 * @param vec1 ベクトル1
 * @param vec2 ベクトル2
 * @returns 内積
 */
export function dotProduct(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must be of the same length");
  }
  let product = 0;
  for (let i = 0; i < vec1.length; i++) {
    product += vec1[i] * vec2[i];
  }
  return product;
}

/**
 * ベクトルの大きさを計算する
 * @param vec ベクトル
 * @returns ベクトルの大きさ
 */
export function magnitude(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * 2つのベクトルのコサイン類似度を計算する
 * @param vec1 ベクトル1
 * @param vec2 ベクトル2
 * @returns コサイン類似度
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dot = dotProduct(vec1, vec2);
  const mag1 = magnitude(vec1);
  const mag2 = magnitude(vec2);

  if (mag1 === 0 || mag2 === 0) {
    return 0; // どちらかのベクトルがゼロベクトルの場合、類似度は0
  }

  return dot / (mag1 * mag2);
}

/**
 * 指定されたノートと類似度の高いノートを検索する
 * @param targetNote 比較対象のノート
 * @param allNotes 検索対象となる全てのノートの配列
 * @param threshold 類似度の閾値 (0から1)
 * @returns 類似度の高いノートの配列とそれぞれの類似度
 */
export function findSimilarNotes(
  targetNote: Note,
  allNotes: Note[],
  threshold: number = 0.7
): { note: Note; similarity: number }[] {
  if (!targetNote.embedding) {
    return []; // ターゲットノートにembeddingがない場合は検索しない
  }

  const similarNotes: { note: Note; similarity: number }[] = [];

  for (const note of allNotes) {
    // ターゲットノート自身は比較対象から除外
    // embeddingがないノートも除外
    if (note.id === targetNote.id || !note.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(targetNote.embedding, note.embedding);

    if (similarity >= threshold) {
      similarNotes.push({ note, similarity });
    }
  }

  // 類似度が高い順にソート
  return similarNotes.sort((a, b) => b.similarity - a.similarity);
}
