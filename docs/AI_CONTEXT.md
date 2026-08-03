# THE GAME CAFE

## Project Overview

THE GAME CAFE is a graduation project.

It is a Restaurant / Cafe Management System with Customer Ordering.

The project is already functional and should be extended instead of rewritten.

---

# Tech Stack

Frontend

- React 19
- Vite
- React Router

Backend

- Firebase Authentication
- Cloud Firestore

Deployment

- Vercel

Styling

- CSS only
- Do NOT use Tailwind
- Reuse existing App.css and project styles

---

# Project Structure

src/

- pages/
- components/
- hooks/
- services/
- utils/
- assets/

docs/

- AI_CONTEXT.md

---

# Firebase

Use ONLY the existing Firebase configuration.

Never create another firebase.js.

Current exports

- db
- auth

---

# Firestore Collections

users

Fields

- email
- role

Role values

- owner
- employee

menu

Fields

- name
- price
- image

orders

Fields

- tableNumber
- items
- total
- status
- createdAt

Future

categories

Fields

- name
- order
- createdAt

---

# Existing Features

Completed

- Login
- Owner Dashboard
- Employee Dashboard
- Customer Ordering
- QR Table Ordering
- Daily Sales Report
- Order Status
- Menu Display
- Shopping Cart

Planned

- Menu Categories
- Inventory
- Receipt
- Payment
- Promotions

---

# Coding Rules

Always reuse existing code.

Never duplicate logic.

Never rewrite architecture.

Never rename files unless necessary.

Prefer modifying existing services instead of creating duplicates.

Keep backward compatibility.

Return complete modified files.

Follow the existing coding style.

---

# Services

Existing

- menuService
- orderService

Future

- categoryService

---

# Hooks

Existing

- useMenu
- useOrders

Future

- useCategories

---

# Development Workflow

Before writing code

1. Read this document.
2. Inspect existing project files.
3. Reuse current architecture.
4. Do not make assumptions.

After coding

Explain

- Modified Files
- New Files
- Why each file changed
- Possible Issues
- Future Improvements

---

# Important

This is a production-style graduation project.

Code quality is more important than speed.

Avoid shortcuts.

Prefer reusable solutions.

Always think about future scalability.