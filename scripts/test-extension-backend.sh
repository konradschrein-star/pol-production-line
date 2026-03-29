#!/bin/bash
# Test if extension can communicate with backend

echo "🧪 Testing Extension → Backend Communication"
echo "============================================"
echo ""

# Test 1: Backend is running
echo "1. Checking if backend is running..."
if curl -s http://localhost:8347/api/whisk/extension-status > /dev/null 2>&1; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend is NOT running"
  echo "   Please start with: start.bat"
  exit 1
fi

# Test 2: Extension status
echo ""
echo "2. Checking extension status..."
RESPONSE=$(curl -s http://localhost:8347/api/whisk/extension-status)
echo "   $RESPONSE"

# Test 3: Try updating token (simulate extension)
echo ""
echo "3. Testing token update endpoint (simulating extension)..."
TEST_TOKEN="ya29.test_token_12345"
ADMIN_KEY="af351cf3d1732b2aca4c125dbf9e454585aabeb5a72152a6f47711ec520c3f53"

RESULT=$(curl -s -X POST http://localhost:8347/api/system/update-whisk-token \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d "{\"token\": \"$TEST_TOKEN\"}")

if echo "$RESULT" | grep -q "success"; then
  echo "   ✅ Token update endpoint works!"
  echo "   Response: $RESULT"
else
  echo "   ❌ Token update failed"
  echo "   Response: $RESULT"
fi

echo ""
echo "============================================"
echo "If all tests pass, the extension SHOULD work."
echo "If extension still fails, check:"
echo "1. Extension settings → Backend URL: http://localhost:8347"
echo "2. Extension settings → Admin API Key: $ADMIN_KEY"
