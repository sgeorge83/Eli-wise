import { formatSourceCitation, getKnowledgeChunks } from "./knowledge.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "can", "what", "who", "whom", "whose", "which", "where", "when", "why", "how", "about",
  "tell", "me", "explain", "please", "give", "mean", "means", "meaning", "say", "says",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s':-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreChunk(chunk, queryTokens, rawQuery) {
  let score = 0;
  const haystack = [
    chunk.text,
    chunk.reference,
    ...(chunk.topics || []),
    ...(chunk.keywords || []),
  ]
    .join(" ")
    .toLowerCase();

  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 2;
  }

  for (const topic of chunk.topics || []) {
    const topicTokens = topic.toLowerCase().split(/\s+/);
    if (topicTokens.every((part) => rawQuery.includes(part))) score += 5;
  }

  if (chunk.reference && rawQuery.includes(chunk.reference.toLowerCase())) {
    score += 12;
  }

  const referenceMatch = rawQuery.match(
    /\b(?:1|2|3)?\s?(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm?s?|proverbs|ecclesiastes|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\b/i
  );

  if (referenceMatch && chunk.reference.toLowerCase().includes(referenceMatch[0].trim().toLowerCase())) {
    score += 15;
  }

  return score;
}

export function retrieveRelevantChunks(query, limit = 5) {
  const chunks = getKnowledgeChunks();
  const rawQuery = query.toLowerCase();
  const queryTokens = tokenize(query);

  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTokens, rawQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ chunk, score }) => ({
    ...chunk,
    score,
    citation: formatSourceCitation(chunk),
  }));
}

export function buildContextBlock(chunks) {
  if (!chunks.length) {
    return "No directly matching knowledge-base passages were retrieved.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}] ${chunk.citation.title} — ${chunk.citation.reference}\n${chunk.text}`
    )
    .join("\n\n");
}

export function uniqueCitations(chunks) {
  const seen = new Set();
  const citations = [];

  for (const chunk of chunks) {
    const key = `${chunk.citation.title}|${chunk.citation.reference}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(chunk.citation);
  }

  return citations;
}
