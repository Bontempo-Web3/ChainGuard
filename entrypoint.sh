#!/bin/bash

set -e

SEVERITY="${1:-high}"
TOOLS="${2:-both}"
CLAUDE_AUDIT="${3:-false}"
ANTHROPIC_API_KEY="${4}"
FAIL_ON_DETECTION="${5:-true}"
SOLIDITY_VERSION="${6:-0.8.20}"
TARGET="${7:-.}"
GITHUB_TOKEN="${8}"

echo "ChainGuard Security Scan"
echo "================================"
echo "Severity threshold: $SEVERITY"
echo "Tools: $TOOLS"
echo "Claude Mini-Audit: $CLAUDE_AUDIT"
echo "Target: $TARGET"
echo "Solidity version: $SOLIDITY_VERSION"
echo ""

if [ "$SOLIDITY_VERSION" != "0.8.20" ]; then
    echo "Installing Solidity $SOLIDITY_VERSION..."
    solc-select install "$SOLIDITY_VERSION" || true
    solc-select use "$SOLIDITY_VERSION"
fi

echo "Running security analysis..."
python /action/scanner.py \
    --severity "$SEVERITY" \
    --tools "$TOOLS" \
    --claude-audit "$CLAUDE_AUDIT" \
    --anthropic-api-key "$ANTHROPIC_API_KEY" \
    --target "$TARGET" \
    --fail-on-detection "$FAIL_ON_DETECTION" \
    --github-token "$GITHUB_TOKEN"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "Scan completed successfully"
else
    echo ""
    echo "Vulnerabilities detected"
fi

exit $EXIT_CODE
