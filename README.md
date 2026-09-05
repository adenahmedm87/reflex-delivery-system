# REFLEX — Delivery Coordination System
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue.svg)]
(https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
9/5/26, 7:14 PM GitHub README Update Guide & Content - REFLEX Group 33
file:///C:/Users/laptop/Downloads/gemini-code-1788624825059.html 1/3
[![Deployment](https://img.shields.io/badge/Render-Deployed-success.svg)](https://reflex￾delivery-system-anig.onrender.com/)
> **Delivery coordination that can recover.** 
> An operational Support Deflection MVP built for **Northstar Retail Co.** to eliminate
delivery blind spots, automate health escalation, and provide real-time self-service
tracking.
---
## 📌 Project Overview
In field delivery operations, delays and unhandled exceptions (such as missing customers or
address errors) lead to customer anxiety and an influx of costly support tickets. 
**REFLEX** solves this problem by connecting four distinct user roles—**Retailers,
Dispatchers, Riders, and Customers**—into a unified real-time event pipeline. When a
delivery issue occurs in the field, REFLEX immediately escalates the delivery health status
to `ACTION_NEEDED`, alerting dispatchers and informing customers before a manual support
ticket is ever opened.
---
## 🚀 Key Features
* **Multi-Role Coordination Portals:**
 * **Retailer Portal:** Simplified delivery request creation and dispatch initialization.
 * **Dispatcher Panel:** Real-time fleet monitoring, rider availability tracking, and
Socket.IO order streaming.
 * **Rider Dashboard:** Mobile-ready job execution with strict state machine validation
(`ASSIGNED` → `PICKED_UP` → `IN_TRANSIT`).
 * **Customer Tracking Portal (`/track.html`):** Public, unauthenticated self-service
tracking with live status timelines and health indicators.
* **State Machine & Duplicate Pickup Guard:**
 * Strict validation prevents invalid status jumps or duplicate package pickups.
 * Validates parcel pickup codes before unlocking downstream status transitions.
* **Automated Health Engine:**
 * Real-time dynamic evaluation of delivery health:
 * `ON_TRACK` — Delays under 15 minutes.
 * `AT_RISK` — Delays between 15 and 30 minutes.
 * `ACTION_NEEDED` — Delays exceeding 30 minutes or active field exceptions (e.g.,
`CUSTOMER_UNAVAILABLE`).
* **Offline Event Queue (Rider MVP):**
 * Local queue UI buffer allowing riders to perform status updates even when network
connectivity drops, syncing back once restored.
---
9/5/26, 7:14 PM GitHub README Update Guide & Content - REFLEX Group 33
file:///C:/Users/laptop/Downloads/gemini-code-1788624825059.html 2/3
## 🛠 Technology Stack
* **Backend:** Node.js, Express.js
* **Real-time Communication:** Socket.IO (WebSockets)
* **Database:** PostgreSQL (Relational Persistence)
* **Frontend:** HTML5, CSS3 (Modern High-Contrast Dark Theme), Vanilla JavaScript
* **Authentication:** JSON Web Tokens (JWT) & bcrypt password hashing
* **Deployment:** Hosted live on **Render** (`https://reflex-delivery-system￾anig.onrender.com/`)
---
## 🗂 Repository Structure
```text
reflex-delivery-system/
├── docs/ # Architecture diagrams & API documentation
├── public/ # Static frontend assets (login, dispatcher, rider, track)
│ ├── index.html # Landing / Login page
│ ├── dispatcher.html # Dispatcher management board
│ ├── rider.html # Mobile rider execution app
│ └── track.html # Public customer tracking portal
├── scripts/ # Database seeding and automated test scripts
│ ├── seed.js # Database seed script
│ └── test-health.js # Automated health logic test suite
├── sql/ # Relational schema migrations
│ └── schema.sql # Database table definitions
├── src/ # Application source code
│ ├── middleware/ # Auth and error handling middleware
│ ├── routes/ # Express REST API endpoints (/api/orders, /api/riders)
│ ├── services/ # Business logic (healthService, routingService)
│ ├── db.js # PostgreSQL connection pool
│ └── server.js # Express server & Socket.IO initialization
├── .env.example # Template environment configuration
├── package.json # NPM scripts and project dependencies
└── README.md # Project documentation
