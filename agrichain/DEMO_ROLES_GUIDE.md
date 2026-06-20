# ChainSight — Role Exploration & Demo Credentials Guide

How to seed demo data, log in as each of the 7 roles, and what to click through in each portal. Companion to `PRESENTATION_GUIDE.md` (which doesn't yet cover the Warehouse Manager role — that gap is filled here).

## 1. Seed the demo data

```bash
cd backend
python manage.py seed_demo_data          # first time
python manage.py seed_demo_data --reset  # wipe and re-seed (safe to re-run)
```

This creates 4 cooperatives, 2 transporters, 2 distributors, 3 market agents, 1 MINAGRI officer, 1 admin, 1 warehouse manager, 6 months of batches/trips/orders/waste reports, and pending requests for every role to act on.

## 2. ⚠️ How login actually works — read this first

The frontend login form is labelled "Phone number or username", but the backend (`LoginSerializer` in `backend/apps/authentication/serializers.py`) only matches against **`email`** or **`phone_number`** — it never checks `username`. Logging in with a seeded username like `coop.musanze` or `demo.admin` will fail with "No account found."

**Always log in with the email address.** All demo accounts share the password below.

- URL: `http://localhost:5173/login` (Vite default)
- Password for every demo account: **`Demo1234!`**

## 3. Credentials — all 7 roles

| #     | Role                                       | Login email                      | Web entry route                                |
| ----- | ------------------------------------------ | -------------------------------- | ---------------------------------------------- |
| 1     | System Administrator                       | `admin@chainsight.demo`          | `/admin`                                       |
| 2     | Cooperative Manager (Musanze)              | `j.habimana@chainsight.demo`     | `/cooperative`                                 |
| 2     | Cooperative Manager (Rubavu)               | `i.mukamana@chainsight.demo`     | `/cooperative`                                 |
| 2     | Cooperative Manager (Nyanza)               | `mc.uwimana@chainsight.demo`     | `/cooperative`                                 |
| 2     | Cooperative Manager (Kigali)               | `p.habimana@chainsight.demo`     | `/cooperative`                                 |
| 3     | Transporter (Kalinda Transport Co.)        | `a.kalinda@chainsight.demo`      | `/transporter` (mobile-primary, web fallback)  |
| 3     | Transporter (Gasana Logistics)             | `e.gasana@chainsight.demo`       | `/transporter`                                 |
| 4     | Distributor (Kigali Fresh)                 | `s.nkurunziza@chainsight.demo`   | `/distributor`                                 |
| 4     | Distributor (Northern Rwanda)              | `e.ingabire@chainsight.demo`     | `/distributor`                                 |
| 5     | Market Agent (Kimironko)                   | `g.uwera@chainsight.demo`        | `/market-agent` (mobile-primary, web fallback) |
| 5     | Market Agent (Nyabugogo)                   | `e.nshimiyimana@chainsight.demo` | `/market-agent`                                |
| 5     | Market Agent (Remera)                      | `d.mukankusi@chainsight.demo`    | `/market-agent`                                |
| 6     | MINAGRI Officer                            | `c.nzeyimana@minagri.demo`       | `/minagri`                                     |
| **7** | **Warehouse Manager** _(newly added role)_ | `b.mugisha@chainsight.demo`      | `/warehouse`                                   |

## 4. The newly added role: Warehouse Manager

`WAREHOUSE_MANAGER` was added to `User.Role` after the original 6-role design (see `backend/apps/cooperatives/models.py` — `WarehouseManager`, `ColdStorageFacility.warehouse_manager`, `WarehouseRentalRequest`). It models an **independent cold-storage operator** that cooperatives without their own storage can rent space from — distinct from a cooperative's own `ColdStorageFacility` records.

**Until this session, no demo account existed for it** — `seed_demo_data.py` never created one. I added `_seed_warehouse_manager()`, which now creates:

- User `b.mugisha@chainsight.demo` (Bosco Mugisha, Mugisha Cold Chain Ltd)
- One listed facility: **Gikondo Cold Hub**, 1200kg capacity, IoT-enabled, RWF 180,000/month, available for rent
- One pending rental request from the **Nyanza Agricultural Cooperative** for 250kg of overflow space

What to explore as this role:

- `/warehouse` → **Dashboard** — facility count, currently-rented count, pending-requests banner
- `/warehouse/facilities` → **My Facilities** — add/edit a facility, toggle "listed for rent," add GPS + IoT sensor info
- `/warehouse/rentals` → **Rental Requests** — accept/decline the pending Nyanza request (accepting sets `facility.cooperative`, which then makes the facility show up under that cooperative's IoT/analytics scope automatically)

To see the other side of this flow, log in as a **Cooperative Manager** and go to **Rent Warehouse** (`RentWarehouse.jsx`) to browse listed facilities and request space — that's how the Nyanza request got created.

## 5. Role-by-role: what to click through

### System Administrator — `admin@chainsight.demo`

- **Registration Queue** — approve/reject pending access requests from cooperatives, distributors, market agents, transporters
- **User Management** — directly create internal roles (Admin, MINAGRI Officer)
- **Audit Log**, **Data Integration Monitor**, **System Announcements**, **Feedback Inbox**

### Cooperative Manager — e.g. `j.habimana@chainsight.demo` (Musanze)

- **Dashboard**, **Active Batches**, **Stock Management**
- **Transport Requests** — request a transporter for a leg-1 pickup
- **Produce Requests** — respond to distributor requests for crops
- **Storage Analytics**, **Delivery Confirmations**, **Traceability View**
- **Rent Warehouse** — browse/request space from independent warehouse managers (see §4)

### Transporter — e.g. `a.kalinda@chainsight.demo`

- **Pending Requests** → accept a cooperative's transport request
- **Active Trip** → confirm pickup/delivery, log GPS/temperature if refrigerated
- **Trip History**, **Vehicle Profile**
- Primarily used via the **mobile app** (`mobile/src/screens/transporter/`); web fallback covers the same flows

### Distributor — e.g. `s.nkurunziza@chainsight.demo`

- **Dashboard**, **Incoming Deliveries** — receive batches from cooperatives, record weight/quality on arrival
- **Order Management**, **Market Agent Orders**, **Market Agents** (link/unlink agents to your network)
- **Delivery Tracking**, **Distribution Analytics**, **Market Prices**, **Reports**

### Market Agent — e.g. `g.uwera@chainsight.demo`

- **Dashboard**, **Notices** — collection notices from distributors
- **Batch Receiving**, **Orders**, **Find Distributors**
- **Waste Report** — log unsold/discarded quantity at end of selling period
- **Claims**, **Loss Summary**, **Price Recording**, **Agent Reports**
- Primarily used via the **mobile app** (`mobile/src/screens/market_agent/`); web fallback exists

### MINAGRI Officer — `c.nzeyimana@minagri.demo`

- **Executive Dashboard** — AI Daily Intelligence Brief, national KPIs, high-risk districts
- **National Reports**, **District Performance**, **Custom Reports**
- **Loss Prediction**, **Bottleneck Detection**, **Cold Chain**, **Traceability**, **Market Analytics**, **Alerts**

### Warehouse Manager — `b.mugisha@chainsight.demo`

- See §4 above.

## 6. Other gotchas fixed while building this guide

- `seed_demo_data --reset` previously crashed with `ProtectedError` on `SupplyAgreement` (the model was imported in `_reset()` but never deleted before its protected FK target `ProduceRequest`). Fixed by deleting `SupplyAgreement` rows first.
- The printed credentials table previously listed a username (`Username` column) that doesn't work for login, and had one row (Musanze) accidentally showing an email instead of its username. The table now prints the correct login **email** for every role.
