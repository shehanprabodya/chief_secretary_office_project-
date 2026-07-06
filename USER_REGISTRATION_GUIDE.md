# Complete User Registration Feature Guide

## Overview
This document provides a complete guide for the user registration feature via the "Add New User" form in the Admin Dashboard.

## Features Implemented

### 1. **Dropdown Options from Backend**
- **Role Selection**: Fetches all available roles from `/admin/lookups/roles`
- **Organization Selection**: Fetches all available organizations from `/admin/lookups/organizations`
- Both selects show loading indicators while fetching data
- Error messages display if API calls fail

### 2. **Form Validation**
- **Required Fields**: Full Name, Email, Username, Role, Password (for new users)
- **Optional Fields**: Designation, Organization, Status
- Real-time validation feedback with error messages
- Duplicate email/username checking on the backend

### 3. **User Creation Flow**
1. User clicks "Add New User" button
2. Modal opens with empty form
3. Role and Organization dropdowns load from backend
4. User fills in required fields
5. User clicks "Create User" button
6. System validates data
7. User account is created in database
8. Success message displays and modal closes
9. New user appears in user list

### 4. **User Editing Flow**
1. User clicks edit icon on existing user row
2. Modal opens with pre-filled user data
3. User modifies fields as needed
4. User clicks "Update User" button
5. System validates and updates data
6. Success message displays and modal closes

## API Endpoints

### GET /admin/lookups/roles
Returns all available roles:
```json
{
  "roles": [
    {
      "role_id": 1,
      "role_name": "admin",
      "description": "System Administrator"
    },
    ...
  ]
}
```

### GET /admin/lookups/organizations
Returns all active organizations:
```json
{
  "organizations": [
    {
      "organization_id": 1,
      "organization_name": "Organization Name",
      "abbreviation": "ORG",
      "status": "ACTIVE"
    },
    ...
  ]
}
```

### POST /admin/users
Creates a new user:
```json
{
  "full_name": "User Full Name",
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "role_id": 1,
  "designation": "Job Title",
  "organization_id": 1,
  "status": "ACTIVE"
}
```

Response (201 Created):
```json
{
  "message": "User created successfully",
  "user": {
    "user_id": 1,
    "full_name": "User Full Name",
    "email": "user@example.com",
    "username": "username",
    "role": {
      "role_id": 1,
      "role_name": "admin"
    },
    "organization": {
      "organization_id": 1,
      "organization_name": "Organization Name"
    },
    "status": "ACTIVE",
    "created_at": "2026-07-06T..."
  }
}
```

### PUT /admin/users/{id}
Updates an existing user:
```json
{
  "full_name": "Updated Name",
  "email": "updated@example.com",
  "role_id": 2,
  "organization_id": 2,
  "status": "ACTIVE"
}
```

## Database Schema

### users table
```
- user_id (Primary Key)
- full_name (string, required)
- email (string, unique, required)
- username (string, unique, required)
- password_hash (string, required)
- designation (string, nullable)
- role_id (Foreign Key → roles.role_id)
- organization_id (Foreign Key → organizations.organization_id, nullable)
- status (enum: ACTIVE, INACTIVE)
- created_at (timestamp)
- updated_at (timestamp)
```

### roles table
```
- role_id (Primary Key)
- role_name (string, unique)
- description (text, nullable)
- created_at (timestamp)
```

### organizations table
```
- organization_id (Primary Key)
- organization_name (string)
- abbreviation (string, nullable)
- address (string, nullable)
- telephone (string, nullable)
- email (string, nullable)
- status (enum: ACTIVE, INACTIVE)
- created_at (timestamp)
- updated_at (timestamp)
```

## Frontend Components

### AddUserModal.tsx
Location: `/frontend/src/components/Admin/AddUserModal.tsx`

**State Management:**
- `roles`: Array of Role objects
- `organizations`: Array of Organization objects
- `isSaving`: Boolean - shows saving state
- `isLoadingOptions`: Boolean - shows loading state while fetching dropdowns
- `error`: String - form validation errors
- `loadError`: String - API error messages
- `form`: CreateUserPayload - form data

**Key Features:**
- Automatic dropdown loading on mount
- Error handling with user feedback
- Loading states on dropdowns
- Real-time validation clearing
- Support for both create and edit operations

## Service Layer

### adminService.ts
Location: `/frontend/src/services/adminService.ts`

**Methods:**
- `getRoles()`: Fetches all roles
- `getOrganizations()`: Fetches all organizations
- `createUser(payload)`: Creates new user
- `updateUser(id, payload)`: Updates existing user
- `getUsers(filters)`: Gets paginated user list

## Testing Checklist

### Prerequisites
- [ ] Backend is running (Laravel server)
- [ ] Frontend is running (Vite dev server)
- [ ] Database is migrated
- [ ] Seeders have been run (roles and organizations)
- [ ] You're logged in as an admin user

### User Creation Test
- [ ] Navigate to Admin Dashboard
- [ ] Click on "User Management" section
- [ ] Click "Add New User" button
- [ ] Modal appears with empty form
- [ ] Role dropdown shows loading indicator, then all roles appear
- [ ] Organization dropdown shows loading indicator, then all organizations appear
- [ ] Fill in:
  - Full Name: "Test User"
  - Email: "test@example.com"
  - Username: "testuser"
  - Password: "TestPassword123"
  - Role: Select any role
  - Designation: "Test Designation" (optional)
  - Organization: Select any organization (optional)
  - Status: "ACTIVE"
- [ ] Click "Create User" button
- [ ] Success message appears
- [ ] Modal closes automatically
- [ ] New user appears in the user list
- [ ] User details match what was entered

### User Edit Test
- [ ] In user list, click edit icon on the newly created user
- [ ] Modal appears with pre-filled data
- [ ] All fields show correct values
- [ ] Modify some fields (e.g., designation)
- [ ] Click "Update User" button
- [ ] Success message appears
- [ ] Modal closes automatically
- [ ] User list shows updated information

### Error Handling Tests
- [ ] Try creating user without required fields - error message appears
- [ ] Try creating user with duplicate email - server error appears
- [ ] Try creating user with duplicate username - server error appears
- [ ] Try creating user without password - validation error appears
- [ ] Simulate network error - loading error message appears

### Browser Console
- [ ] No JavaScript errors in console
- [ ] No API errors in network tab
- [ ] All API requests return 200/201 status codes

## Troubleshooting

### Dropdowns show "Loading roles..." but never load
**Possible causes:**
- Backend is not running
- CORS issue preventing API calls
- Role/Organization API endpoints not responding

**Solution:**
1. Check backend server is running
2. Check browser console for CORS errors
3. Test API endpoints directly: `curl http://localhost:8000/api/admin/lookups/roles`

### Dropdowns show "No options available"
**Possible cause:**
- Database seeders have not been run
- Roles/Organizations table is empty

**Solution:**
1. Run migrations: `php artisan migrate`
2. Run seeders: `php artisan db:seed`

### Form validation passes but user not created
**Possible cause:**
- Email or username already exists in database
- Role or Organization ID is invalid

**Solution:**
1. Check database for duplicate email/username
2. Verify role_id and organization_id exist in their respective tables

### Modifying role required field
The role_id is marked as required because every user must have a role. This enforces data integrity and ensures proper permission management.

## Related Documentation
- [User Management Page](./USER_MANAGEMENT.md)
- [Admin Dashboard](./ADMIN_DASHBOARD.md)
- [API Documentation](./API.md)
