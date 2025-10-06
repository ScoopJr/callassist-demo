const db = require("./db"); // SQLite connection
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const COMPANIES_PATH = path.join(__dirname, "companies.json");

// Load single-company profile (fallback)
function loadCompanyProfile(companyId = 1) {
  try {
    const data = fs.readFileSync(COMPANIES_PATH, "utf8");
    const companies = JSON.parse(data);
    return companies.find(c => c.companyId === companyId) || companies[0];
  } catch (e) {
    return { companyId: 1, name: "Demo Company", faqs: { hours: "9–5", contactEmail: "info@example.com" } };
  }
}

// Simple mock AI
function mockAIResponse(callerText, company) {
  const text = (callerText || "").toLowerCase();
  const faqs = company?.faqs || {};

  if (text.includes("hours") || text.includes("open")) return `Our hours are ${faqs.hours || "9am–5pm"}.`;
  if (text.includes("email")) return `You can reach us at ${faqs.contactEmail || "info@example.com"}.`;
  if (text.includes("appointment") || text.includes("book")) return "I can help schedule an appointment — what day/time do you prefer?";
  if (text.includes("yes") || text.includes("no")) return "Thanks — we recorded that.";
  return `Thanks for calling ${company?.name || "our company"}. Could I have your name and phone number, please?`;
}

// Main webhook — capture calls
app.post("/call-webhook", (req, res) => {
  const body = req.body || {};
  const callSid = body.CallSid || "(no CallSid)";
  const callerNumber = body.From || "(unknown)";
  const toNumber = body.To || "(unknown)";
  const callerText = body.SpeechResult || "(no speech)";
  const company = loadCompanyProfile(1);

  console.log(`Received call ${callSid} from ${callerNumber} to ${toNumber}`);

  let aiText = mockAIResponse(callerText, company);
  const timestamp = new Date().toISOString();

  // Save messages
  db.prepare(`
    INSERT INTO messages (companyId, callerNumber, message, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(company.companyId, callerNumber, callerText, aiText, timestamp);

  // Save analytics
  db.prepare(`
    INSERT INTO analytics (companyId, callerNumber, input, response, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(company.companyId, callerNumber, callerText, aiText, timestamp);

  res.set("Content-Type", "text/plain");
  res.send(aiText);
});

// Dashboard — main page
app.get("/dashboard", (req, res) => {
  const messages = db.prepare("SELECT * FROM messages ORDER BY timestamp DESC").all();
  const analytics = db.prepare("SELECT * FROM analytics ORDER BY timestamp DESC").all();

  // Unique customer list
  const customersMap = {};
  messages.forEach(m => {
    const nameMatch = m.message.match(/name[:\s]+([a-zA-Z ]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : "(unknown)";

    const emailMatch = m.message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "(unknown)";

    customersMap[m.callerNumber] = {
      callerNumber: m.callerNumber,
      name,
      email,
      lastMessage: m.message,
      lastResponse: m.response,
      lastContact: m.timestamp
    };
  });
  const customers = Object.values(customersMap);

  // HTML
  let html = `
  <html>
  <head>
    <title>CallAssist Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; background: #f0f2f5; }
      h1 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 30px; background: #fff; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background: #007bff; color: white; }
      tr:nth-child(even) { background: #f9f9f9; }
      a { color: #007bff; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Messages</h1>
    <table>
      <tr><th>Caller</th><th>Message</th><th>Response</th><th>Timestamp</th></tr>
      ${messages.map(m => `<tr><td>${m.callerNumber}</td><td>${m.message}</td><td>${m.response}</td><td>${m.timestamp}</td></tr>`).join("")}
    </table>

    <h1>Analytics</h1>
    <table>
      <tr><th>Caller</th><th>Input</th><th>Response</th><th>Timestamp</th></tr>
      ${analytics.map(a => `<tr><td>${a.callerNumber}</td><td>${a.input}</td><td>${a.response}</td><td>${a.timestamp}</td></tr>`).join("")}
    </table>

    <h1>Customer List</h1>
    <table>
      <tr><th>Name</th><th>Phone</th><th>Email</th><th>Last Message</th><th>Last Response</th><th>Last Contact</th><th>View Calls</th></tr>
      ${customers.map(c => `<tr>
        <td>${c.name}</td>
        <td>${c.callerNumber}</td>
        <td>${c.email}</td>
        <td>${c.lastMessage}</td>
        <td>${c.lastResponse}</td>
        <td>${c.lastContact}</td>
        <td><a href="/dashboard/customer/${encodeURIComponent(c.callerNumber)}">View Calls</a></td>
      </tr>`).join("")}
    </table>
  </body>
  </html>
  `;

  res.send(html);
});

// Customer detail page
app.get("/dashboard/customer/:phone", (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const messages = db.prepare("SELECT * FROM messages WHERE callerNumber = ? ORDER BY timestamp DESC").all(phone);
  const analytics = db.prepare("SELECT * FROM analytics WHERE callerNumber = ? ORDER BY timestamp DESC").all(phone);

  let html = `
  <html>
  <head>
    <title>Call History for ${phone}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; background: #f0f2f5; }
      h1 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; background: #fff; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background-color: #007bff; color: white; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      a { color: #007bff; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Call History for ${phone}</h1>
    <a href="/dashboard">← Back to Dashboard</a>

    <h2>Messages</h2>
    <table>
      <tr><th>Message</th><th>Response</th><th>Timestamp</th></tr>
      ${messages.map(m => `<tr><td>${m.message}</td><td>${m.response}</td><td>${m.timestamp}</td></tr>`).join("")}
    </table>

    <h2>Analytics</h2>
    <table>
      <tr><th>Input</th><th>Response</th><th>Timestamp</th></tr>
      ${analytics.map(a => `<tr><td>${a.input}</td><td>${a.response}</td><td>${a.timestamp}</td></tr>`).join("")}
    </table>
  </body>
  </html>
  `;

  res.send(html);
});

// Start server
app.listen(5000, () => console.log("CallAssist (mock) running on port 5000"));
