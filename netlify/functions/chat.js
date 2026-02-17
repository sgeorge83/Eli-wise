export const handler = async (event) => {
  try {
    const { message, threadId: clientThreadId } = JSON.parse(event.body);
    const assistantId = "asst_jCmKsINbuZSpcxRqkZYMv0wp"; // 🔥 replace with your ELi Wise ID

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ reply: "No message provided." })
      };
    }

    let thread = { id: clientThreadId };

    // 1️⃣ Create new thread if it doesn't exist
    if (!thread.id) {
      const threadRes = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      });

      if (!threadRes.ok) {
        const errText = await threadRes.text();
        throw new Error(`Thread creation failed: ${errText}`);
      }

      thread = await threadRes.json();
      console.log("Created new thread:", thread.id);
    }

    // 2️⃣ Add user message to the thread
    const msgRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: message
      })
    });

    if (!msgRes.ok) {
      const errText = await msgRes.text();
      throw new Error(`Failed to add user message: ${errText}`);
    }

    // 3️⃣ Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({ assistant_id: assistantId })
    });

    if (!runRes.ok) {
      const errText = await runRes.text();
      throw new Error(`Assistant run failed: ${errText}`);
    }

    const runData = await runRes.json();
    let runStatus = runData.status;
    const runId = runData.id;

    // 4️⃣ Poll for completion
    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusRes = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${runId}`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      const statusData = await statusRes.json();
      runStatus = statusData.status;

      if (runStatus === "failed") {
        throw new Error("Assistant run failed.");
      }
    }

    // 5️⃣ Retrieve all messages in the thread
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    const messagesData = await messagesRes.json();

    // Get the latest assistant reply
    const assistantReply =
      messagesData.data.filter(m => m.role === "assistant").slice(-1)[0]?.content[0]?.text?.value
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
