require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// PAY-FREE placeholder webhook for testing
app.post("/call-webhook", (req, res) => {
    const callerText = req.body.SpeechResult;

    // Placeholder AI response (no OpenAI or ElevenLabs calls)
    const aiText = `Hi! Thanks for your message: "${callerText}". We'll get back to you soon.`;

    // Send as plain text (simulates TTS)
    res.set("Content-Type", "text/plain");
    res.send(Buffer.from(aiText));
});

// Start server
app.listen(5000, () => console.log("CallAssist server running on port 5000"));