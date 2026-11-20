# Ticket Management System (TMS)

A full-stack Ticket Management System built with **Next.js**, **React**, **Tailwind CSS**, **Node.js/Express**, and **PostgreSQL**.

## Features

- Role-based access for Admin, Employee, Approver, and Support Team.
- Employee account creation, activation/deactivation, password reset, and deletion.
- Ticket creation with category, subcategory, iFtem, priority, selectable ticket date, and JPG/PDF attachment.
- One-level ticket approval and rejection.
- Support-team ticket pool, assignment, status updates, and resolution details.
- Ticket comments, approval history, and email notifications.
- Ticket lists with search and column-specific filters.
- Role-based dashboard with status overview, weekly ticket activity, attention items, and recent tickets.
- Lavender/white theme with centralized CSS variables and light/dark theme support.

## Important data-retention behavior

Deleting an employee removes the employee account, but does **not** delete tickets or their attachments. Ticket records retain the employee's name/email snapshots, and comment/history author names are preserved for historical display. Deleted accounts can no longer use an existing login token.

## Setup

### 1. Configure the backend environment

Copy `backend/.env.example` to `backend/.env` and fill in your local PostgreSQL password, JWT secret, and Outlook SMTP details.

The database name defaults to `ticket-management`.

### 2. Configure the frontend environment

Copy `frontend/.env.local.example` to `frontend/.env.local`.

### 3. Install dependencies

In one terminal:

```bash
cd backend
npm install
```

In another terminal:

```bash
cd frontend
npm install
```

### 4. Start the application

Start the backend:

```bash
cd backend
npm run dev
```

The backend initializes/updates the database schema before listening on port `5000`.

Start the frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Theme colors

The primary theme tokens are centralized in `frontend/app/globals.css` under `:root` and `:root[data-theme="light"]`. Update those variables to change the application's color palette without editing each component.

## Security note

Do not commit or share `.env` or `.env.local` files. Use the example files as templates and keep real credentials private.
