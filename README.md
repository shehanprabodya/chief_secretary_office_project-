# Chief Secretary's Office Management System

A web-based management system for the Chief Secretary's Office of the Southern
Province. The application supports meeting management, official letters,
attendance, meeting minutes, approval workflows, notifications, user
administration, and role-based dashboards.

## Technology stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Laravel 13, PHP 8.3+, Laravel Sanctum
- **Database:** SQLite by default
- **Document generation:** Dompdf

## Prerequisites

Install the following before starting:

- Git
- PHP 8.3 or newer with the common Laravel extensions, including PDO SQLite,
  Mbstring, OpenSSL, Tokenizer, XML, Ctype, JSON, BCMath, and Fileinfo
- [Composer](https://getcomposer.org/)
- Node.js 20.19+ or 22.12+ and npm

## Setup for a new developer

### 1. Clone the Git repository

```bash
git clone https://github.com/shehanprabodya/chief_secretary_office_project-.git
cd chief_secretary_office_project-
```

### 2. Set up the Laravel backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
```

The supplied `.env.example` is already configured to use SQLite. No separate
database server is required for local development.

If the application needs to serve files from Laravel's public storage, also
run:

```bash
php artisan storage:link
```

### 3. Set up the React frontend

Open a new terminal from the project root:

```bash
cd frontend
npm install
```

The frontend uses `http://localhost:8000/api` by default. To use another API
address, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

### 4. Run the application

Start the backend in one terminal:

```bash
cd backend
php artisan serve
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Then open:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000/api>

For queued notifications and other background jobs, run the queue worker in a
third terminal:

```bash
cd backend
php artisan queue:work
```

## Seeded login accounts

Running `php artisan migrate --seed` creates development accounts. All seeded
accounts use the password `password`.

| Role | Email |
| --- | --- |
| Administrator | `admin@spc.gov.lk` |
| Officer | `officer@spc.gov.lk` |
| Department Head | `depthead@spc.gov.lk` |
| Deputy Secretary | `deputy@spc.gov.lk` |
| Chief Secretary | `chiefsec@spc.gov.lk` |

These credentials are intended for local development only. Change them before
using the application in a shared or production environment.

## Common development commands

### Backend

Run tests:

```bash
cd backend
php artisan test
```

Reset and reseed the local database:

```bash
cd backend
php artisan migrate:fresh --seed
```

Clear cached Laravel configuration:

```bash
cd backend
php artisan optimize:clear
```

### Frontend

Run the linter:

```bash
cd frontend
npm run lint
```

Create a production build:

```bash
cd frontend
npm run build
```

## Project structure

```text
.
├── backend/       Laravel API, database migrations, seeders, and tests
├── frontend/      React and TypeScript user interface
└── verify-api.sh  API verification helper
```

## Troubleshooting

- **`could not find driver`:** enable the PHP SQLite/PDO SQLite extension.
- **`No application encryption key has been specified`:** run
  `php artisan key:generate` inside `backend`.
- **Database table errors:** run `php artisan migrate --seed` inside `backend`.
- **CORS errors:** use the default frontend URL, `http://localhost:5173`. If the
  frontend runs on another origin, update `backend/config/cors.php`.
- **Frontend cannot reach the API:** confirm the Laravel server is running on
  port `8000` and that `VITE_API_URL` ends with `/api`.
- **Changes to `.env` are ignored:** run `php artisan optimize:clear` and restart
  the development server.

## Security

Never commit `.env` files, application keys, database credentials, or other
secrets. Use the tracked `.env.example` as the configuration template.
