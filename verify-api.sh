#!/bin/bash

# User Registration Feature - Quick Verification Script
# This script tests the backend API endpoints for user registration

BASE_URL="http://localhost:8000/api"
ADMIN_TOKEN="${1:-your-admin-token}"  # Get token from login first

echo "🔍 Testing User Registration API Endpoints"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo "Endpoint: $method $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    echo "Response: $response"
    echo ""
}

echo -e "${YELLOW}Step 1: Get Roles${NC}"
echo "═══════════════════════════════════════════════════════════"
test_endpoint "GET" "/admin/lookups/roles" "" "Fetching available roles"

echo -e "${YELLOW}Step 2: Get Organizations${NC}"
echo "═══════════════════════════════════════════════════════════"
test_endpoint "GET" "/admin/lookups/organizations" "" "Fetching available organizations"

echo -e "${YELLOW}Step 3: Create Test User${NC}"
echo "═══════════════════════════════════════════════════════════"

create_user_data='{
  "full_name": "Test User",
  "email": "testuser@example.com",
  "username": "testuser",
  "password": "TestPassword123",
  "role_id": 2,
  "designation": "Test Officer",
  "organization_id": 1,
  "status": "ACTIVE"
}'

test_endpoint "POST" "/admin/users" "$create_user_data" "Creating new user"

echo -e "${YELLOW}Step 4: Get Users List${NC}"
echo "═══════════════════════════════════════════════════════════"
test_endpoint "GET" "/admin/users" "" "Fetching users list"

echo ""
echo "✅ API verification complete!"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "1. Replace 'your-admin-token' with an actual admin token from login"
echo "2. Make sure the backend server is running on http://localhost:8000"
echo "3. Check the responses above for any errors or missing data"
