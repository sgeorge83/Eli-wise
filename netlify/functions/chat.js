export const handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);

    const assistantId = "asst_jCmKsINbuZSpcxRqkZYMv0wp"; // 🔥 PUT YOUR REAL ASSISTANT ID HERE

    // 1️⃣ Create a thread
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const thread = await threadRes.json();

    // 2️⃣ Add message to thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "user",
        content: message
      })
    });

    // 3️⃣ Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    const run = await runRes.json();

    // 4️⃣ Wait for completion
    let runStatus = run.status;
    let runId = run.id;

    while (runStatus !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusRes = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${runId}`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      const statusData = await statusRes.json();
      runStatus = statusData.status;

      if (runStatus === "failed") {
        throw new Error("Eli-Wise run failed");
      }
    }

    // 5️⃣ Get messages
    const messagesRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const messagesData = await messagesRes.json();

    const assistantReply =
      messagesData.data.find(m => m.role === "assistant")
        ?.content[0]?.text?.value || "No response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: assistantReply })
    };

  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error contacting ELi Wise." })
    };
  }
};
