const db = require("./db"); // SQLite connection
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const landingRoutes = require("./routes/landing");

const app = express();

// Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For form POSTs
app.use(express.static("public"));
app.use("/", landingRoutes);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // create a new folder called "views"


const COMPANIES_PATH = path.join(__dirname, "companies.json");

// Load single-company profile (fallback)
function loadCompanyProfile(companyId = 1) {
  try {
    const data = fs.readFileSync(COMPANIES_PATH, "utf8");
    const companies = JSON.parse(data);
    return companies.find(c => c.companyId === companyId) || companies[0];
  } catch (e) {
    return {
      companyId: 1,
      name: "Demo Company",
      faqs: { hours: "9–5", contactEmail: "info@example.com" }
    };
  }
}

// Simple mock AI - placeholder
function mockAIResponse(callerText, company) {
  const text = (callerText || "").toLowerCase();
  const faqs = company?.faqs || {};

  if (text.includes("hours") || text.includes("open"))
    return `Our hours are ${faqs.hours || "9am–5pm"}.`;
  if (text.includes("email"))
    return `You can reach us at ${faqs.contactEmail || "info@example.com"}.`;
  if (text.includes("appointment") || text.includes("book"))
    return "I can help schedule an appointment — what day/time do you prefer?";
  if (text.includes("yes") || text.includes("no")) return "Thanks — we recorded that.";
  return `Thanks for calling ${company?.name || "our company"}. Could I have your name and phone number, please?`;
}

// -----------------------
// Main webhook — capture calls
// -----------------------
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

// -----------------------
// Dashboard page (with company details)
// -----------------------
app.get("/dashboard", (req, res) => {
  // Fetch company
  let company = db.prepare("SELECT * FROM companies WHERE companyId = ?").get(1);

  if (!company) {
    company = { 
      name: "Demo Company", 
      package: "starter", 
      phoneNumber: "", 
      location: "", 
      email: "", 
      whatsapp: "", 
      hours: "", 
      greeting: "Hi, thanks for calling! How can we help?", 
      payment: "" 
    };
  }

  // Fetch messages and analytics
  const messages = db.prepare("SELECT * FROM messages ORDER BY timestamp DESC").all();
  const analytics = db.prepare("SELECT * FROM analytics ORDER BY timestamp DESC").all();

  // Build unique customer list
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

  console.log("Messages from DB:", messages);
  console.log("Analytics from DB:", analytics);

  res.render("dashboard", { company, messages, analytics, customers });
});

// -----------------------
// Update company details
// -----------------------
app.post("/update-company", (req, res) => {
  const { name, package: plan, phoneNumber, location, email, whatsapp, hours, greeting, payment } = req.body;

  db.prepare(`
    UPDATE companies
    SET name = ?, package = ?, phoneNumber = ?, location = ?, email = ?, whatsapp = ?, hours = ?, greeting = ?, payment = ?
    WHERE companyId = 1
  `).run(name, plan, phoneNumber, location, email, whatsapp, hours, greeting, payment);

  res.redirect("/dashboard");
});


// -----------------------
// Update company details
// -----------------------
app.post("/update-company", (req, res) => {
  const { name, package: plan, phoneNumber, location, email, whatsapp, hours, greeting, payment } = req.body;

  db.prepare(`
    UPDATE companies
    SET name = ?, package = ?, phoneNumber = ?, location = ?, email = ?, whatsapp = ?, hours = ?, greeting = ?, payment = ?
    WHERE companyId = 1
  `).run(name, plan, phoneNumber, location, email, whatsapp, hours, greeting, payment);

  res.redirect("/dashboard");
});



// -----------------------
// Single Customer page
// -----------------------
app.get("/dashboard/customer/:phone", (req, res) => {
  const phone = decodeURIComponent(req.params.phone);

  const messages = db.prepare("SELECT * FROM messages WHERE callerNumber = ? ORDER BY timestamp DESC").all(phone);
  const analytics = db.prepare("SELECT * FROM analytics WHERE callerNumber = ? ORDER BY timestamp DESC").all(phone);

  // Render customer.ejs
  res.render("customer", { phone, messages, analytics });
});


// -----------------------
// Landing page
// -----------------------
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/landing.html");
});

// -----------------------
// Signup page
// -----------------------
app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});

app.post("/signup", (req, res) => {
  const { companyName, package: plan, phoneNumber, location, email, whatsapp, hours, greeting, payment } = req.body;

  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO companies 
    (name, package, phoneNumber, location, email, whatsapp, hours, greeting, payment, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyName, plan, phoneNumber, location, email, whatsapp, hours, greeting, payment, timestamp);

  res.send(`
    <h1>Account Created!</h1>
    <p>Welcome, ${companyName}. You can now <a href="/dashboard">view your dashboard</a>.</p>
  `);
});

// -----------------------
// Start server
// -----------------------
app.listen(5000, () => console.log("CallAssist (mock) running on port 5000"));
