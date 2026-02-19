export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { message, threadId } = req.body;
    if (!message) return res.status(400).json({ reply: "No message provided." });

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
      body: JSON.stringify({ role: "user", content: message })
    });

    // 3️⃣ Get all messages from the thread for full context
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "GET",
      headers
    });
    const messagesData = await messagesResponse.json();

    // Format messages for assistant run
    const formattedMessages = messagesData.data.map(msg => ({
      role: msg.role,
      content: msg.content.map(c => c.text?.value || "").join("\n")
    }));

    // 4️⃣ Create a run with full conversation context
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        assistant_id: process.env.ASSISTANT_ID,
        input: {
          messages: formattedMessages
        }
      })
    });

    const runData = await runResponse.json();

    // 5️⃣ Poll until run completes
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

    // 6️⃣ Fetch messages again to get the latest assistant response
    const finalMessagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "GET",
      headers
    });
    const finalMessagesData = await finalMessagesResponse.json();

    const assistantMessage = [...finalMessagesData.data]
      .reverse()
      .find(msg => msg.role === "assistant");

    const reply = assistantMessage?.content?.map(c => c.text?.value || "").join("\n") ||
                  "ELi Wise could not generate a response.";

    // 7️⃣ Return reply + threadId
    return res.status(200).json({ reply, threadId: currentThreadId });

  } catch (error) {
    console.error("Assistants API Error:", error);
    return res.status(500).json({ reply: "Server error occurred. Check logs." });
  }
}
