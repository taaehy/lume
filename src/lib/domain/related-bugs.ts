export type RelatedBugCandidate = {
  id: string;
  title: string;
  module: string;
  description?: string;
};

export type RelatedBugMatch = RelatedBugCandidate & {
  similarity: number;
  sharedTerms: string[];
};

const stopWords = new Set([
  "a",
  "ao",
  "após",
  "com",
  "da",
  "de",
  "do",
  "e",
  "em",
  "erro",
  "na",
  "no",
  "o",
  "para",
  "por",
  "que",
  "retorna",
  "um",
  "uma",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, " ")
    .trim();
}

export function extractTerms(value: string) {
  return Array.from(
    new Set(
      normalize(value)
        .split(/\s+/)
        .filter((term) => term.length >= 3 && !stopWords.has(term)),
    ),
  );
}

function jaccard(left: Set<string>, right: Set<string>) {
  const intersection = [...left].filter((term) => right.has(term)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function findRelatedBugs(
  input: { title: string; description?: string; module?: string },
  candidates: readonly RelatedBugCandidate[],
  minimumSimilarity = 0.18,
) {
  const inputTerms = new Set(
    extractTerms(`${input.title} ${input.description ?? ""}`),
  );
  const inputModule = normalize(input.module ?? "");

  return candidates
    .map((candidate): RelatedBugMatch => {
      const candidateTerms = new Set(
        extractTerms(`${candidate.title} ${candidate.description ?? ""}`),
      );
      const textSimilarity = jaccard(inputTerms, candidateTerms);
      const sameModule =
        Boolean(inputModule) && normalize(candidate.module) === inputModule;
      const similarity = Math.min(
        1,
        textSimilarity * 0.82 + (sameModule ? 0.18 : 0),
      );

      return {
        ...candidate,
        similarity: Math.round(similarity * 100),
        sharedTerms: [...inputTerms].filter((term) => candidateTerms.has(term)),
      };
    })
    .filter((candidate) => candidate.similarity >= minimumSimilarity * 100)
    .sort((left, right) => right.similarity - left.similarity);
}
