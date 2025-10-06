const db = require("./db");

// Messages
console.log("Messages table:");
const messages = db.prepare("SELECT * FROM messages").all();
console.table(messages);

// Analytics
console.log("Analytics table:");
const analytics = db.prepare("SELECT * FROM analytics").all();
console.table(analytics);
