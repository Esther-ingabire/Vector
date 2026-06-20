# ChainSight — Supply Chain Data Analytics System
## Presentation & Flow Walkthrough Guide
**AUCA Final Year Project | June 2026**

---

## 1. What We Built — In One Sentence

A full-stack agricultural supply chain analytics platform that tracks produce from cooperative dispatch through to market-level waste reporting across Rwanda, using real-time IoT monitoring, rule-based loss prediction, and automated AI-generated intelligence briefs for MINAGRI officers — with a web app for office-based roles and an offline-capable React Native mobile app for field roles.

---

## 2. Languages & Technologies Used

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11 | Primary backend language |
| **Django** | 4.2.13 | Web framework + ORM |
| **Django REST Framework** | 3.14.0 | REST API layer |
| **PostgreSQL** | 15 | Primary relational database |
| **Celery** | 5.3.6 | Background task queue (report generation, nightly AI insights) |
| **Redis** | 7.x | Celery broker + cache |
| **django-celery-beat** | 2.6.0 | Cron-style scheduled tasks (nightly jobs) |
| **djangorestframework-simplejwt** | 5.3.1 | JWT access + refresh token auth |
| **drf-spectacular** | 0.27.1 | Auto-generated OpenAPI/Swagger docs |
| **paho-mqtt** | 1.6.1 | MQTT protocol for IoT sensor ingestion |
| **qrcode** | 7.4.2 | QR code generation for batch labels |
| **ReportLab** | 4.1.0 | PDF report generation |
| **openpyxl** | 3.1.2 | Excel (.xlsx) report generation |
| **Pandas** | 2.1.4 | Data cleaning, aggregation, KPI computation |
| **NumPy** | 1.26.4 | Numerical computation for analytics |
| **scikit-learn** | 1.4.2 | Phase 2 ML — LinearRegression for loss trend prediction |
| **Pillow** | 10.3.0 | Image handling |
| **phonenumbers** | 8.13.35 | Phone number validation |
| **django-cors-headers** | 4.3.1 | Cross-Origin Resource Sharing |
| **psycopg2-binary** | 2.9.9 | PostgreSQL adapter |

### Frontend (Web)
| Technology | Version | Purpose |
|---|---|---|
| **JavaScript (React)** | 18.2 | Frontend language + UI framework |
| **Vite** | Latest | Build tool + dev server |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **React Router** | v6 | Client-side routing |
| **Zustand** | Latest | Global state management |
| **Axios** | 1.x | HTTP client for API calls |
| **Leaflet.js + React-Leaflet** | 1.9.x | Rwanda district heatmap + GPS maps |
| **Chart.js via react-chartjs-2** | 4.x | KPI charts, trend lines, loss comparisons |

### Mobile App (Field Roles)
| Technology | Version | Purpose |
|---|---|---|
| **JavaScript (React Native)** | 0.73.x | Mobile app language |
| **Expo** | Managed | Build toolchain, camera, location APIs |
| **AsyncStorage** | 2.x | Offline queue for form submissions |
| **Axios** | 1.x | API calls |
| **React Navigation** | Latest | Screen navigation |
| **Expo Location API** | Built-in | GPS tracking for transporters |
| **Expo Camera / QR** | Built-in | QR code scanning at handover points |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Local dev environment consistency |
| **GitHub** | Version control, feature branches |
| **Railway.app / Render** | Production deployment (free tier) |

---

## 3. AI / ML — What We Use and Why

### Do We Use a Pre-Trained Model?
**No.** We do not use any pre-trained external ML model (no GPT, no BERT, no downloaded weights file). Here is exactly what we do:

### Phase 1 — Rule-Based Scoring (Implemented, Operational from Day 1)
- Uses **Rwanda-specific crop loss thresholds** from FAO East Africa datasets and RAB crop loss benchmarks
- No training data required — works immediately
- Configured per crop type:

| Crop | Amber (Transit) | Red (Transit) | Cold Chain |
|---|---|---|---|
| Tomatoes | > 4 hours OR > 28°C | > 6 hours OR > 32°C | Required |
| Bananas | > 6 hours OR physical damage | > 8 hours OR > 30°C | Recommended (long routes) |
| Avocados | > 12 hours | > 24 hours OR > 25°C | Recommended |
| Potatoes | > 24 hours | > 48 hours | Not required |
| Maize (dry) | > 72 hours | > 120 hours | Not required |
| Beans (dry) | > 72 hours | > 120 hours | Not required |

- Risk score 0–40 = **GREEN**, 41–70 = **AMBER**, 71–100 = **RED**
- Implemented in: `backend/apps/predictions/` with a `LossPrediction` model

### Phase 2 — Machine Learning (Framework Built, Not Yet Triggered)
- Uses **scikit-learn LinearRegression** for 6-month loss trend prediction on the MINAGRI dashboard
- Triggers only after 500+ completed batch records accumulate (requirement from spec)
- Designed as a **Random Forest Classifier** upgrade path — trained entirely on the system's own Rwanda-specific historical data
- The framework (`Prediction.phase = ML_MODEL`) is built; no external model weights needed

### AI Insights Engine (Implemented as Template-Based NLG)
- Runs nightly via **Celery** at 01:30 after data processing completes
- Queries the analytics database and fills structured text templates to produce the Daily Intelligence Brief
- Outputs are stored in `DailyBriefBundle` and displayed on the MINAGRI dashboard each morning
- Generated insights include: national loss summary, high-loss district alerts, delivery method switching recommendations, cooperative performance highlights
- **No LLM API used** — this is template-based Natural Language Generation (NLG), which is Phase 1. The spec mentions Claude/GPT integration as Phase 2 future work.

### If Asked: "Why Not Use ChatGPT?"
- LLM APIs cost money per call and require internet — not appropriate for a government system in Rwanda where offline resilience matters
- Our template-based NLG is deterministic, auditable, and produces the same output for the same data — important for a government reporting system
- LLM integration is explicitly listed as Phase 2 future work in the requirements

