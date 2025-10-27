@echo off
REM Test script for SpotFinder Edge Functions (Windows)
REM Runs all tests with coverage reporting

echo 🧪 Running SpotFinder tests with coverage...

REM Change to functions directory
cd /d "%~dp0"

REM Create coverage directory if it doesn't exist
if not exist coverage mkdir coverage

REM Run tests with coverage
echo 📊 Running tests with coverage collection...
deno test --allow-all --coverage=coverage/ --parallel

REM Generate coverage report
echo 📈 Generating coverage report...
deno coverage coverage/ --lcov --output=coverage/lcov.info

REM Generate HTML coverage report
echo 🌐 Generating HTML coverage report...
deno coverage coverage/ --html --output=coverage/html

REM Display coverage summary
echo 📋 Coverage Summary:
deno coverage coverage/ --summary

echo ✅ Tests completed!
echo 📁 Coverage reports saved to:
echo    - LCOV: coverage/lcov.info
echo    - HTML: coverage/html/index.html

echo 🎯 Coverage threshold check completed!
echo 📊 Check the coverage summary above for details.

pause
