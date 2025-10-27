#!/bin/bash

# Test script for SpotFinder Edge Functions
# Runs all tests with coverage reporting

set -e

echo "🧪 Running SpotFinder tests with coverage..."

# Change to functions directory
cd "$(dirname "$0")"

# Create coverage directory if it doesn't exist
mkdir -p coverage

# Run tests with coverage
echo "📊 Running tests with coverage collection..."
deno test --allow-all --coverage=coverage/ --parallel

# Generate coverage report
echo "📈 Generating coverage report..."
deno coverage coverage/ --lcov --output=coverage/lcov.info

# Generate HTML coverage report
echo "🌐 Generating HTML coverage report..."
deno coverage coverage/ --html --output=coverage/html

# Display coverage summary
echo "📋 Coverage Summary:"
deno coverage coverage/ --summary

echo "✅ Tests completed!"
echo "📁 Coverage reports saved to:"
echo "   - LCOV: coverage/lcov.info"
echo "   - HTML: coverage/html/index.html"

# Check if coverage meets threshold
echo "🎯 Checking coverage threshold..."

# Extract coverage percentage (this is a simplified approach)
COVERAGE_PERCENT=$(deno coverage coverage/ --summary | grep -o '[0-9]\+\.[0-9]\+%' | head -1 | sed 's/%//')

if [ -n "$COVERAGE_PERCENT" ]; then
    echo "📊 Current coverage: ${COVERAGE_PERCENT}%"
    
    # Check if coverage is above 70%
    if (( $(echo "$COVERAGE_PERCENT >= 70" | bc -l) )); then
        echo "✅ Coverage threshold (70%) met!"
        exit 0
    else
        echo "❌ Coverage below threshold (70%). Current: ${COVERAGE_PERCENT}%"
        exit 1
    fi
else
    echo "⚠️  Could not determine coverage percentage"
    exit 0
fi
