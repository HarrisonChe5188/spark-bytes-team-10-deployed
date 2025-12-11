# Spark!Bytes

## Prerequisites
Ensure the following dependencies are installed:
- [Node.js 18+](https://nodejs.org/en/download/) and npm (bundled with Node.js)
- [Git](https://git-scm.com/downloads)

## Getting Started

### 1. Clone the Repository and CD into Root Directory
```bash
git clone https://github.com/HarrisonChe5188/Spark-Bytes-Team-10.git
cd Spark-Bytes-Team-10
```

### 2. Setup
```bash
npm install
```

## Usage

### Start the Application
```bash
npm run dev
```
The application will be available at http://localhost:3000.

### Testing
Test suites can be run on our API routes.
```bash
npm test
```

## Managing Admin Role (Supabase SQL Editor)
The admin dashboard is accessible at `/admin` for users with admin privileges.

Use Supabase's SQL editor to add or remove an admin role on a user.

1) Open Supabase > SQL Editor > New Query.  
2) Replace the `email` placeholder with the target user's email.  
3) Run one of the snippets below.

- Grant admin:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'admin')
where email = 'user@example.com';
```

- Remove admin:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'user@example.com';
```

Changes take effect immediately; have the user re-authenticate if their session was active.