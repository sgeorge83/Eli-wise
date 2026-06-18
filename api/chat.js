const OPENAI_BASE = "https://api.openai.com/v1";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
  };
}

async function openaiRequest(path, options = {}) {
  const response = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function createThread() {
  return openaiRequest("/threads", { method: "POST", body: "{}" });
}

async function addUserMessage(threadId, message) {
  return openaiRequest(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ role: "user", content: message }),
  });
}

async function createRun(threadId, assistantId) {
  return openaiRequest(`/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify({ assistant_id: assistantId }),
  });
}

async function waitForRun(threadId, runId, maxAttempts = 45) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const run = await openaiRequest(`/threads/${threadId}/runs/${runId}`, {
      method: "GET",
    });

    if (run.status === "completed") return run;

    if (["failed", "cancelled", "expired"].includes(run.status)) {
      throw new Error(run.last_error?.message || `Assistant run ${run.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Assistant run timed out. Please try again.");
}

async function getLatestAssistantReply(threadId) {
  const messages = await openaiRequest(
    `/threads/${threadId}/messages?order=desc&limit=10`,
    { method: "GET" }
  );

  for (const message of messages.data || []) {
    if (message.role !== "assistant") continue;

    for (const part of message.content || []) {
      if (part.type === "text" && part.text?.value) {
        return part.text.value;
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      reply: "Server misconfigured: OPENAI_API_KEY is not set in Vercel environment variables.",
    });
  }

  if (!process.env.ASSISTANT_ID) {
    return res.status(500).json({
      reply: "Server misconfigured: ASSISTANT_ID is not set in Vercel environment variables.",
    });
  }

  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await createThread();
      currentThreadId = thread.id;
    }

    await addUserMessage(currentThreadId, message);

    const run = await createRun(currentThreadId, process.env.ASSISTANT_ID);
    await waitForRun(currentThreadId, run.id);

    const assistantReply = await getLatestAssistantReply(currentThreadId);

    if (!assistantReply) {
      console.error("No assistant message found for thread:", currentThreadId);
      return res.status(500).json({
        reply: "ELI-WISE could not generate a response. Please try again.",
        threadId: currentThreadId,
      });
    }

    return res.status(200).json({
      reply: assistantReply,
      threadId: currentThreadId,
    });
  } catch (err) {
    console.error("Assistant API error:", err);
    return res.status(500).json({
      reply: err.message || "Server error occurred. Check Vercel logs.",
    });
  }
}
