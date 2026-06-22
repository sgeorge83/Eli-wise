import webChunks from "../knowledge/chunks/web.json" with { type: "json" };
import wscChunks from "../knowledge/chunks/wsc.json" with { type: "json" };
import eastonChunks from "../knowledge/chunks/easton.json" with { type: "json" };
import mhcChunks from "../knowledge/chunks/mhc.json" with { type: "json" };
import creedChunks from "../knowledge/chunks/creeds.json" with { type: "json" };
import sources from "../knowledge/sources.json" with { type: "json" };

const allChunks = [
  ...webChunks,
  ...wscChunks,
  ...eastonChunks,
  ...mhcChunks,
  ...creedChunks,
];

export function getKnowledgeChunks() {
  return allChunks;
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
