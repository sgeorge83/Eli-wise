import { isBibleOrTheologyQuestion, isMetaQuestion } from "../lib/guardrails.js";
import {
  buildContextBlock,
  isKnowledgeAvailable,
  retrieveRelevantChunks,
  uniqueCitations,
} from "../lib/rag.js";
import {
  DEFAULT_OPENAI_MODEL,
  KNOWLEDGE_NOT_AVAILABLE_MESSAGE,
  MAX_HISTORY_MESSAGES_TO_API,
  MAX_USER_MESSAGES_PER_SESSION,
  META_INTRO_MESSAGE,
  OFF_TOPIC_MESSAGE,
  SESSION_LIMIT_MESSAGE,
} from "../lib/config.js";

const OPENAI_BASE = "https://api.openai.com/v1";

function getModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };
}

function buildSystemPrompt(contextBlock) {
  return `You are ELI-WISE, a Bible and Christian theology assistant.

STRICT RULES:
1. Answer ONLY using the retrieved knowledge-base sources below. Do not use outside knowledge.
2. If the sources do not contain enough information to answer, say clearly that it is not available in the knowledge base. Do not guess or invent content.
3. Do not invent Bible verses, quotes, or doctrine not present in the sources.
4. Cite sources inline like (WEB, John 3:16) or (Westminster Shorter Catechism, Q1).
5. Keep answers concise, pastoral, and accurate.
6. If the question is outside Bible/theology, refuse — but off-topic questions are already filtered before you see them.

RETRIEVED KNOWLEDGE BASE:
${contextBlock}`;
}

async function createChatCompletion(messages) {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  return data.choices?.[0]?.message?.content?.trim() || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed", sources: [], refused: false });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      reply: "Server misconfigured: OPENAI_API_KEY is not set in Vercel environment variables.",
      sources: [],
      refused: false,
    });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "No message provided.", sources: [], refused: false });
    }

    const priorUserMessages = Array.isArray(history)
      ? history.filter((item) => item?.role === "user").length
      : 0;

    if (priorUserMessages >= MAX_USER_MESSAGES_PER_SESSION) {
      return res.status(200).json({
        reply: SESSION_LIMIT_MESSAGE,
        sources: [],
        refused: false,
        sessionLimitReached: true,
      });
    }

    if (!isBibleOrTheologyQuestion(message)) {
      return res.status(200).json({
        reply: OFF_TOPIC_MESSAGE,
        sources: [],
        refused: true,
      });
    }

    if (isMetaQuestion(message)) {
      return res.status(200).json({
        reply: META_INTRO_MESSAGE,
        sources: [],
        refused: false,
      });
    }

    const retrievedChunks = retrieveRelevantChunks(message, 5);

    if (!isKnowledgeAvailable(retrievedChunks)) {
      return res.status(200).json({
        reply: KNOWLEDGE_NOT_AVAILABLE_MESSAGE,
        sources: [],
        refused: false,
        notAvailable: true,
      });
    }

    const contextBlock = buildContextBlock(retrievedChunks);
    const citations = uniqueCitations(retrievedChunks);

    const recentHistory = Array.isArray(history)
      ? history
          .filter((item) => item?.role && item?.content)
          .slice(-MAX_HISTORY_MESSAGES_TO_API)
          .map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: String(item.content),
          }))
      : [];

    const messages = [
      { role: "system", content: buildSystemPrompt(contextBlock) },
      ...recentHistory,
      { role: "user", content: message },
    ];

    const reply = await createChatCompletion(messages);

    if (!reply) {
      return res.status(500).json({
        reply: "ELI-WISE could not generate a response. Please try again.",
        sources: citations,
        refused: false,
      });
    }

    return res.status(200).json({
      reply,
      sources: citations,
      refused: false,
    });
  } catch (err) {
    console.error("RAG chat error:", err);
    return res.status(500).json({
      reply: err.message || "Server error occurred. Check Vercel logs.",
      sources: [],
      refused: false,
    });
  }
}
