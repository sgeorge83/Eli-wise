export const handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);
    const assistantId = "asst_jCmKsINbuZSpcxRqkZYMv0wp"; // 🔥 replace with your ELi Wise assistant ID

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ reply: "No message provided." }) };
    }

    console.log("LOG: Sending message to ELi Wise:", message);

    // Send message to assistant
    const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}/message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: { text: message }
      })
    });

    const text = await response.text();
    console.log("LOG: Assistant response:", text);

    if (!response.ok) {
      throw new Error(`Assistant API error: ${text}`);
    }

    const data = JSON.parse(text);

    // Get assistant reply text
    const assistantReply =
      data?.output?.[0]?.content?.[0]?.text || "ELi Wise could not generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: assistantReply })
    };

  } catch (error) {
    console.error("ELi Wise Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error contacting ELi Wise. Check logs." })
    };
  }
};
