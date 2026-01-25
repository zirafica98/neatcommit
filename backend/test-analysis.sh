#!/bin/bash

# Test Analysis Script
# Testira Analysis Service sa primerom lošeg koda

BASE_URL="http://localhost:3000"

echo "🧪 Testing Code Analysis Engine..."
echo ""

# Primer lošeg koda sa security problemima
BAD_CODE='function login(username, password) {
  // ❌ Hardcoded password
  const adminPassword = "admin123";
  
  // ❌ SQL injection
  const query = `SELECT * FROM users WHERE username = "${username}" AND password = "${password}"`;
  
  // ❌ eval() korišćenje
  const userInput = req.body.code;
  eval(userInput);
  
  // ❌ Insecure random
  const token = Math.random().toString();
  
  // ❌ HTTP umesto HTTPS
  fetch("http://api.example.com/data");
  
  // ❌ Weak crypto
  const hash = require("crypto").createHash("md5").update(password).digest("hex");
  
  return db.query(query);
}'

echo "📝 Sending code with security issues for analysis..."
echo ""

curl -X POST "${BASE_URL}/test/analysis" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": $(echo "$BAD_CODE" | jq -Rs .),
    \"filename\": \"src/auth.ts\"
  }" | jq '.'

echo ""
echo ""
echo "✅ Test completed!"
echo ""
echo "📋 Proverite server logove za detalje analize"
