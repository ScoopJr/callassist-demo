// server.js — Phase 1 mock (pay-free MVP core)
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const COMPANIES_PATH = path.join(__dirname, "companies.json");
const MESSAGES_PATH = path.join(__dirname, "messages.json");
const ANALYTICS_PATH = path.join(__dirname, "analytics.json");

// Load single-company profile (fallback safe object)
function loadCompanyProfile(companyId = 1) {
  try {
    const data = fs.readFileSync(COMPANIES_PATH, "utf8");
    const companies = JSON.parse(data);
    return companies.find(c => c.companyId === companyId) || companies[0];
  } catch (e) {
    return { companyId: 1, name: "Demo Company", faqs: { hours: "9–5", contactEmail: "info@example.com" } };
  }
}

// Very small rules-based mock AI
function mockAIResponse(callerText, company) {
  const text = (callerText || "").toLowerCase();
  const faqs = company?.faqs || {};

  if (text.includes("hours") || text.includes("open")) return `Our hours are ${faqs.hours || "9am–5pm"}.`;
  if (text.includes("email")) return `You can reach us at ${faqs.contactEmail || "info@example.com"}.`;
  if (text.includes("appointment") || text.includes("book")) return "I can help schedule an appointment — what day/time do you prefer?";
  if (text.includes("yes") || text.includes("no")) return "Thanks — we recorded that.";
  return `Thanks for calling ${company?.name || "our company"}. Could I have your name and phone number, please?`;
}

function appendJson(filePath, obj) {
  const arr = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
  arr.push(obj);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));
}

// Main webhook (simulates receiving Twilio's SpeechResult)
app.post("/call-webhook", (req, res) => {
  const callerText = req.body.SpeechResult || "(no speech)";
  const company = loadCompanyProfile(1);

  const aiText = mockAIResponse(callerText, company);

  // Log analytics & messages (simple files)
  appendJson(ANALYTICS_PATH, { company: company.name, input: callerText, response: aiText, ts: new Date().toISOString() });
  appendJson(MESSAGES_PATH, { company: company.name, message: callerText, ts: new Date().toISOString() });

  // Return plain text (simulates TTS payload)
  res.set("Content-Type", "text/plain");
  res.send(aiText);
});

app.listen(5000, () => console.log("CallAssist (mock) running on port 5000"));
