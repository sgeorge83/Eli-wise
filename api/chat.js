export default async function handler(req, res) {
  if(req.method !== "POST") return res.status(405).json({ reply: "Method not allowed" });

  try {
    const { message, threadId } = req.body;
    if(!message) return res.status(400).json({ reply: "No message provided." });

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    };

    let currentThreadId = threadId;

    // 1️⃣ Create session/thread if not exist
    if(!currentThreadId){
      const sessionResp = await fetch(
        `https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/sessions`,
        { method:"POST", headers }
      );
      const sessionData = await sessionResp.json();
      currentThreadId = sessionData.id;
    }

    // 2️⃣ Send message to assistant and get response
    const response = await fetch(
      `https://api.openai.com/v1/assistants/${process.env.ASSISTANT_ID}/sessions/${currentThreadId}/message`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ input: message })
      }
    );

    const data = await response.json();

    // 3️⃣ Extract assistant text
    const assistantReply = data?.output?.[0]?.content?.[0]?.text?.value
                          || "ELi Wise could not generate a response.";

    return res.status(200).json({ reply: assistantReply, threadId: currentThreadId });

  } catch(err) {
    console.error("Assistant API Error:", err);
    return res.status(500).json({ reply: "Server error occurred. Check logs." });
  }
}
