import { readFileSync } from "fs";
import { join } from "path";

let cachedChunks = null;
let cachedSources = null;

function loadJson(relativePath) {
  const filePath = join(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function getKnowledgeChunks() {
  if (!cachedChunks) {
    cachedChunks = loadJson("knowledge/chunks.json");
  }
  return cachedChunks;
}

export function getKnowledgeSources() {
  if (!cachedSources) {
    cachedSources = loadJson("knowledge/sources.json");
  }
  return cachedSources;
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
