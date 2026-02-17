export const handler = async (event) => {
  try {
    const { message, threadId: clientThreadId } = JSON.parse(event.body);
    const assistantId = "asst_jCmKsINbuZSpcxRqkZYMv0wp"; // 🔥 replace with your ELi Wise assistant ID

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ reply: "No message provided." }) };
    }

    let thread = { id: clientThreadId };

    // ------------------------
    // 1️⃣ Create thread only once and bind it to the assistant
    // ------------------------
    if (!thread.id) {
      console.log("LOG: Creating thread for assistant:", assistantId);

      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({ assistant: assistantId }) // Bind thread to ELi Wise
      });

      const threadResText = await threadRes.text();
      console.log("LOG: Thread creation response:", threadResText);

      if (!threadRes.ok) throw new Error("Thread creation failed");

      thread = JSON.parse(threadResText);
    }

    // ------------------------
    // 2️⃣ Add user message to the thread
    // ------------------------
    console.log("LOG: Adding user message:", message);

    const msgRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({ role: "user", content: message })
    });

    const msgResText = await msgRes.text();
    console.log("LOG: Add message response:", msgResText);

    if (!msgRes.ok) throw new Error("Failed to add user message");

    // ------------------------
    // 3️⃣ Run the assistant
    // ------------------------
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({ assistant_id: assistantId })
    });

    const runResText = await runRes.text();
    console.log("LOG: Assistant run response:", runResText);

    if (!runRes.ok) throw new Error("Assistant run failed");

    const runData = JSON.parse(runResText);
    const runId = runData.id;
    let runStatus = runData.status;

    // ------------------------
    // 4️⃣ Poll until the assistant finishes
    // ------------------------
    while (runStatus !== "completed") {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${runId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });

      const statusText = await statusRes.text();
      const statusData = JSON.parse(statusText);
      runStatus = statusData.status;

      console.log("LOG: Run status poll:", runStatus);

      if (runStatus === "failed") {
        console.error("Assistant run failed during polling");
        throw new Error("Assistant run failed during polling");
      }
    }

    // ------------------------
    // 5️⃣ Fetch all messages to get latest assistant reply
    // ------------------------
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    const messagesText = await messagesRes.text();
    console.log("LOG: Fetch messages response:", messagesText);

    const messagesData = JSON.parse(messagesText);
    const assistantReply =
      messagesData.data
        .filter(m => m.role === "assistant")
        .slice(-1)[0]?.content[0]?.text?.value
      || "ELi Wise could not generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: assistantReply, threadId: thread.id })
    };

  } catch (error) {
    console.error("ELi Wise Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error contacting ELi Wise. Check logs." })
    };
  }
};
