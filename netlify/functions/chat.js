import fetch from "node-fetch";

export async function handler(event, context) {
  const body = JSON.parse(event.body);
  const userMessage = body.message;

  try {
    const apiRes = await fetch("https://api.openai.com/v1/assistants/asst_jCmKsINbuZSpcxRqkZYMv0wp/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: userMessage })
    });

    const data = await apiRes.json();
    const reply = data.output?.[0]?.content?.[0]?.text || "ELi Wise couldn't respond!";
    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ reply: "Error contacting ELi Wise" }) };
  }
}