---

## 3b. What Actually Powers the Predictions — Django or a Model?

**Short answer: Django runs the logic. Python does the maths. Scikit-learn is just a library, not an external model.**

Here is exactly how each prediction type works, end to end:

### Phase 1 — Rule-Based (What runs in the live system today)

```
Batch data arrives (transit hours, temperature, crop type)
        ↓
Django view calls predictions/engine.py
        ↓
Pure Python if/else checks the crop's configured thresholds:
  if transit_hours > crop.safe_transit_hours_red → score = RED (71–100)
  elif transit_hours > crop.safe_transit_hours_amber → score = AMBER (41–70)
  else → score = GREEN (0–40)
        ↓
LossPrediction record saved to PostgreSQL
        ↓
API returns score + recommendation text to the frontend
```

**No model file. No weights file. No external service.** It is Python code inside Django reading configuration values from the database and applying them to batch data. The thresholds (e.g. tomatoes go AMBER after 4 hours) come from FAO/RAB benchmarks loaded into the database at setup.

### Phase 2 — scikit-learn LinearRegression (What runs for the MINAGRI loss trend chart)

```
MINAGRI officer loads the loss trend page
        ↓
Django view (MinagriLossTrendView) queries last 6 months of NationalDailyKPI records
        ↓
Pandas converts those records to a DataFrame (month numbers + loss rates)
        ↓
scikit-learn LinearRegression.fit(X_months, y_loss_rates) — trains on the fly
        ↓
model.predict([month_7, month_8, month_9]) → next 3 months estimated loss %
        ↓
Django returns actual (6 months) + predicted (3 months) in one JSON response
        ↓
Chart.js on the frontend draws both as a line chart with different colours
```

**scikit-learn here is a Python library, not a downloaded model.** It trains a fresh regression line every time the page loads, using only the system's own historical data. There is no `.pkl` weights file, no Hugging Face download, no API call to any external service. It is the same as using NumPy to fit a line — just with a cleaner API.

### The Designed Phase 2 Upgrade (Post-Launch, 500+ records)

When the system accumulates 500+ completed batches with confirmed loss outcomes, the plan is to:
1. Train a `RandomForestClassifier` on features: crop type, transit hours, temperature deviation, time of day, distance, market agent history, season
2. Save the trained model as a `.pkl` file using `joblib`
3. Replace the rule-based scoring with the classifier's output
4. Target accuracy: 75–85%

This is not yet done — it requires real data from the system running in production. The **framework** (the `Prediction.phase = ML_MODEL` field, the feature extraction code) is in place.

### Summary Table

| What | Technology | External? | File? | Trains when? |
|---|---|---|---|---|
| Phase 1 loss risk score (GREEN/AMBER/RED) | Pure Python if/else in Django | No | No | N/A — rule-based |
| MINAGRI 3-month trend prediction | scikit-learn LinearRegression in Django | No | No | On every page load, on live DB data |
| AI Daily Intelligence Brief | Python template strings in Celery task | No | No | Nightly at 01:30, from DB |
| Phase 2 classifier (future) | scikit-learn RandomForestClassifier | No | `.pkl` (future) | Once on 500+ records, retrained weekly |

---

## 3c. The Seven System Modules — Where Each Is Covered

The system requirements define 7 modules. Here is exactly where each one is implemented, which role interacts with it, and what code covers it.

---

### MODULE 1 — Data Integration Module
**Purpose:** Aggregate supply chain data from all stakeholder inputs, IoT sensors, GPS feeds, and file uploads into a validated, unified PostgreSQL dataset.

| Data Source | Who Provides It | How It Enters the System | Backend Code |
|---|---|---|---|
| Dispatch records + stock updates | Cooperative Manager (web) | REST API POST from React form | `cooperatives/views.py` |
| GPS coordinates + delivery confirmations | Transporter (mobile) | REST API POST from React Native, offline queue | `transport/views.py` |
| Receipt confirmations + order data | Distributor (web) | REST API POST from React form | `distribution/views.py` |
| Collection confirmations + waste reports | Market Agent (mobile) | REST API POST, offline AsyncStorage queue | `market_agents/views.py` |
| Cold storage temperature + humidity | ESP32 IoT sensor | HTTP POST or MQTT to Django endpoint | `iot/views.py` |
| Refrigerated vehicle cargo temperature | ESP32 on vehicle | HTTP POST attached to active trip | `iot/views.py` |
| GPS vehicle route | Transporter mobile (Expo Location API) | REST API POST every 2 minutes during trip | `transport/views.py` (GPSTrack) |
| QR code scan events | Market Agent / Distributor (mobile scan) | REST API POST from camera scanner | `traceability/views.py` |

**Validation built in:** weight > 0 checks, arrived ≤ collected, GPS Rwanda bounding box check, timestamp sequence validation, duplicate prevention via idempotency keys.

**Who interacts with Module 1:** All 5 operational roles (every role feeds data in). Admin monitors it via the Data Integration Monitor screen.

---

### MODULE 2 — Data Processing and Analytics Module
**Purpose:** Process raw data into clean KPIs, loss figures, and aggregates. Runs as Celery background jobs — never blocks the web server.

**Technology:** Python + Pandas + NumPy inside Celery tasks, scheduled via django-celery-beat.

| Job | When It Runs | What It Computes | Output Table |
|---|---|---|---|
| Nightly full aggregation | 01:00 every night | National + district loss, volume, stage breakdown | `NationalDailyKPI`, `DistrictDailyKPI` |
| Weekly KPI refresh | Monday 02:00 | Cooperative reliability score (on-time 40% + quality 40% + response 20%) | `CooperativeReliabilityHistory` |
| Monthly trend computation | 1st of month 03:00 | Season-on-season loss comparison, year-on-year | Queried live from KPI tables |
| Loss quantification | Triggered on receipt/collection confirm | Transit loss, self-transport loss, market loss per batch | `Batch` model fields |
| Delivery method aggregation | Nightly | Self-collection vs. transporter loss % per agent | `DeliveryMethodComparison` |

