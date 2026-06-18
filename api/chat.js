import { isBibleOrTheologyQuestion, REFUSAL_MESSAGE } from "../lib/guardrails.js";
import {
  buildContextBlock,
  retrieveRelevantChunks,
  uniqueCitations,
} from "../lib/rag.js";

const OPENAI_BASE = "https://api.openai.com/v1";

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
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
1. Answer ONLY questions about the Bible, Scripture, biblical interpretation, and historic orthodox Christian theology.
2. If a question is outside Bible/theology scope, refuse politely and do not answer the off-topic part.
3. Ground your answers primarily in the retrieved knowledge-base sources below.
4. When you use a source, cite it inline like (WEB, John 3:16) or (Westminster Shorter Catechism, Q1).
5. Do not invent Bible verses. If the knowledge base does not contain a passage, say you do not have it in the current knowledge base and answer only from what is provided.
6. Present doctrine respectfully and clearly. Where Christians disagree, note major orthodox views without being dismissive.
7. Keep answers concise, pastoral, and accurate.

RETRIEVED KNOWLEDGE BASE:
${contextBlock}`;
}

async function createChatCompletion(messages) {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.2,
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

    if (!isBibleOrTheologyQuestion(message)) {
      return res.status(200).json({
        reply: REFUSAL_MESSAGE,
        sources: [],
        refused: true,
      });
    }

    const retrievedChunks = retrieveRelevantChunks(message, 5);
    const contextBlock = buildContextBlock(retrievedChunks);
    const citations = uniqueCitations(retrievedChunks);

    const recentHistory = Array.isArray(history)
      ? history
          .filter((item) => item?.role && item?.content)
          .slice(-6)
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
