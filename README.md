# Exapanse-Mangager

Full-stack MERN expense tracking app with authentication, transaction management, goals, notifications, reports, and user settings.

## What This Project Does

- User registration and login with JWT auth
- Track income and expense transactions
- Filter transactions by type and bank
- Running balance, income, and expense calculations
- Dashboard analytics with charts and monthly trends
- Create savings goals and add funds toward goals
- Notification center (read/delete)
- User settings (profile, currency, bank selection)

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Recharts, React Hot Toast, SweetAlert2
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs
- Tooling: Nodemon, Concurrently

## Project Structure

```text
Exapanse-Mangager/
	Backend/
		src/
			config/
			controllers/
			middleware/
			models/
			routes/
			server.js
	Frontend/
		src/
			components/
			context/
			pages/
			utils/
	package.json
```

## Setup

### 1. Install dependencies

```bash
cd D:\Exapanse-Mangager\Backend
npm install

cd D:\Exapanse-Mangager\Frontend
npm install

cd D:\Exapanse-Mangager
npm install
```

### 2. Configure environment (Backend)

Create `Backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
```

## Run The Project

From root folder:

```bash
cd D:\Exapanse-Mangager
npm run dev
```

This starts both backend and frontend together.

## Build

From root folder:

```bash
cd D:\Exapanse-Mangager
npm run build
```

Build output is generated in `Frontend/dist`.

## API Base URL

- Frontend uses: `http://localhost:5000/api`

## Main API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/update`

### Transactions

- `GET /api/transactions/stats`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Goals

- `GET /api/goals`
- `POST /api/goals`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`
- `POST /api/goals/:id/add-funds`

### Notifications

- `GET /api/notifications`
- `PUT /api/notifications/mark-read`
- `DELETE /api/notifications/:id`

## What I Implemented In This Project

- Designed and built complete MERN expense manager architecture
- Implemented secure auth flow (register/login/me/update) with JWT
- Built transaction CRUD with stats and filtering
- Added dashboard charts for trends and category-wise insights
- Added goals module with progress tracking and add-funds action
- Added notifications module and bulk mark-as-read
- Implemented settings page with profile/currency/bank preferences
- Added single root command to run backend + frontend together
- Added single root command to build frontend from root
- Updated gitignore setup for env files and node_modules

## Common Issues

- `EADDRINUSE: 5000`: another process is using backend port 5000. Stop that process or change `PORT` in `Backend/.env`.
- Vite chunk size warning during build: warning only, build still succeeds.

## Future Improvements

- Add backend tests and frontend unit/integration tests
- Add Docker setup for one-command containerized run
- Add role-based permissions and profile image upload
- Add pagination and export (CSV/PDF) for transactions
