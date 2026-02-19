export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, threadId } = req.body;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2"
    };

    let currentThreadId = threadId;

    // 1️⃣ Create thread if not exists
    if (!currentThreadId) {
      const threadResponse = await fetch(
        "https://api.openai.com/v1/threads",
        {
          method: "POST",
          headers
        }
      );

      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
    }

    // 2️⃣ Add user message to thread
    await fetch(
      `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          role: "user",
          content: message
        })
      }
    );

    // 3️⃣ Create run
    const runResponse = await fetch(
      `https://api.openai.com/v1/threads/${currentThreadId}/runs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          assistant_id: process.env.ASSISTANT_ID
        })
      }
    );

    const runData = await runResponse.json();
    let runStatus = runData.status;

    // 4️⃣ Poll until run completes
    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runData.id}`,
        {
          method: "GET",
          headers
        }
      );

      const statusData = await statusResponse.json();
      runStatus = statusData.status;

      if (runStatus === "failed") {
        return res.status(500).json({ reply: "Run failed." });
      }
    }

    // 5️⃣ Get messages
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
      {
        method: "GET",
        headers
      }
    );

    const messagesData = await messagesResponse.json();

    const assistantMessage = messagesData.data.find(
      msg => msg.role === "assistant"
    );

    const reply =
      assistantMessage?.content?.[0]?.text?.value ||
      "No response generated.";

    return res.status(200).json({
      reply,
      threadId: currentThreadId
    });

  } catch (error) {
    console.error("Assistant API Error:", error);
    return res.status(500).json({
      reply: "Internal server error."
    });
  }
}
