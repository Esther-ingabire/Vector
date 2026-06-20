# ChainSight — Step-by-Step Screenshot Guide (Figures 10–19)

Companion to `DEMO_ROLES_GUIDE.md` (credentials) and the earlier audit of which figures match the real UI. All 10 figures now have a real, matching screen — Figures 16, 17, and 18 were built during this session (risk badge, AI Daily Intelligence Brief, role dropdown in approvals).

## 0. Setup (do this once)

1. **Seed the data** so every screen has something to show:
   ```bash
   cd backend
   python manage.py seed_demo_data --reset
   ```
2. **Start both servers**, each in its own terminal:
   ```bash
   cd backend && python manage.py runserver
   cd frontend && npm run dev
   ```
3. Open `http://localhost:5173` in Chrome/Edge.
4. **Get a clean browser window before you start shooting:**
   - Resize to a fixed size so all your figures look consistent — e.g. open DevTools (F12) → toggle device toolbar (Ctrl+Shift+M) → set a custom resolution like 1440×900, or just maximize a normal window and don't resize between shots.
   - Use **Windows + Shift + S** (Snipping Tool region capture) for each shot — faster than full-page screenshot extensions and lets you crop tightly to the card/modal you want.
   - Dismiss the green "✓ success" toast notifications before shooting (they auto-dismiss after ~4s, or click them away) — they cover the top-right corner in several figures.
   - Log out between roles (sidebar → **Sign out**) rather than just navigating — some pages cache the previous role's sidebar briefly otherwise.

All passwords: **`Demo1234!`**. Log in with the **email**, not a username (the field is labeled "Phone number or username" but only email/phone actually work).

---

## Figure 10 — Login Page
- Go to `http://localhost:5173/login`. Don't log in.
- Shows: combined "Phone number or username" field, password field (with show/hide eye icon), green "Sign in" button.
- If your caption says "email field" — either relabel it in your write-up to match the real field, or just leave the field empty/with a placeholder (it'll still read fine in the screenshot since the placeholder text is the phone format).

## Figure 11 — Cooperative Manager Dashboard
- Log in as `j.habimana@chainsight.demo`. Lands on `/cooperative`.
- Real KPI cards are: **Stock Available, Produce Requests, Batches in Transit, Storage Status** (not "Active Batches / Dispatched / Pending Receipts / Risk Alerts" — update your caption to match, or tell me and I'll rename them).
- Below the cards: "Incoming Produce Requests" + "Storage Conditions" panels, then an "Active Shipments" table.

## Figure 12 — Batch Creation and Dispatch Form
- Same login. Go to **Produce Requests** (`/cooperative/produce-requests`) → **Accepted** tab → click **Dispatch** on any row.
- Modal title is `Dispatch — {crop}`. Fields shown: **Dispatch weight (kg)**, **Quality grade** (dropdown), **Share a trip** (dropdown, optional). There's no separate "Crop Type / Village / District" field — crop comes from the request, district isn't entered per-batch.
- Fill in a weight, leave grade as-is, screenshot before clicking submit.

## Figure 13 — QR Code Generation and Batch Label ✅ just fixed
- Continue from Figure 12: click **Dispatch Batch**.
- A "Batch Dispatched" modal now appears automatically with the real QR code, **Batch Code**, **Crop Type**, **Grade**, and **Origin District** — screenshot this directly, no extra steps needed.

## Figure 14 — Distributor Receipt Confirmation
- Log out, log in as `s.nkurunziza@chainsight.demo` (or `e.ingabire@chainsight.demo`).
- Go to **Incoming Deliveries** (`/distributor/deliveries`) → click **Confirm Receipt** on an "In Transit" row.
- Modal shows: expected quantity, **Received quantity (kg)**, **Quality grade received**, notes.
- ⚠️ Caption note: there's no camera/QR-scan step — it's a manual form, batch chosen by clicking the table row. If you want an actual "scan to confirm" flow, that's a separate feature I'd need to build (the `html5-qrcode` package is installed but unused).

## Figure 15 — Loss Recording at Collection Point
- Same modal as Figure 14 — it's not a separate screen. To get the loss-detected state for your screenshot: type a **Received quantity** noticeably lower than the expected quantity shown at the top of the modal. A yellow "Loss detected: X kg (Y%)" banner and a **Loss reason** dropdown will appear below it — screenshot that state.

## Figure 16 — Phase 1 Risk Assessment Score View ✅ now real
- Log in as a Cooperative Manager → **Traceability** → click any **Completed** batch with loss recorded.
- A risk badge (LOW/MEDIUM/HIGH, with the loss % in parentheses) now shows next to the status pill in the batch detail header — computed live from `total_loss_pct` (≥10% = HIGH, 5–10% = MEDIUM, <5% = LOW, matching the same threshold already used on the MINAGRI dashboard's "High-Risk Districts" card).

## Figure 17 — AI Insights Brief (MINAGRI Advisory View) ✅ now real
- Log in as `c.nzeyimana@minagri.demo`. The **AI Daily Intelligence Brief** panel now appears at the top of the dashboard (above the KPI cards) — real narrative insights computed from actual seeded batch data (national loss summary, stage breakdown), plus a separate **Route Alerts** panel on the right showing any district that crossed the loss threshold, with a critical/red styling when severe.
- This pulls from a real backend endpoint (`/ai-insights/daily-brief/latest/`) that was already implemented but never wired to any frontend page — and from genuinely computed seed data (district aggregates, stage totals), not hardcoded text.

## Figure 18 — Administrator User Management Panel ✅ now real
- Log in as `admin@chainsight.demo` → **Registration Queue** (now has 3 seeded pending requests) → click any request.
- The detail view now has a **Role** dropdown (pre-filled with the requested role, editable) right alongside **Approve & Create Account** / **Reject** — one screen with both, matching the figure description.

## Figure 19 — MINAGRI Officer Dashboard
- Log in as `c.nzeyimana@minagri.demo`. Lands on `/minagri`.
- Real KPI cards: **National Loss Rate, Total Volume Tracked, High-Risk Districts, Cold Chain Compliance** (not "Total Batches / Total Loss / High-Risk Batches / Pending Briefs" — update caption to match).
- Below: loss-trend line chart, district loss heatmap, top-loss-crops bar chart. No "advisory inbox" exists (see Figure 17).

---

## Quick reference — who to log in as

| Role | Email | Lands on |
|---|---|---|
| Admin | `admin@chainsight.demo` | `/admin` |
| Cooperative Manager | `j.habimana@chainsight.demo` | `/cooperative` |
| Distributor | `s.nkurunziza@chainsight.demo` | `/distributor` |
| MINAGRI Officer | `c.nzeyimana@minagri.demo` | `/minagri` |

Full list (all 7 roles) is in `DEMO_ROLES_GUIDE.md`.
