export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "No message provided." });
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2"
    };

    let currentThreadId = threadId;

    // 1️⃣ Create thread if it doesn't exist
    if (!currentThreadId) {
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers
      });
      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
    }

    // 2️⃣ Add user message to the thread
    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        role: "user",
        content: message
      })
    });

    // 3️⃣ Create a run for the assistant
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

    // 4️⃣ Poll until run completes
    let runStatus = runData.status;
    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runData.id}`,
        { method: "GET", headers }
      );
      const statusData = await statusResponse.json();
      runStatus = statusData.status;

      if (runStatus === "failed") {
        return res.status(500).json({ reply: "Assistant run failed." });
      }
    }

    // 5️⃣ Get all messages in the thread
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
      { method: "GET", headers }
    );
    const messagesData = await messagesResponse.json();

    // 6️⃣ Find the latest assistant message
    const assistantMessage = [...messagesData.data]
      .reverse()
      .find(msg => msg.role === "assistant");

    const reply =
      assistantMessage?.content?.[0]?.text?.value || 
      "ELi Wise could not generate a response.";

    // 7️⃣ Return assistant reply + threadId for frontend
    return res.status(200).json({ reply, threadId: currentThreadId });

  } catch (error) {
    console.error("Assistants API Error:", error);
    return res.status(500).json({
      reply: "Server error occurred. Check logs."
    });
  }
}
