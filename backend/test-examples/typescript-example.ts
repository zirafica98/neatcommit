// TypeScript Example - Security Issues

// CRITICAL: Hardcoded password
const password: string = "admin123";
const apiKey: string = "sk-1234567890abcdef";

// CRITICAL: SQL Injection
const userId = req.query.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query);

// HIGH: XSS
element.innerHTML = userInput;

// MEDIUM: Insecure random
const token = Math.random().toString(36);

// CRITICAL: eval()
const result = eval(userCode);

// HIGH: Weak crypto
import * as crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex');
const sha1Hash = crypto.createHash('sha1').update(data).digest('hex');
