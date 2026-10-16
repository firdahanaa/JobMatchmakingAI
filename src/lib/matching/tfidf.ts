export interface TextDocumentCandidate {
  id: string;
  text: string;
}

export interface RankedTextDocument extends TextDocumentCandidate {
  similarity: number;
}

export interface TalentTextSource {
  headline?: string | null;
  bio?: string | null;
  skills: readonly { name: string }[];
}

export interface ProjectTextSource {
  title: string;
  description: string;
  skills: readonly { name: string }[];
}

export const RECOMMENDATION_WEIGHTS = {
  compositeMatch: 0.8,
  textSimilarity: 0.2,
} as const;

function tokenize(text: string): string[] {
  return text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function termFrequencies(tokens: readonly string[]): Map<string, number> {
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  return frequencies;
}

function buildIdfMap(documents: readonly (readonly string[])[]): Map<string, number> {
  const documentFrequencies = new Map<string, number>();
  for (const tokens of documents) {
    for (const term of new Set(tokens)) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
  }

  return new Map(
    Array.from(documentFrequencies, ([term, documentFrequency]) => [
      term,
      Math.log((documents.length + 1) / (documentFrequency + 1)) + 1,
    ])
  );
}

function tfIdfVector(
  tokens: readonly string[],
  idf: ReadonlyMap<string, number>
): Map<string, number> {
  if (tokens.length === 0) return new Map();

  const frequencies = termFrequencies(tokens);
  return new Map(
    Array.from(frequencies, ([term, frequency]) => [
      term,
      (frequency / tokens.length) * (idf.get(term) ?? 0),
    ])
  );
}

function cosineSimilarity(
  left: ReadonlyMap<string, number>,
  right: ReadonlyMap<string, number>
): number {
  let dotProduct = 0;
  let leftNormSquared = 0;
  let rightNormSquared = 0;

  for (const [term, weight] of left) {
    leftNormSquared += weight * weight;
    dotProduct += weight * (right.get(term) ?? 0);
  }
  for (const weight of right.values()) {
    rightNormSquared += weight * weight;
  }

  const denominator = Math.sqrt(leftNormSquared) * Math.sqrt(rightNormSquared);
  if (denominator === 0) return 0;
  const similarity = dotProduct / denominator;
  if (similarity >= 1 - Number.EPSILON * 8) return 1;
  return Math.min(1, Math.max(0, similarity));
}

/**
 * Scores two documents using smoothed IDF over the supplied corpus.
 * Both documents are added to the corpus if not already present.
 */
export function calculateTfIdfCosineSimilarity(
  leftDocument: string,
  rightDocument: string,
  corpus: readonly string[] = [leftDocument, rightDocument]
): number {
  const documents = [...corpus];
  if (!documents.includes(leftDocument)) documents.push(leftDocument);
  if (!documents.includes(rightDocument)) documents.push(rightDocument);
  const tokenizedDocuments = documents.map(tokenize);
  const idf = buildIdfMap(tokenizedDocuments);

  return cosineSimilarity(
    tfIdfVector(tokenize(leftDocument), idf),
    tfIdfVector(tokenize(rightDocument), idf)
  );
}

/**
 * Ranks candidates against one query using one shared IDF corpus made from
 * the query and all candidate documents, ensuring comparable scores.
 */
export function rankDocumentsBySimilarity(
  queryDocument: string,
  candidates: readonly TextDocumentCandidate[]
): RankedTextDocument[] {
  const tokenizedDocuments = [
    tokenize(queryDocument),
    ...candidates.map((candidate) => tokenize(candidate.text)),
  ];
  const idf = buildIdfMap(tokenizedDocuments);
  const queryVector = tfIdfVector(tokenizedDocuments[0], idf);

  return candidates
    .map((candidate, index) => ({
      ...candidate,
      similarity: cosineSimilarity(
        queryVector,
        tfIdfVector(tokenizedDocuments[index + 1], idf)
      ),
      index,
    }))
    .sort((left, right) => right.similarity - left.similarity || left.index - right.index)
    .map(({ id, text, similarity }) => ({ id, text, similarity }));
}

export function buildTalentTextDocument(source: TalentTextSource): string {
  return [source.headline, source.bio, ...source.skills.map((skill) => skill.name)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}

export function buildProjectTextDocument(source: ProjectTextSource): string {
  return [source.title, source.description, ...source.skills.map((skill) => skill.name)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}

export function combineRecommendationScores(
  compositeMatchScore: number,
  textSimilarity: number
): number {
  return (
    RECOMMENDATION_WEIGHTS.compositeMatch * compositeMatchScore +
    RECOMMENDATION_WEIGHTS.textSimilarity * textSimilarity * 100
  );
}
