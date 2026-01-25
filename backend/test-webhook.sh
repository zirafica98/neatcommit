#!/bin/bash

# Test Webhook Script
# Koristite ovaj script za testiranje webhook endpoint-a

BASE_URL="http://localhost:3000"

echo "🧪 Testing Webhook Endpoints..."
echo ""

# Test 1: Installation Event
echo "1️⃣ Testing Installation Event..."
curl -X POST "${BASE_URL}/test/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "installation",
    "payload": {
      "action": "created",
      "installation": {
        "id": 123456,
        "account": {
          "id": 111222,
          "login": "test-user",
          "type": "User"
        },
        "target_type": "User",
        "repositories": [
          {
            "id": 789012,
            "name": "test-repo",
            "full_name": "test-owner/test-repo",
            "private": false,
            "default_branch": "main",
            "owner": {
              "login": "test-owner"
            }
          }
        ]
      },
      "sender": {
        "id": 111222,
        "login": "test-user",
        "email": "test@example.com",
        "avatar_url": "https://github.com/avatars/test-user",
        "name": "Test User"
      }
    }
  }'

echo ""
echo ""
echo "⏳ Čekam 2 sekunde..."
sleep 2

# Test 2: Pull Request Event
echo "2️⃣ Testing Pull Request Event..."
curl -X POST "${BASE_URL}/test/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pull_request",
    "payload": {
      "action": "opened",
      "installation": {
        "id": 123456
      },
      "repository": {
        "id": 789012,
        "name": "test-repo",
        "full_name": "test-owner/test-repo",
        "owner": {
          "login": "test-owner"
        },
        "default_branch": "main"
      },
      "pull_request": {
        "id": 345678,
        "number": 1,
        "title": "Test PR",
        "state": "open",
        "html_url": "https://github.com/test-owner/test-repo/pull/1",
        "head": {
          "sha": "abc123def456"
        },
        "owner": {
          "login": "test-owner"
        },
        "repo": {
          "name": "test-repo"
        }
      }
    }
  }'

echo ""
echo ""
echo "✅ Testovi završeni!"
echo ""
echo "📋 Proverite:"
echo "   - Server logove (trebalo bi da vidite webhook evente)"
echo "   - Bazu podataka: npx prisma studio"
echo "   - Queue: docker exec elementer-redis redis-cli KEYS 'bull:code-analysis:*'"