**Who sees Module 2 outputs:**
- Cooperative Manager → stock analytics, storage performance
- Distributor → transit loss rates, delivery method comparison chart
- MINAGRI Officer → national KPIs, district heatmap, trend charts (all powered by this module's output)
- Admin → data quality flags, integration health

---

### MODULE 3 — Loss Prediction and Bottleneck Detection Module
**Purpose:** Generate risk scores for batches and collection events before and during transit.

**Technology:** Phase 1 = Python rule-based engine in Django. Phase 2 = scikit-learn LinearRegression (live) + RandomForestClassifier (planned).

| Prediction Type | Who Sees It | When Triggered | Technology |
|---|---|---|---|
| Storage risk score (cold storage IoT breach) | Cooperative Manager | On IoT reading save, if threshold exceeded | Rule-based: temp > crop threshold |
| Transit risk score (batch in transit) | Cooperative Manager, Distributor | Computed when batch dispatched | Rule-based: hours + temp thresholds |
| Collection Risk Advisory (GREEN/AMBER/RED) | Market Agent (mobile) | Before leaving for self-collection | Rule-based: crop + time of day + distance |
| Loss trend prediction (3-month forecast) | MINAGRI Officer | On dashboard page load | scikit-learn LinearRegression on 6-month history |
| Bottleneck detection (route delay hotspots) | MINAGRI Officer | Live query on `/api/v1/analytics/minagri/bottlenecks/` | Pandas aggregation + threshold comparison |
| Delivery method recommendation | Distributor | When self-transport loss > 10% for an agent | Rule-based threshold on `DeliveryMethodComparison` |

**Screens powered by this module:**
- `LossPredictionPage.jsx` (MINAGRI)
- `PredictionsPage.jsx` (MINAGRI)
- `AlertsPage.jsx` (MINAGRI)
- `BottleneckDetectionPage.jsx` (MINAGRI)
- `StorageAnalytics.jsx` (Cooperative Manager)
- Collection Risk Advisory panel in mobile market agent dashboard

---

### MODULE 4 — Transparency and Traceability Module
**Purpose:** Provide complete end-to-end visibility into each batch from cooperative dispatch to waste report. QR code scan events serve as tamper-evident handover anchors.

**Technology:** `Batch` model in PostgreSQL aggregating records from all 5 handover points. QR code generated by `qrcode` Python library. `QRCodeScanEvent` records every scan.

| Handover Point | Who Records It | What Is Captured | Loss Calculated |
|---|---|---|---|
| HP1: Cooperative dispatches | Cooperative Manager | Dispatch weight, quality grade, QR code, timestamp | Baseline — no loss yet |
| HP2: Distributor receives | Distributor | Weight received, quality grade, QR scan | Transit loss Leg 1 = dispatched − received |
| HP3: Market Agent collects at distributor | Market Agent | Quantity collected, QR scan, delivery method | Self-transport tracking begins |
| HP4: Market Agent arrives at stall | Market Agent | Quantity arrived, condition code | Self-transport loss = collected − arrived |
| HP5: End-of-day waste report | Market Agent | Sold, discarded, discard reason | Market loss = discarded |

**Who uses Module 4:**
- Cooperative Manager → `TraceabilityView.jsx` — search own dispatched batches
- Distributor → `Traceability` screen — full journey of received batches
- Market Agent (mobile) → Order History — own orders with loss outcomes
- Admin → can query any batch for audit purposes

**Key endpoint:** `GET /api/v1/traceability/batches/{id}/` returns the complete journey timeline in one response.

---

### MODULE 5 — Visualization Dashboard Module
**Purpose:** Role-based dashboards showing supply chain insights appropriate to each stakeholder. Charts, maps, KPI cards — no raw data tables for MINAGRI.

**Technology:** Chart.js (trend lines, bar charts, pie charts), Leaflet.js (Rwanda district heatmap + GPS routes), Tailwind CSS for responsive layouts.

| Role | Key Visual Components | Screens |
|---|---|---|
| Admin | Data sync health indicators, audit log feed, session list | `AdminDashboard.jsx` |
| Cooperative Manager | IoT storage gauges (temp + humidity), stock-by-crop bar chart, produce request inbox cards | `CooperativeDashboard.jsx`, `StorageAnalytics.jsx` |
| Transporter | Active trip GPS map, cold chain temperature gauge, trip request cards with Accept/Decline | `ActiveTripScreen.js` (mobile) |
| Distributor | Cooperative directory cards with reliability stars, receipt confirmation queue, delivery method loss comparison chart | `DistributorDashboard.jsx`, `DistributionAnalytics.jsx` |
| Market Agent | Collection risk advisory traffic light (large, mobile-optimised), stall stock on hand (large number), quick-entry waste report form | `DashboardScreen.js` (mobile) |
| MINAGRI Officer | Rwanda district heatmap (Leaflet), AI Daily Intelligence Brief panel, seasonal trend chart with year-on-year overlay | `MinagriDashboard.jsx`, `DistrictPerformancePage.jsx` |

**Responsive breakpoints:** 375px (mobile), 768px (tablet), 1280px+ (desktop) — all web dashboards tested at all three.

---

### MODULE 6 — AI Insights Engine
**Purpose:** Replace the Supply Chain Analyst role entirely. Runs nightly as a Celery task and auto-generates plain-English intelligence for the MINAGRI Officer. No human intervention required.

**Technology:** Python template-based NLG inside a Celery task (`generate_daily_insights`). Queries the processed analytics tables and fills structured sentence templates. Output stored in `DailyBriefBundle` table and displayed the next morning.

**Who uses it:** MINAGRI Officer only.

**What it generates nightly:**
| Insight Type | Example Output |
|---|---|
| National loss summary | "Rwanda lost 312 tons (8.4%) of tracked produce this week — up 1.2% vs last week." |
| Stage breakdown | "Transit losses accounted for 41% of total losses this week, the highest stage." |
| Route alert | "Kigali–Musanze route loss rate increased by 6.2% vs 30-day average." |
| Cold chain alert | "Facility: Rubavu Cold Store breached 28°C for 4.2 hours — 3 batches at risk." |
| Delivery method insight | "Self-collection loss: 11.8% vs transporter delivery: 4.2%. Switching perishables could save ~18 tons/month." |
| Cooperative highlight | "Top performer this week: Bugesera Farmers Coop — 98% on-time, Grade A consistency." |
| Market agent alert | "Agent: Uwase Josephine — self-collection loss above 15% for 4 consecutive weeks. Recommend delivery switch." |
| Seasonal outlook | "Tomato harvest season peaks in 10 days. Historical loss rate during this period: 14–18%." |

**Screens:** `MinagriDashboard.jsx` (AI brief panel at top of page), `AlertsPage.jsx` (critical alerts from Module 6 output).

**Backend:** `ai_insights/` app — `AIInsight` model, `DailyBriefBundle` model, Celery task `generate_daily_insights` scheduled at 01:30 nightly.

---

### MODULE 7 — Reporting Module
**Purpose:** Generate and export supply chain performance reports. All reports are produced by Celery background jobs and stored for download. No user waits in real time.

**Technology:** ReportLab (PDF), openpyxl (Excel .xlsx), Pandas (CSV streaming). Reports queued asynchronously via Celery with status: QUEUED → GENERATING → READY.

| Report | Who Can Download | Format | Schedule | Screens |
|---|---|---|---|---|
| National KPI Summary | MINAGRI Officer | PDF | Weekly (Monday) | `NationalReports.jsx` |
| District Loss Report | MINAGRI Officer | PDF | Monthly (1st) | `NationalReports.jsx` |
| Crop Loss Report | MINAGRI Officer | PDF | Monthly (1st) | `NationalReports.jsx` |
| Cold Chain Compliance Report | MINAGRI Officer | PDF | Monthly (1st) | `ColdChainPage.jsx` |
| Delivery Method Loss Comparison | Distributor (own agents) + MINAGRI (all) | PDF + Excel | On demand | `DistributorReports.jsx`, `CustomReportsPage.jsx` |
| Stage-Specific Loss Breakdown | Distributor + Cooperative Manager + MINAGRI | PDF | On demand | `RoleReportsPage.jsx` |
| Per-Batch Traceability Report | Distributor + Cooperative Manager | PDF | On demand per batch | `TraceabilityView.jsx` |
| Market-Level Waste Report | Distributor (own agents) | Excel | On demand | `DistributorReports.jsx` |
| CSV Export (role-scoped, live) | All roles (own data only) | CSV streaming | On demand | `RoleReportsPage.jsx` |

**Backend:** `reports/` app — `Report` model with file path and status; `reports/views.py` generates reports inline or queues Celery job; `reports/urls.py` exposes `/api/v1/reports/export/` for streaming CSV.

---

## 4. Supply Chain Flow — Role by Role

### The Five Handover Points (Loss Calculated at Each)

```
[Farmer] → [Cooperative] → [Transporter Leg 1] → [Distributor] → [Transporter Leg 2 OR Self-Collection] → [Market Agent] → Consumer (out of scope)
              HP1                  HP2/3                 HP4               HP5 (if self-collect)              HP5 (waste report)
```

---

### ROLE 1 — SYSTEM ADMINISTRATOR

**Platform:** Web app  
**What they do:** Manages user accounts, reviews registration requests, monitors system health. Never sees supply chain data.

**Flow to Test:**
1. Go to Admin dashboard → should see system health bar, pending approval count, recent audit log
2. Open Registration Queue → list of pending `AccessRequest` records with document uploads
3. Click Approve → system creates User account, assigns role, generates OTP, sends email
4. Check Audit Log → every action timestamped with IP address

**Built:**
- ✅ Admin dashboard page (`AdminDashboard.jsx`)
- ✅ Registration queue (`RegistrationQueue.jsx`) with approve/reject
- ✅ User management (`UserManagement.jsx`)
- ✅ Audit log viewer (`AuditLogPage.jsx`)
- ✅ Data integration monitor (`DataIntegrationMonitor.jsx`)
- ✅ System announcements (`SystemAnnouncements.jsx`)
- ✅ Feedback inbox (`FeedbackInbox.jsx`)
- ✅ Backend: Full `AccessRequest` → `User` creation flow with OTP generation

**Backend Endpoint:** `POST /api/v1/auth/access-requests/{id}/approve/`

**Potential Panel Question:** *"How does admin verify documents?"*  
Answer: Applicants upload PDFs/images at the public Request Access page. Admin sees document previews in the Registration Request Detail screen and can call the applicant or contact their cooperative/market association before approving.

---

### ROLE 2 — COOPERATIVE MANAGER

**Platform:** Web app  
**What they do:** Receives produce from member farmers, maintains cold storage, responds to distributor produce requests, dispatches batches via transporters.

**Flow to Test:**
1. Login as Cooperative Manager
2. Dashboard shows: own stock summary, incoming produce requests, active batches in transit, cold storage IoT readings
3. **Produce Request arrives** (from a Distributor): Accept → creates `SupplyAgreement` → this becomes the traceability anchor for the batch
4. **Arrange Transport**: Search transporter directory filtered by route + vehicle type → send `TransportRequest`
5. **Batch Dispatch**: When transporter confirms pickup, system records dispatch weight, quality grade, timestamp → QR code generated
6. Monitor active batch on the Active Batches screen — shows GPS location (from transporter mobile), cold chain temp (if refrigerated)

**Built:**
- ✅ Cooperative dashboard (`CooperativeDashboard.jsx`)
- ✅ Stock management (`StockManagement.jsx`)
- ✅ Produce requests inbox (`ProduceRequests.jsx`)
- ✅ Transport request management (`TransportRequests.jsx`)
- ✅ Active batches monitor (`ActiveBatches.jsx`)
- ✅ Cold storage IoT analytics (`StorageAnalytics.jsx`)
- ✅ Batch traceability view (`TraceabilityView.jsx`)
- ✅ Backend: `Cooperative`, `CooperativeStock`, `ColdStorageFacility`, `ProduceRequest`, `SupplyAgreement` models
- ✅ Cooperative reliability score calculated weekly (on-time dispatch 40% + quality 40% + response rate 20%)
- ✅ QR code generation via `qrcode` Python library

**IoT:** Cold storage ESP32 sensors POST temperature/humidity every 15 minutes to `/api/v1/iot/storage/`. Breach alerts fire immediately when threshold exceeded.

**Does NOT see:** Other cooperatives' data, national analytics, MINAGRI reports

---

### ROLE 3 — TRANSPORTER

**Platform:** React Native mobile app (offline-capable)  
**What they do:** Accepts transport jobs (Leg 1: cooperative → distributor, Leg 2: distributor → market agent), GPS tracked during trips, IoT temp monitored if refrigerated vehicle.

**Flow to Test:**
1. Login on mobile → Dashboard shows pending transport requests
2. Tap request → see pickup location, destination, cargo type, required date
3. Accept → status changes to accepted, cooperative notified
4. On pickup day: tap "Mark Picked Up" → dispatch record finalized, QR code associated
5. During trip: GPS posts coordinates every 2 minutes; cold chain temp posted continuously (if refrigerated)
6. At destination: tap "Mark Delivered" → triggers distributor receipt notification

**Built:**
- ✅ Mobile dashboard (`DashboardScreen.js`)
- ✅ Pending requests screen (`PendingRequestsScreen.js`)
- ✅ Active trip screen with GPS display (`ActiveTripScreen.js`)
- ✅ Trip history (`TripHistoryScreen.js`)
- ✅ Vehicle profile screen (`ProfileScreen.js`)
- ✅ Backend: `Transporter`, `Vehicle`, `TransportRequest`, `Trip`, `GPSTrack` models
- ✅ IoT vehicle readings model: `VehicleIoTReading` linked to active trip

**Offline capability:**
- Dashboard shows last-synced data with timestamp
- Trip acceptance/delivery confirmation queued to AsyncStorage → synced on reconnect with idempotency key

**Does NOT see:** Cooperative stock data, distributor analytics, other transporters' trips

---

### ROLE 4 — DISTRIBUTOR

**Platform:** Web app  
**What they do:** Buys from cooperatives, manages market agent relationships, creates collection notices, confirms receipt, selects delivery method for market agents.

**Flow to Test:**
1. Login → Dashboard shows active produce requests, pending incoming deliveries, market agent orders pending
2. **Find a Cooperative**: Search cooperative directory filtered by crop, quantity, district, quality, reliability rating
3. **Send Produce Request**: Specify crop, quantity, quality grade, required delivery date
4. **Receipt Confirmation**: When transporter marks delivery → form opens → Distributor enters actual weight received → system auto-calculates Transit Loss Leg 1 (dispatched − received)
5. **Create Collection Notice**: Crop, available quantity, collection deadline, pickup location → visible only to linked market agents
6. **Confirm Market Agent Order**: Review agent's quantity request → Confirm OR Adjust OR Decline → select delivery method: Agent Self-Collection OR Distributor-Arranged Transporter Delivery
7. **Analytics**: View delivery method loss comparison chart per market agent

**Built:**
- ✅ Distributor dashboard (`DistributorDashboard.jsx`)
- ✅ Order management / cooperative search (`OrderManagement.jsx`)
- ✅ Market agent management (`MarketAgents.jsx`)
- ✅ Market agent orders (`MarketAgentOrders.jsx`)
- ✅ Incoming deliveries (`IncomingDeliveries.jsx`)
- ✅ Distribution analytics with loss comparison (`DistributionAnalytics.jsx`)
- ✅ Reports page (`DistributorReports.jsx`)
- ✅ Backend: `Distributor`, `ProduceRequest`, `SupplyAgreement`, `CollectionNotice`, `Order`, `DistributorMarketAgentLink` models
- ✅ Transit loss auto-calculated on receipt confirmation

**Does NOT see:** National analytics, MINAGRI reports, other distributors' data

---

### ROLE 5 — MARKET AGENT

**Platform:** React Native mobile app (offline-capable, intentionally minimal UI)  
**What they do:** Collects produce from distributor, records arrival at stall, submits daily waste report.

**Flow to Test:**
1. Login on mobile → Dashboard: today's stock on hand, this week's waste rate, pending collection notices, Collection Risk Advisory (traffic light)
2. **Collection Notice**: Tap available notice from linked distributor → submit quantity request
3. **Collection Risk Advisory**: Before leaving for self-collection, system shows GREEN/AMBER/RED based on crop type, current time of day, distance. Example: *"HIGH RISK — Tomatoes collected after 10am lose 18% on average. Collect before 9am or request transporter delivery."*
4. **Collection Step 1 (At Distributor)**: Scan batch QR code → quantity collected auto-populated → offline-capable
5. **Collection Step 2 (At Stall)**: Record arrived quantity + select condition-on-arrival code (Heat damage / Physical damage / Pre-existing spoilage / Delay / Other) → system calculates self-transport loss = collected − arrived
6. **Waste Report**: End of day — quantity sold, quantity discarded, discard reason → closes the loss tracking loop for that batch

**Built:**
- ✅ Mobile dashboard (`DashboardScreen.js`)
- ✅ Collection notices (`NoticesScreen.js`)
- ✅ Two-step collection confirmation (`CollectionScreen.js`) with offline queue + idempotency keys
- ✅ Waste report submission (`WasteReportScreen.js`)
- ✅ Personal loss summary (`LossSummaryPage.jsx`)
- ✅ Backend: `MarketAgent`, `CollectionConfirmation`, `WasteReport` models with all 5 condition codes

**Offline capability:** Collection confirmations and waste reports queued locally → submitted with UUID idempotency key on reconnect (prevents duplicates)

**Does NOT see:** Other agents' data, cooperative information, national reports

---

### ROLE 6 — MINAGRI OFFICER

**Platform:** Web app  
**What they do:** Senior government official. Views executive dashboards, reads AI-generated intelligence briefs, downloads pre-built reports. Does NOT manually analyse data — that's done by the AI Insights Engine.

**Flow to Test:**
1. Login → Executive Dashboard: AI Daily Intelligence Brief panel (5–7 auto-generated bullet points), national KPI cards (total volume, loss %, high-risk districts)
2. Rwanda District Heatmap: Each district coloured by loss rate. Click a district → drill-down showing loss %, top loss stage, top loss crop, trend direction vs national average
3. National Loss Overview: Stacked bar chart — loss by stage (storage / transit / self-transport / market). Pie chart by crop type.
4. Seasonal Trends: Year-on-year comparison lines
5. Reports: Download National KPI Summary (PDF, weekly), District Loss Report (PDF, monthly), Crop Loss Report, Cold Chain Compliance, Delivery Method Comparison

**Built:**
- ✅ MINAGRI dashboard (`MinagriDashboard.jsx`) with AI brief panel
- ✅ District performance page (`DistrictPerformancePage.jsx`)
- ✅ Alerts page (`AlertsPage.jsx`) with rule-based threshold triggers
- ✅ Bottleneck detection page (`BottleneckDetectionPage.jsx`)
- ✅ Cold chain compliance page (`ColdChainPage.jsx`)
- ✅ National reports page (`NationalReports.jsx`)
- ✅ Loss prediction page (`LossPredictionPage.jsx`)
- ✅ Backend: `NationalDailyKPI`, `DistrictDailyKPI` pre-computed nightly + live compute endpoints
- ✅ AI insights generated nightly into `DailyBriefBundle` (Celery task: `generate_daily_insights`)
- ✅ Live endpoints: `/api/v1/analytics/minagri/executive/`, `/api/v1/analytics/minagri/districts/`, `/api/v1/analytics/minagri/loss-trend/`, `/api/v1/analytics/minagri/bottlenecks/`

**Does NOT see:** Individual batch records, raw IoT readings, individual user data, system admin tools. Everything is aggregated at national or district level.

---

## 5. Innovations — What We Promised vs. What We Built

| Innovation | Described In Spec | Status |
|---|---|---|
| **AI Insights Engine** — replaces human analyst, generates nightly plain-English briefs | ✅ Required | ✅ **Built** — Celery task `generate_daily_insights` queries analytics DB and fills templates; `DailyBriefBundle` stored and displayed on MINAGRI dashboard |
| **5-stage end-to-end loss tracking** — loss calculated at every handover | ✅ Required | ✅ **Built** — `Batch` model tracks dispatch weight, received weight, collected, arrived at stall, sold, discarded. Loss auto-calculated at each stage |
| **Self-transport loss with condition codes** — 5 structured codes (Heat, Physical, Pre-existing, Delay, Other) | ✅ Required | ✅ **Built** — `CollectionConfirmation` model has `condition_code` field with all 5 options; self_transport_loss = collected − arrived |
| **QR code batch handover anchors** — printed QR scanned at each handover | ✅ Required | ✅ **Built** — `qrcode` library generates codes at dispatch; `QRCodeScanEvent` records every scan with actor, timestamp, location |
| **Dual delivery method comparison analytics** — self-collection vs. transporter per market agent | ✅ Required | ✅ **Built** — `DeliveryMethodComparison` model; distributor analytics page shows chart per agent; MINAGRI sees aggregated national view |
| **Collection Risk Advisory** — traffic light before market agent leaves for self-collection | ✅ Required | ✅ **Built** — Risk score computed from crop type, time of day, distance; GREEN/AMBER/RED shown on mobile with one-line crop-specific recommendation |
| **Cooperative reliability scoring** — 1–5 stars in distributor search directory | ✅ Required | ✅ **Built** — `CooperativeReliabilityHistory` table; score = on-time dispatch 40% + quality consistency 40% + response rate 20%; displayed in directory |
| **Rwanda district heatmap** — Leaflet.js interactive map with admin GeoJSON | ✅ Required | ✅ **Built** — `RwandaSupplyMap.jsx` using Leaflet; MINAGRI dashboard + district performance pages |
| **Offline-capable mobile app** — AsyncStorage queue with idempotency | ✅ Required | ✅ **Built** — `CollectionScreen.js` and `WasteReportScreen.js` queue to AsyncStorage; UUID idempotency keys prevent duplicates on sync |
| **Admin-controlled registration with document verification** — no self-registration | ✅ Required | ✅ **Built** — `AccessRequest` → Admin review → `User` creation → OTP; `DocumentUpload` model for national ID, cooperative cert, driver's licence |
| **Phase 1 / Phase 2 prediction architecture** — rule-based from day 1, ML upgrade post-500 records | ✅ Required | ✅ **Phase 1 built** — crop thresholds configured; ⚠️ Phase 2 ML classifier not trained yet (awaits data accumulation) |
| **IoT cold storage monitoring** — ESP32 + DHT22, HTTP POST or MQTT | ✅ Required | ✅ **Built** — `IoTReading` model; `/api/v1/iot/storage/` endpoint (no auth required for device POST); breach detection on save; paho-mqtt installed |
| **Refrigerated vehicle IoT** — cargo temperature during transit | ✅ Required | ✅ **Built** — `VehicleIoTReading` linked to active Trip; `/api/v1/iot/vehicle/` endpoint |
| **GPS route tracking** — every 2 minutes during active trip | ✅ Required | ✅ **Built** — `GPSTrack` model linked to `Trip`; Expo Location API on mobile |
| **Nightly Celery jobs** — 01:00 aggregation, 01:30 AI insights, weekly KPI refresh | ✅ Required | ✅ **Built** — Celery tasks defined; django-celery-beat schedules configured |
| **PDF + Excel reports (8 report types)** — queued async, stored for download | ✅ Required | ✅ **Built** — `Report` model with QUEUED → GENERATING → READY states; ReportLab + openpyxl; all 8 types implemented |
| **CSV export per role** — streaming download, role-scoped | ✅ Required | ✅ **Built** — `/api/v1/reports/export/` with role-aware handlers for every role |
| **OpenAPI/Swagger documentation** — auto-generated | ✅ Required | ✅ **Built** — drf-spectacular; available at `/api/docs/` and `/api/redoc/` |
| **LLM integration (Claude/GPT) for richer AI briefs** | Future work Phase 2 | ❌ Not implemented (as expected — Phase 2) |
| **Scikit-learn Random Forest Classifier** | Future work Phase 2 (post 500 records) | ❌ Not trained yet (as expected — awaiting data) |
| **WhatsApp / SMS push notifications** | Future work Phase 2 | ❌ Not implemented (in-app notifications only) |

---

## 6. Data Flow — End to End for One Batch

```
1. Distributor sends Produce Request
        ↓
2. Cooperative Manager accepts → SupplyAgreement created (Batch anchor)
        ↓
3. Cooperative searches Transporter directory → sends TransportRequest
        ↓
4. Transporter accepts → confirms pickup → dispatch_weight, quality_grade, QR code locked in
        ↓
5. GPS posts coordinates every 2 minutes from Transporter mobile
   (If refrigerated: VehicleIoTReading temperature posts continuously)
        ↓
6. Transporter marks delivery complete → Distributor notified
        ↓
7. Distributor scans QR → confirms weight_received, quality_grade
   System calculates: transit_loss_leg1 = dispatch_weight − weight_received
        ↓
8. Distributor creates Collection Notice → linked Market Agents can see it
        ↓
9. Market Agent submits quantity request → Distributor confirms + selects delivery method
        ↓
   If SELF-COLLECTION:
     9a. Collection Risk Advisory shown (GREEN/AMBER/RED)
     9b. Agent scans QR at distributor → records quantity_collected (Step 1, offline-capable)
     9c. Agent arrives at stall → records quantity_arrived + condition_code (Step 2)
         System calculates: self_transport_loss = quantity_collected − quantity_arrived
   
   If DISTRIBUTOR-ARRANGED DELIVERY:
     9a. Distributor selects transporter from directory (Leg 2)
     9b. Transporter delivers to market stall → Agent confirms quantity received
        ↓
10. End of market day: Agent submits Waste Report
    Fields: quantity_sold, quantity_discarded, discard_reason
    System calculates: market_loss = quantity_discarded
        ↓
11. Total end-to-end loss = transit_loss + self_transport_loss + market_loss
        ↓
12. Nightly Celery job (01:00): Aggregates into NationalDailyKPI + DistrictDailyKPI
    Nightly Celery job (01:30): AI Insights Engine generates DailyBriefBundle
        ↓
13. MINAGRI Officer sees the brief next morning on their dashboard
```

---

## 7. Things That Could Trip You Up in the Demo

### ⚠️ Areas to Navigate Carefully

1. **Frontend is wired up but some pages are thin on data** — If a page shows empty tables, say: *"In the live system this would pull from the database; we have all the backend API data ready."* Then switch to the API docs at `/api/docs/` to show the real endpoint response.

2. **Phase 2 ML model is not trained** — If asked, be upfront: *"Phase 2 triggers after 500+ batch records accumulate. The framework and scikit-learn integration are in place. Phase 1 rule-based scoring is fully operational from Day 1."*

3. **SMS OTP is prototype mode** — OTP is sent via email in the prototype; production would use MTN Rwanda or Airtel Rwanda SMS API. Say: *"In the prototype we send via email; the SMS integration is listed as Phase 2 deployment work."*

4. **IoT hardware is simulated** — The ESP32 + DHT22 integration is built and the Django management command can simulate sensor readings. Physical hardware is not deployed; say: *"The API accepts real sensor data; for the prototype we use a Django management command to simulate realistic IoT readings as specified in the requirements."*

5. **Celery requires Redis running** — For the demo, Redis must be running locally before you start Celery workers. Verify: `redis-cli ping` returns `PONG`.

6. **No payment processing** — Explicitly out of scope. If asked: *"Payment processing is explicitly out of scope; supply agreements are recorded as traceability anchors only."*

---

## 8. Questions the Panel Will Likely Ask

### Architecture & Design

**Q: Why Django instead of Node.js/FastAPI?**  
A: Django ORM + Django REST Framework give us secure role-based access control out of the box. Django Celery integration for background jobs is mature. Django admin is useful for system administrator functions. For a data-heavy system with 14 models and complex relationships, Django's ORM is a better fit than raw SQL or a lightweight framework.

**Q: Why PostgreSQL and not MySQL?**  
A: PostgreSQL has better support for JSON fields (used for storing GPS polylines), native support for `pgcrypto` (used to encrypt sensitive fields like phone numbers), and better JSONB indexing for analytics queries.

**Q: How do you handle offline data from market agents?**  
A: React Native `AsyncStorage` queues form submissions locally when there's no internet. Each submission has a UUID idempotency key. When the device reconnects, it syncs the queue to the API. The server discards duplicate submissions with the same idempotency key — so even if the same form is submitted twice from a retry, only one record is created.

**Q: How do you prevent one role from seeing another role's data?**  
A: Every API endpoint applies role-based queryset filtering. For example, a Cooperative Manager's stock query always adds `.filter(cooperative=request.user.cooperative_manager.cooperative)`. This is enforced in every ViewSet, not just at the URL level. We also have permission classes (`IsCooperativeManager`, `IsDistributor`, etc.) that reject requests from the wrong role entirely.

### AI / ML

**Q: Is the AI Insights Engine actually AI?**  
A: It is automated analytical intelligence — it queries the database, applies business rules and comparative analysis, and generates plain-English summaries using structured templates. This is called Natural Language Generation (NLG). The term "AI" in the spec refers to this automated intelligence pipeline that replaces the need for a human analyst. Phase 2 would augment this with an LLM API for richer, more nuanced language. For a government system, template-based NLG is actually preferable: the output is deterministic, auditable, and does not hallucinate.

**Q: What kind of machine learning do you use?**  
A: Phase 1 uses rule-based scoring with pre-loaded crop loss thresholds from FAO East Africa datasets. Phase 2 uses scikit-learn `LinearRegression` for loss trend prediction (already integrated in the MINAGRI loss trend endpoint) and is designed to upgrade to a `RandomForestClassifier` once 500+ completed batch records are available. No pre-trained external model is used — the prediction model will train on the system's own Rwanda-specific supply chain data.

**Q: How accurate is the loss prediction?**  
A: Phase 1 is not a statistical model — it applies known crop science thresholds (tomatoes spoil above 28°C or after 4 hours without refrigeration). Accuracy depends on how well these FAO benchmarks reflect Rwandan conditions. The spec targets 75–85% accuracy for the Phase 2 ML model once trained on local data.

### Business / Domain

**Q: What problem does this solve that didn't exist before?**  
A: Rwanda has no existing system that tracks agricultural produce loss across all five handover points from cooperative dispatch to market stall. Post-harvest losses in sub-Saharan Africa average 25–40%. This system: (1) makes losses visible and attributable at each stage, (2) gives market agents real-time risk scores before they make high-risk trips, (3) automatically tells MINAGRI which districts and crops need intervention — without requiring a dedicated human analyst to read through the data every day.

**Q: What happens if the internet goes down in a rural area during a delivery?**  
A: The transporter and market agent mobile apps cache the last-synced data. Key actions (delivery confirmation, collection confirmation, waste report) are stored locally in AsyncStorage and submitted when connectivity is restored. The system uses UUID idempotency keys to prevent any duplicate records from retry submissions.

**Q: Why not just use Excel/Google Sheets?**  
A: Excel cannot track real-time GPS or IoT sensor data. Excel has no role-based access control — any user could see all data. Excel cannot generate automated AI briefs or send threshold alerts. Excel cannot enforce data validation across 5 handover points across hundreds of batches simultaneously. This system provides end-to-end accountability and automation that spreadsheets cannot deliver.

**Q: Is the cooperative reliability score fair?**  
A: It is weighted on measurable performance indicators: on-time dispatch rate (40%), quality consistency rate (40%), and produce request response rate (20%). These are objective metrics derived from records both the cooperative and distributor submit independently. The score is calculated weekly and displayed as 1–5 stars in the distributor search directory.

---

## 9. API Documentation

All backend endpoints are auto-documented and accessible:
- **Swagger UI:** `http://localhost:8000/api/docs/`
- **ReDoc:** `http://localhost:8000/api/redoc/`
- **OpenAPI Schema:** `http://localhost:8000/api/schema/`

Key endpoint groups:
```
/api/v1/auth/              — Login, OTP, user management, access requests
/api/v1/cooperatives/      — Cooperative profiles, stock, cold storage
/api/v1/distribution/      — Produce requests, orders, collection notices
/api/v1/transport/         — Transport requests, trips, GPS
/api/v1/market-agents/     — Collection confirmations, waste reports
/api/v1/traceability/      — Batch records, QR scan events
/api/v1/predictions/       — Loss risk scores (Phase 1 + Phase 2)
/api/v1/analytics/         — KPIs, delivery comparisons, district data
/api/v1/analytics/minagri/ — Live MINAGRI executive dashboards
/api/v1/ai-insights/       — Daily intelligence briefs
/api/v1/iot/               — Cold storage + vehicle sensor readings
/api/v1/reports/           — PDF/Excel report queue + CSV export
/api/v1/notifications/     — In-app notification management
```

---

## 10. Summary — What's Real, What's Framework

| Component | Status | Notes |
|---|---|---|
| Backend API (80+ endpoints) | ✅ Fully built | 14 apps, all models, all views, JWT auth |
| Role-based access control | ✅ Fully built | Enforced at model query level |
| Loss calculation engine | ✅ Fully built | Auto-calculated at every handover |
| Phase 1 rule-based prediction | ✅ Fully built | Crop thresholds from FAO/RAB benchmarks |
| IoT sensor ingestion | ✅ Fully built | HTTP POST + MQTT; cold storage + vehicle |
| GPS tracking | ✅ Fully built | GPSTrack model; Expo Location API on mobile |
| QR code generation | ✅ Fully built | `qrcode` library at cooperative dispatch |
| Nightly Celery analytics jobs | ✅ Fully built | NationalDailyKPI, DistrictDailyKPI, CooperativeReliabilityHistory |
| AI Insights Engine | ✅ Fully built | Celery task; `DailyBriefBundle` stored |
| PDF + Excel reports (8 types) | ✅ Fully built | ReportLab + openpyxl, queued async |
| CSV streaming export | ✅ Fully built | Role-aware, live query |
| OpenAPI documentation | ✅ Fully built | Available at `/api/docs/` |
| Web frontend (all 6 roles) | ✅ Pages built | UI structure complete; routing configured |
| Mobile app (transporter + agent) | ✅ Screens built | Core screens + offline queue framework |
| Phase 2 ML Random Forest | ⚠️ Framework ready | Awaits 500+ batch records (as per spec) |
| LLM API for richer AI briefs | ❌ Phase 2 future work | Template NLG operational |
| SMS OTP delivery | ❌ Phase 2 future work | Email OTP in prototype |
| Real ESP32 hardware | ❌ Simulated in prototype | API endpoint fully ready for real devices |

---

*Last updated: June 2026 | ChainSight v2.0 | AUCA Final Year Project*
