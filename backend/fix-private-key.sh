#!/bin/bash

# Script to fix GITHUB_PRIVATE_KEY format in .env file

echo "🔧 GitHub Private Key Formatter"
echo ""
echo "This script will help you format your GITHUB_PRIVATE_KEY properly."
echo ""
echo "⚠️  IMPORTANT: Your private key was corrupted. You need to restore it first."
echo ""
echo "Steps:"
echo "1. Go to: https://github.com/settings/apps/neatcommit"
echo "2. Scroll to 'Private keys' section"
echo "3. If you see your key listed, click 'Download' to get the .pem file"
echo "4. If you don't see it, click 'Generate a new private key' (this will invalidate the old one)"
echo "5. Open the .pem file in a text editor"
echo "6. Copy the ENTIRE content (including -----BEGIN RSA PRIVATE KEY----- and -----END RSA PRIVATE KEY-----)"
echo ""
read -p "Press Enter when you have the private key ready..."

echo ""
echo "Paste your private key below (including BEGIN and END lines)."
echo "Press Ctrl+D (or Cmd+D on Mac) when done:"
echo ""

# Read multi-line input
PRIVATE_KEY=$(cat)

# Remove all newlines and escape sequences
CLEANED=$(echo "$PRIVATE_KEY" | tr -d '\n' | sed 's/\\n//g')

# Add \n escape sequences after BEGIN and before END
FORMATTED=$(echo "$CLEANED" | sed 's/-----BEGIN RSA PRIVATE KEY-----/-----BEGIN RSA PRIVATE KEY-----\\n/' | sed 's/-----END RSA PRIVATE KEY-----/\\n-----END RSA PRIVATE KEY-----/')

# Update .env file
if [ -f .env ]; then
    # Use Python for reliable string replacement
    python3 << EOF
import re

# Read .env
with open('.env', 'r') as f:
    content = f.read()

# Replace GITHUB_PRIVATE_KEY line
new_content = re.sub(
    r'GITHUB_PRIVATE_KEY="[^"]*"',
    f'GITHUB_PRIVATE_KEY="{FORMATTED}"',
    content
)

# Write back
with open('.env', 'w') as f:
    f.write(new_content)

print("✅ Private key formatted and saved to .env")
EOF
    echo ""
    echo "✅ Done! Your private key has been formatted and saved."
    echo ""
    echo "Now restart your server:"
    echo "  npm run dev"
else
    echo "❌ .env file not found!"
    exit 1
fi
