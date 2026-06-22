import chunks from "../knowledge/chunks.json" with { type: "json" };
import sources from "../knowledge/sources.json" with { type: "json" };

export function getKnowledgeChunks() {
  return chunks;
}

export function getKnowledgeSources() {
  return sources;
}

export function getSourceById(sourceId) {
  return getKnowledgeSources().find((source) => source.id === sourceId) || null;
}

export function formatSourceCitation(chunk) {
  const source = getSourceById(chunk.sourceId);
  return {
    id: chunk.id,
    title: source?.name || chunk.sourceId,
    reference: chunk.reference,
    type: source?.type || "Reference",
    url: source?.url || null,
  };
}
