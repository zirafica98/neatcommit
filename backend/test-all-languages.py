#!/usr/bin/env python3
"""
Test script za sve podržane jezike
"""

import json
import os
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "http://localhost:3000"
EXAMPLES_DIR = Path(__file__).parent / "test-examples"

# Test cases
TEST_CASES = [
    ("JavaScript", "javascript-example.js"),
    ("TypeScript", "typescript-example.ts"),
    ("Java", "java-example.java"),
    ("Python", "python-example.py"),
    ("PHP", "php-example.php"),
    ("C#", "csharp-example.cs"),
    ("SQL", "sql-example.sql"),
    ("Go", "go-example.go"),
    ("Ruby", "ruby-example.rb"),
]

def test_language(name, filename):
    """Test analizu za dati jezik"""
    filepath = EXAMPLES_DIR / filename
    
    if not filepath.exists():
        print(f"❌ File not found: {filepath}")
        return False
    
    # Read file
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Make request
    try:
        payload = json.dumps({"code": code, "filename": filename}).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/test/analysis",
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        result = data.get('result', {})
        detected_lang = result.get('language', 'unknown')
        is_supported = result.get('isSupported', False)
        total_issues = result.get('totalIssues', 0)
        critical = result.get('criticalIssues', 0)
        high = result.get('highIssues', 0)
        medium = result.get('mediumIssues', 0)
        low = result.get('lowIssues', 0)
        score = result.get('score', 0)
        
        if is_supported:
            print(f"✅ {name}")
            print(f"   Language: {detected_lang}")
            print(f"   Supported: {is_supported}")
            print(f"   Total Issues: {total_issues}")
            print(f"   🔴 Critical: {critical}")
            print(f"   🟠 High: {high}")
            print(f"   🟡 Medium: {medium}")
            print(f"   🟢 Low: {low}")
            print(f"   Score: {score}/100")
            print()
            return True
        else:
            print(f"❌ {name} - Not supported")
            print()
            return False
            
    except Exception as e:
        print(f"❌ {name} - Error: {e}")
        print()
        return False

def main():
    print("🧪 Testing All Supported Languages")
    print("=" * 50)
    print()
    
    results = []
    for name, filename in TEST_CASES:
        success = test_language(name, filename)
        results.append((name, success))
    
    print("=" * 50)
    print("📊 Summary:")
    print()
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")
    
    print()
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print(f"⚠️  {total - passed} test(s) failed")

if __name__ == "__main__":
    main()
