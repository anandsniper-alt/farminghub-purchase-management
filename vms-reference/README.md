# Farming Hub — Vendor Management (Purchase CRM)
 
A CRM-style tool for **Farming Hub Private Limited** to record, tag, and recall
suppliers met at expos & fairs (Canton Fair, Intex Bangalore/Coimbatore, etc.),
track samples & ratings, and manage sourcing concentration per component.
 
> Built for the Purchase team to move from reactive "firefighting" sourcing to an
> organized, searchable supplier-development database.
 
---
 
## ✨ Features
 
- **Vendor records** with multiple **product/component tags** per vendor (Engine, Water Pump, Power Sprayer, …).
- **Multiple contacts** per vendor (name, phone, designation — MD, Managing Partner, …).
- **Pipeline stages** (New Lead → Potential → Approved → Active → On Hold → Inactive → Blacklisted) — fully editable, with a "counts in sourcing" flag.
- **City / region** field to map supplier density by location (Taizhou, Zhanjiang, …).
- **Expo / source tracking** with edition & year (Canton Fair – 137th, Intex Bangalore 2024, …).
- **Photo capture & attachment** per vendor with an **editable Type list** (Product / Booth / Online / …), stored on the server volume.
- **Sample tracking**: status, price with **multi-currency (INR / USD / YUAN) + live INR conversion**, price & quality remarks — per component.
- **Interaction log**: per-vendor timeline of calls / meetings / visits with **typed notes, voice recordings, and document/image attachments**, timestamped.
- **Supplier ratings**: Communication, Reliability, Overall, Annual Production Volume + free-text remarks.
- **Sourcing-concentration report**: flags components with too few alternate suppliers (no single supplier > 80% rule).
- **Analytics**: vendors per product line & component, product-line coverage per vendor, vendors per stage.
- **Search & filter** by product, component, city, expo, stage, or product group.
- **Product lines grouped** (Utilities, LAE, Implements, …) — groups & lines editable in-app.
- **Editable lookup lists** (stages, photo types, currencies, product groups) via a Settings page.
- **JWT auth** with roles (Admin / Purchase / Viewer).
 
## 🧱 Tech Stack
 
| Layer     | Tech                                                                    |
| --------- | ----------------------------------------------------------------------- |
| Frontend  | React (Vite), TailwindCSS, React Router, TanStack Query, Axios, React Hook Form + Zod |
| Backend   | Node.js, Express, Prisma ORM, JWT auth, Multer (uploads), Zod validation |
| Database  | PostgreSQL                                                               |
| Deploy    | Docker + Coolify → `operations.farminghub.in`                                   |
 
## 📂 Structure
 
```
FH-VMS/
├── backend/          # Express + Prisma API
│   ├── prisma/       # schema + seed
│   ├── src/          # app, routes, controllers, middleware
│   └── uploads/      # photo volume (gitignored)
├── frontend/         # React + Vite SPA
│   └── src/
├── docker-compose.yml
└── README.md
```
 
## 🚀 Local Development
 
### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 14+ (or use the bundled `docker-compose` db service)
 
### 1. Backend
 
```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate        # creates tables
npm run seed                  # 22 categories + admin user + demo data
npm run dev                   # http://localhost:8000
```
 
Default admin (from seed): **admin@farminghub.in / REPLACE_BEFORE_USE** — change after first login.
 
### 2. Frontend
 
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev                   # http://localhost:5173
```
 
## 🐳 Docker (all-in-one)
 
```bash
docker compose up --build
```
 
Brings up `postgres`, `backend` (:8000), and `frontend` (:80). See
[`docs/DEPLOY-COOLIFY.md`](docs/DEPLOY-COOLIFY.md) for the Coolify + `operations.farminghub.in` setup.
 
## 🔐 Security
 
- Secrets live only in `.env` files (gitignored). Never commit them.
- Rotate any credential that has been shared in plaintext.
- Passwords hashed with bcrypt; API protected by JWT bearer tokens.
 
---
 
© Farming Hub Private Limited
