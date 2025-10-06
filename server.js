const db = require("./db"); // SQLite connection
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const COMPANIES_PATH = path.join(__dirname, "companies.json");

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

// Main webhook (simulates receiving Twilio's SpeechResult)
app.post("/call-webhook", (req, res) => {
  const body = req.body || {};
  const callSid = body.CallSid || "(no CallSid)";
  const callerNumber = body.From || "(unknown)";
  const toNumber = body.To || "(unknown)";
  const callerText = body.SpeechResult || "(no speech)";
  const company = loadCompanyProfile(1);

  console.log(`Received call ${callSid} from ${callerNumber} to ${toNumber}`);

  const aiText = mockAIResponse(callerText, company);

  // Save to SQLite messages table
  db.prepare(`
    INSERT INTO messages (companyId, callerNumber, message, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(company.companyId, callerNumber, callerText, aiText, new Date().toISOString());

  // Save to SQLite analytics table
  db.prepare(`
    INSERT INTO analytics (companyId, callerNumber, input, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(company.companyId, callerNumber, callerText, aiText, new Date().toISOString());

  // Return plain text (simulates TTS payload)
  res.set("Content-Type", "text/plain");
  res.send(aiText);
});

// Start the server
app.listen(5000, () => console.log("CallAssist (mock) running on port 5000"));
