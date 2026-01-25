#!/bin/bash

# Test script za sve podržane jezike

echo "🧪 Testing All Supported Languages"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"
EXAMPLES_DIR="test-examples"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_language() {
    local lang=$1
    local filename=$2
    local filepath="$EXAMPLES_DIR/$filename"
    
    if [ ! -f "$filepath" ]; then
        echo -e "${RED}❌ File not found: $filepath${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Testing $lang...${NC}"
    
    # Read file content and escape for JSON
    local code=$(cat "$filepath" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' '\\n')
    
    # Make request
    local response=$(curl -s -X POST "$BASE_URL/test/analysis" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$code\", \"filename\": \"$filename\"}")
    
    # Extract results
    local detected_lang=$(echo "$response" | jq -r '.result.language' 2>/dev/null)
    local is_supported=$(echo "$response" | jq -r '.result.isSupported' 2>/dev/null)
    local total_issues=$(echo "$response" | jq -r '.result.totalIssues' 2>/dev/null)
    local critical=$(echo "$response" | jq -r '.result.criticalIssues' 2>/dev/null)
    local high=$(echo "$response" | jq -r '.result.highIssues' 2>/dev/null)
    local medium=$(echo "$response" | jq -r '.result.mediumIssues' 2>/dev/null)
    local low=$(echo "$response" | jq -r '.result.lowIssues' 2>/dev/null)
    local score=$(echo "$response" | jq -r '.result.score' 2>/dev/null)
    
    if [ "$is_supported" = "true" ]; then
        echo -e "${GREEN}✅ $lang${NC}"
        echo "   Language: $detected_lang"
        echo "   Supported: $is_supported"
        echo "   Total Issues: $total_issues"
        echo "   🔴 Critical: $critical"
        echo "   🟠 High: $high"
        echo "   🟡 Medium: $medium"
        echo "   🟢 Low: $low"
        echo "   Score: $score/100"
    else
        echo -e "${RED}❌ $lang - Not supported${NC}"
    fi
    
    echo ""
}

# Test all languages
echo "Starting tests..."
echo ""

test_language "JavaScript" "javascript-example.js"
test_language "TypeScript" "typescript-example.ts"
test_language "Java" "java-example.java"
test_language "Python" "python-example.py"
test_language "PHP" "php-example.php"
test_language "C#" "csharp-example.cs"
test_language "SQL" "sql-example.sql"
test_language "Go" "go-example.go"
test_language "Ruby" "ruby-example.rb"

echo "=================================="
echo "✅ Testing complete!"
