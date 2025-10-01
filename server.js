const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { OpenAI } = require("openai");

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: "YOUR_OPENAI_API_KEY" });
const ELEVEN_API_KEY = "YOUR_ELEVENLABS_API_KEY";

app.post("/call-webhook", async (req, res) => {
    const callerText = req.body.SpeechResult; // Twilio speech-to-text

    // GPT-4o AI response
    const prompt = `
You are CallAssist, a polite virtual AI receptionist.
Always greet politely, ask for the caller's name, phone number, and reason for calling.
Answer basic FAQs if possible; otherwise take a message.
At the end, confirm: "Thanks! I’ve noted your message."
`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: callerText }
        ]
    });

    const aiText = completion.choices[0].message.content;

    // Convert AI text to audio via ElevenLabs TTS
    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Example voice
    const ttsResponse = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        { text: aiText },
        { headers: { "xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json" }, responseType: "arraybuffer" }
    );

    // Return audio to Twilio
    res.set("Content-Type", "audio/mpeg");
    res.send(ttsResponse.data);
});

app.listen(5000, () => console.log("CallAssist server running on port 5000"));
