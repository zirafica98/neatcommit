#!/bin/bash

# Test script za multi-language support

echo "🧪 Testing Multi-Language Support"
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Java
echo "1️⃣ Testing Java..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "String query = \"SELECT * FROM users WHERE id = \" + userId;\nStatement stmt = conn.createStatement();\nResultSet rs = stmt.executeQuery(query);",
    "filename": "UserService.java"
  }' | jq '.result.totalIssues, .result.criticalIssues, .result.highIssues' 2>/dev/null || echo "❌ Java test failed"
echo ""

# Test 2: Python
echo "2️⃣ Testing Python..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import os\npassword = \"secret123\"\nos.system(\"rm -rf /\" + user_input)",
    "filename": "script.py"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ Python test failed"
echo ""

# Test 3: PHP
echo "3️⃣ Testing PHP..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "<?php\n$password = \"secret123\";\necho $_GET[\"name\"];\n$result = mysql_query(\"SELECT * FROM users WHERE id = \" . $_GET[\"id\"]);",
    "filename": "index.php"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ PHP test failed"
echo ""

# Test 4: C#
echo "4️⃣ Testing C#..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "string query = \"SELECT * FROM users WHERE id = \" + userId;\nSqlCommand cmd = new SqlCommand(query, connection);\nResponse.Write(Request.QueryString[\"name\"]);",
    "filename": "UserController.cs"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ C# test failed"
echo ""

# Test 5: SQL
echo "5️⃣ Testing SQL..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "UPDATE users SET password = \"newpass\";\nDELETE FROM logs;\nSELECT * FROM users WHERE id = \" + userId;",
    "filename": "migration.sql"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ SQL test failed"
echo ""

# Test 6: Go
echo "6️⃣ Testing Go..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "package main\nimport \"database/sql\"\nquery := \"SELECT * FROM users WHERE id = \" + userId\ndb.Query(query)",
    "filename": "main.go"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ Go test failed"
echo ""

# Test 7: Ruby
echo "7️⃣ Testing Ruby..."
curl -X POST "$BASE_URL/test/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "password = \"secret123\"\nUser.where(\"id = #{params[:id]}\")\nsystem(\"rm -rf #{user_input}\")",
    "filename": "user_controller.rb"
  }' | jq '.result.totalIssues, .result.criticalIssues' 2>/dev/null || echo "❌ Ruby test failed"
echo ""

echo "✅ Testing complete!"
