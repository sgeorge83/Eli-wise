export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reply: "Method not allowed" });

  try {
    const { message, threadId } = req.body;
    if (!message) return res.status(400).json({ reply: "No message provided." });

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "OpenAI-Beta": "assistants=v2"
    };

    let currentThreadId = threadId;

    // Create thread if not exist
    if (!currentThreadId) {
      const threadResp = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers
      });
      const threadData = await threadResp.json();
      currentThreadId = threadData.id;
    }

    // Send user message and get assistant reply directly
    const response = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        role: "user",
        content: message,
        assistant_id: process.env.ASSISTANT_ID,
      })
    });

    const data = await response.json();

    // Extract assistant reply
    const assistantMessage = data?.output?.[0]?.content?.[0]?.text || "ELi Wise could not generate a response.";

    return res.status(200).json({ reply: assistantMessage, threadId: currentThreadId });

  } catch (err) {
    console.error("Assistant API Error:", err);
    return res.status(500).json({ reply: "Server error occurred. Check logs." });
  }
}
