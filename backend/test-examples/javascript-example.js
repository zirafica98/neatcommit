// JavaScript Example - Security Issues

// CRITICAL: Hardcoded password
const password = "admin123";
const apiKey = "sk-1234567890abcdef";

// CRITICAL: SQL Injection - Template literal
const userId = req.query.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// HIGH: XSS - innerHTML
element.innerHTML = userInput;

// HIGH: XSS - dangerouslySetInnerHTML (React)
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// MEDIUM: Insecure random
const token = Math.random().toString(36);

// CRITICAL: eval()
const result = eval(userCode);

// HIGH: Command Injection - exec()
exec(`rm -rf ${userInput}`);

// MEDIUM: Insecure HTTP
fetch("http://api.example.com/data");
