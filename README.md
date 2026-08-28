# Corporate Gifting Platform

A full-stack corporate gifting application built with **React (Vite)**, **Node (Express)**, and **MySQL**, in the navy-and-gold design system.

It has two sides:

- **Client Order Workflow** (`/`) — a 7-step wizard: Enter Email → Verify Email (OTP, mandatory) → Gift Collection → Select Gift → Delivery Details → Confirm → Order Submitted.
- **Admin Console** (`/admin`) — Dashboard (KPIs, recent orders, 7-day chart, status breakdown), Employee Management (name + email only), and Order Management (search, status/date filters, view/edit).

```
corporate-gifting/
├── server/          Express + MySQL API
│   ├── db/          schema.sql + seed.sql
│   └── src/         routes, db pool, mailer, setup script
└── client/          React + Vite front-end
    └── src/
        ├── client/  order workflow wizard
        └── admin/   admin console
```

## Prerequisites

- **Node.js 18+** (uses `node --watch` and native `fetch`)
- **MySQL 8+** running locally (or update the connection settings)

## 1. Set up the database

```bash
cd server
cp .env.example .env          # then edit DB_USER / DB_PASSWORD
npm install
npm run db:setup              # creates the DB, tables, and seed data
```

`db:setup` runs `db/schema.sql` and `db/seed.sql` for you. If you prefer the MySQL CLI:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
```

## 2. Start the API

```bash
cd server
npm run dev                  # http://localhost:4000
```

Health check: <http://localhost:4000/api/health>

### About the OTP / email

By default no SMTP is configured, so the app runs in **DEV mode**: the OTP is
printed to the server console **and** returned in the API response, so the
verification screen shows it on-screen. To send real email, fill in the
`SMTP_*` values in `server/.env`.

## 3. Start the front-end

```bash
cd client
npm install
npm run dev                  # http://localhost:5173
```

Vite proxies `/api/*` to the API on port 4000, so no extra config is needed.

- Client workflow: <http://localhost:5173/>
- Admin console: <http://localhost:5173/admin>

## API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/request-otp` | Send OTP to an email |
| POST | `/api/auth/verify-otp` | Verify an OTP code |
| GET | `/api/gifts` | List active gifts |
| POST | `/api/orders` | Create an order (client workflow) |
| GET | `/api/orders` | List orders (`?search=&status=&date=`) |
| GET | `/api/orders/:id` | Order detail |
| PUT | `/api/orders/:id` | Update order status |
| GET | `/api/employees` | List employees (`?search=`) |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/dashboard/stats` | KPIs, recent orders, 7-day chart, breakdown |

## Notes & design decisions

- **Employees store only first name, last name, and email** — no phone, address, salary, or department — matching the brief's explicit exclusions.
- **Order codes** are generated server-side as `ORD-1006`, `ORD-1007`, … continuing from the seeded data.
- **Order statuses** are `Submitted`, `Processing`, `Completed`; "Pending" on the dashboard means anything not yet `Completed`.
- OTPs expire after `OTP_TTL_MINUTES` (default 10) and are single-use.

## Production build

```bash
cd client && npm run build   # outputs to client/dist
```

Serve `client/dist` from any static host and point it at the API via
`VITE_API_BASE`, or place both behind a reverse proxy.
