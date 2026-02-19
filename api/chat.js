export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are ELi Wise, a helpful, intelligent, and professional AI assistant."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7
      })
    });

    const data = await openaiResponse.json();

    const assistantReply =
      data.choices?.[0]?.message?.content ||
      "ELi Wise could not generate a response.";

    return res.status(200).json({ reply: assistantReply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      reply: "Error contacting ELi Wise. Check logs."
    });
  }
}
