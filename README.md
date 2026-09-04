<p align="center">
  <img src="https://img.shields.io/badge/Razorpay-Buildathon-02042B?style=for-the-badge&logo=razorpay&logoColor=white" />
  <img src="https://img.shields.io/badge/AI_Powered-Gemini_2.5-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Status-Production_Ready-00C853?style=for-the-badge" />
</p>

<h1 align="center">🛡️ Nolan — AI-Powered Payment Recovery Engine</h1>

<p align="center">
  <b>Autonomous failed payment recovery system for Razorpay merchants.</b><br/>
  Powered by Google Gemini 2.5 Flash · Built on Razorpay APIs · Real-time webhook-driven pipeline.
</p>

<p align="center">
  <a href="#-architecture">Architecture</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-dashboard">Dashboard</a>
</p>

---

## 🎯 Problem Statement

**Every year, merchants lose 5-15% of their revenue to failed payments.** Card expirations, insufficient funds, bank declines, and network errors silently drain revenue. Most merchants either ignore these failures entirely or handle them with manual, one-size-fits-all retry logic that often makes things worse.

**Nolan solves this by deploying an autonomous AI agent that:**
1. **Detects** failed payments in real-time via Razorpay webhooks
2. **Diagnoses** each failure using Google Gemini 2.5 Flash with full customer context
3. **Decides** the optimal recovery strategy (retry, remind, update payment method, escalate)
4. **Enforces** merchant-defined safety policies before any action executes
5. **Executes** the recovery action through Razorpay APIs
6. **Tracks** every step in an immutable audit trail

> **Result:** Automated, intelligent, policy-controlled payment recovery — turning silent revenue loss into recovered revenue.

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAZORPAY PLATFORM                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Payment API  │  │  Retry API   │  │ Payment Link │  │  Webhook API │    │
│  └──────┬───────┘  └──────▲───────┘  └──────▲───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          │           ┌─────┴─────────────────┴─────┐          │
          │           │    RECOVERY EXECUTOR         │          │
          │           │    (Razorpay API Calls)      │          │
          │           └─────────────▲────────────────┘          │
          │                        │                            │
┌─────────▼────────────────────────┼────────────────────────────▼────────────┐
│                         NOLAN BACKEND (Express.js)                         │
│                                                                            │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │  WEBHOOK         │    │  RECOVERY         │    │  METRICS            │    │
│  │  PROCESSOR       │───▶│  ORCHESTRATOR     │    │  SERVICE            │    │
│  │                  │    │                   │    │                     │    │
│  │  • Validate      │    │  • Create Case    │    │  • Revenue at Risk  │    │
│  │  • Normalize     │    │  • AI Analysis    │    │  • Recovery Rate    │    │
│  │  • Idempotency   │    │  • Policy Check   │    │  • Trend Analysis   │    │
│  └─────────────────┘    │  • Execute Action  │    │  • Failure Reasons  │    │
│                          └────────┬─────────┘    └─────────────────────┘    │
│                                   │                                         │
│                    ┌──────────────┼──────────────┐                          │
│                    ▼              ▼              ▼                          │
│            ┌──────────────┐ ┌──────────┐ ┌──────────────┐                  │
│            │  AI AGENT    │ │  POLICY  │ │  AUDIT       │                  │
│            │  (Gemini 2.5)│ │  ENGINE  │ │  TRAIL       │                  │
│            │              │ │          │ │              │                  │
│            │ • Diagnosis  │ │ • Rules  │ │ • Immutable  │                  │
│            │ • Probability│ │ • Limits │ │ • Traceable  │                  │
│            │ • Strategy   │ │ • Safety │ │ • Compliant  │                  │
│            └──────────────┘ └──────────┘ └──────────────┘                  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL Database                              │  │
│  │  merchants │ customers │ payments │ recovery_cases │ agent_decisions │  │
│  │  policy_decisions │ recovery_actions │ audit_events │ webhook_events │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      NOLAN FRONTEND (Next.js 16)                           │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard    │  │  Recovery    │  │  AI Decision │  │  Audit       │  │
│  │  Overview     │  │  Cases       │  │  Logs        │  │  Trail       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │  Payments    │  │  Recovery    │  │  Razorpay    │                    │
│  │  Table       │  │  Actions     │  │  Integration │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Recovery Pipeline Flow

```
 PAYMENT.FAILED                    AI AGENT                     POLICY ENGINE
 (Razorpay Webhook)               (Gemini 2.5 Flash)           (Rule-Based)
       │                                │                            │
       ▼                                │                            │
 ┌───────────┐                          │                            │
 │ Webhook   │    Normalize &           │                            │
 │ Received  │    Validate              │                            │
 └─────┬─────┘                          │                            │
       │                                │                            │
       ▼                                │                            │
 ┌───────────┐                          │                            │
 │ Customer  │    Find/Create           │                            │
 │ Lookup    │    Customer              │                            │
 └─────┬─────┘                          │                            │
       │                                │                            │
       ▼                                │                            │
 ┌───────────┐                          │                            │
 │ Recovery  │    Create Case           │                            │
 │ Case      │    (Idempotent)          │                            │
 └─────┬─────┘                          │                            │
       │                                │                            │
       ▼                                ▼                            │
 ┌───────────┐    Payment +      ┌───────────┐                      │
 │ ANALYZING │───▶Customer ────▶│ AI Agent  │                      │
 │           │    Context        │ Analysis  │                      │
 └───────────┘                   └─────┬─────┘                      │
                                       │                            │
                                       │  Structured                │
                                       │  Recommendation            ▼
                                       │                     ┌───────────┐
                                       └────────────────────▶│ Policy    │
                                                             │ Evaluate  │
                                                             └─────┬─────┘
                                                                   │
                                                    ┌──────────────┼──────────────┐
                                                    │              │              │
                                                    ▼              ▼              ▼
                                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                                              │ ALLOWED  │  │ APPROVAL │  │ REJECTED │
                                              │          │  │ REQUIRED │  │          │
                                              └────┬─────┘  └────┬─────┘  └────┬─────┘
                                                   │              │              │
                                                   ▼              ▼              ▼
                                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                                              │ EXECUTE  │  │ ESCALATE │  │ CASE     │
                                              │ ACTION   │  │ TO HUMAN │  │ STOPPED  │
                                              └────┬─────┘  └──────────┘  └──────────┘
                                                   │
                                              ┌────┴────┐
                                              ▼         ▼
                                        ┌──────────┐ ┌──────────┐
                                        │ SUCCESS  │ │ FAILED   │
                                        │RECOVERED │ │          │
                                        └──────────┘ └──────────┘
```

---

## ⚙️ How It Works

### 1. Webhook Ingestion (`WebhookProcessorService`)

When a payment fails on Razorpay, a `payment.failed` webhook is sent to Nolan. The **Webhook Processor** validates the payload, identifies the merchant by `account_id`, creates/finds the customer record, and triggers the recovery pipeline. It handles `payment.captured` webhooks too — automatically closing recovery cases when payments succeed.

**Key feature:** Atomic claim-based idempotency. If two identical webhooks arrive simultaneously, only one gets processed.

### 2. AI-Powered Diagnosis (`AiAgentService`)

Google **Gemini 2.5 Flash** receives the full context:
- Payment amount, currency, failure reason from Razorpay
- Customer lifetime value, payment history (success/fail ratio)
- Current attempt count

It returns a **structured JSON response** (enforced via Gemini's `responseSchema`):

| Field | Description |
|-------|-------------|
| `diagnosis` | Detailed root cause analysis |
| `recovery_probability` | 0.0–1.0 likelihood of recovery |
| `recommended_action` | One of 7 allowed actions |
| `recommended_delay` | Minutes to wait before execution |
| `confidence` | AI confidence score |
| `reasoning` | Explanation of strategy choice |

**Allowed Actions:**
`RETRY_PAYMENT` · `REQUEST_PAYMENT_METHOD_UPDATE` · `SEND_CHECKOUT_RECOVERY` · `RETRY_SUBSCRIPTION` · `SEND_PAYMENT_REMINDER` · `ESCALATE_HUMAN` · `STOP_RECOVERY`

### 3. Policy Engine (`PolicyDecisionService`)

The AI is **not** the final authority. Every recommendation passes through a deterministic **Policy Engine** that enforces merchant-defined business rules:

| Rule | Condition | Result |
|------|-----------|--------|
| `max_retry_limit_deny` | `attempt_count >= 3` | ❌ Blocked |
| `terminal_state_deny` | Case is RECOVERED/STOPPED | ❌ Blocked |
| `low_confidence_deny` | AI `confidence < 0.50` | ❌ Blocked |
| `human_escalation_review` | Action is `ESCALATE_HUMAN` | ⚠️ Requires Approval |
| `default_allow` | All checks pass | ✅ Allowed |

This ensures **no runaway AI behavior** — the system is safe by design.

### 4. Recovery Execution (`RecoveryExecutorService`)

Once policy-approved, the executor triggers the appropriate Razorpay API:

| Action | Razorpay API Used |
|--------|-------------------|
| `RETRY_PAYMENT` | Payment retry via Razorpay Payment Links |
| `REQUEST_PAYMENT_METHOD_UPDATE` | Generates new checkout recovery link |
| `SEND_CHECKOUT_RECOVERY` | Creates Razorpay Payment Link |
| `SEND_PAYMENT_REMINDER` | Payment reminder notification |
| `RETRY_SUBSCRIPTION` | Subscription retry logic |
| `ESCALATE_HUMAN` | Flags for manual review |

### 5. Closed-Loop Recovery (`PaymentRecoveryService`)

When a `payment.captured` webhook arrives (customer paid!), Nolan atomically:
- Updates the payment status to `CAPTURED`
- Marks the recovery case as `RECOVERED`
- Updates the recovery action to `SUCCESS`
- Logs a `PAYMENT_RECOVERED` audit event

All within a **single database transaction** for consistency.

### 6. Complete Audit Trail (`AuditEventService`)

Every single step is logged as an immutable audit event:

```
PAYMENT_FAILED → REVENUE_RISK_DETECTED → AI_ANALYSIS_COMPLETED →
POLICY_EVALUATED → ACTION_APPROVED → RECOVERY_ACTION_DEPLOYED →
PAYMENT_RECOVERED
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express 5** | API server & webhook handler |
| **TypeScript 7** | Type-safe codebase |
| **PostgreSQL** | Relational database (9 tables) |
| **Google Gemini 2.5 Flash** | AI agent for failure analysis |
| **Zod 4** | Runtime schema validation for AI responses |
| **Razorpay APIs** | Payment retry, links, webhooks |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **Tailwind CSS 4** | Utility-first styling |
| **Recharts** | Data visualization (area charts) |
| **TypeScript 5** | Type-safe components |

---

## 📊 Database Schema

Nine normalized tables with proper foreign key relationships and cascading deletes:

```
merchants (user_id PK)
    │
    ├── customers (id PK, merchant_id FK)
    │       │
    │       └── payments (id PK, customer_id FK, merchant_id FK)
    │               │
    │               └── recovery_cases (id PK, payment_id FK, merchant_id FK)
    │                       │
    │                       ├── agent_decisions (id PK, recovery_case_id FK)
    │                       │       │
    │                       │       └── policy_decisions (id PK, agent_decision_id FK)
    │                       │               │
    │                       │               └── recovery_actions (id PK, policy_decision_id FK)
    │                       │
    │                       └── audit_events (id PK, recovery_case_id FK, merchant_id FK)
    │
    └── webhook_events (id PK, merchant_id FK)
```

### Recovery Case State Machine

```
OPEN → ANALYZING → ACTION_PENDING → IN_PROGRESS → RECOVERED ✅
                                   ↘ ESCALATED  ⚠️
                                   ↘ STOPPED    ❌
                                   ↘ UNRECOVERABLE ❌
```

---

## 📈 Dashboard

The real-time merchant dashboard provides a single-screen operational overview:

### Dashboard Components

| Component | Description |
|-----------|-------------|
| **KPI Cards** | Revenue at Risk, Recovered Revenue, Recovery Rate, Failed Payments |
| **Recovery Pipeline** | Visual funnel: Failed → Policy → AI → Action → Recovered |
| **Revenue Trend Chart** | 7/30 day recovery trend with gradient area chart |
| **AI Performance** | Total decisions, average confidence score |
| **Policy Engine Stats** | Evaluations, allowed, rejected, approval required counts |
| **Failure Distribution** | Breakdown by failure reason with progress bars |
| **Recent Actions Table** | Latest recovery actions with status indicators |
| **Audit Trail Preview** | Real-time event log |

### Dashboard Pages

| Route | Page |
|-------|------|
| `/dashboard` | Overview (single-screen KPIs + charts) |
| `/dashboard/payments` | All payments with status filtering |
| `/dashboard/recovery-cases` | Active recovery cases |
| `/dashboard/recovery-cases/[id]` | Individual case deep-dive |
| `/dashboard/ai-decisions` | AI agent decision history |
| `/dashboard/recovery-actions` | Action execution logs |
| `/dashboard/audit` | Complete audit trail |
| `/dashboard/integrations` | Razorpay webhook configuration |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Razorpay Account** (Test Mode)
- **Google Gemini API Key**

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/nolan.git
cd nolan

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Setup

Create `backend/.env`:

```env
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=nolan_db
DB_PASSWORD=your_password
DB_PORT=5432

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=8000
```

### 3. Database Setup

```bash
# Create the database
createdb nolan_db

# Initialize all 9 tables
cd backend && npx tsx src/setupDB.ts
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Backend runs on `http://localhost:8000`, Frontend on `http://localhost:3000`.

### 5. Configure Razorpay Webhooks

In your [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks:

1. Add webhook URL: `https://your-domain.com/api/webhook-events`
2. Select events: `payment.failed`, `payment.captured`, `payment.authorized`
3. Copy the webhook secret to your `.env`

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhook-events` | Razorpay webhook receiver |
| `GET` | `/api/metrics/:merchantId` | Dashboard metrics (summary, trends, breakdowns) |
| `GET` | `/api/payments` | List all payments |
| `GET` | `/api/recovery-cases` | List recovery cases |
| `GET` | `/api/recovery-cases/:id` | Get specific case with full timeline |
| `GET` | `/api/agent-decisions` | List AI decisions |
| `GET` | `/api/policy-decisions` | List policy evaluations |
| `GET` | `/api/recovery-actions` | List recovery actions |
| `GET` | `/api/audit-events` | List audit trail |
| `GET` | `/api/merchants` | List merchants |
| `GET` | `/api/customers` | List customers |

### Metrics API Response Shape

```json
{
  "summary": {
    "totalRevenueAtRisk": 5997000,
    "recoveredRevenue": 2199000,
    "recoveryRate": 36.67,
    "failedPayments": 30,
    "recoveryCases": 30,
    "averageRecoveryProbability": 61.23
  },
  "recoveryCasesByStatus": {
    "OPEN": 0, "ANALYZING": 0, "ACTION_PENDING": 6,
    "IN_PROGRESS": 0, "RECOVERED": 11, "ESCALATED": 6,
    "STOPPED": 0, "UNRECOVERABLE": 7
  },
  "recoveryTrend": [
    { "date": "2024-01-01", "recoveredRevenue": 199900 }
  ],
  "failedPaymentsByReason": {
    "INSUFFICIENT_FUNDS": 6, "CARD_EXPIRED": 6,
    "DO_NOT_HONOR": 6, "EXCEEDS_LIMIT": 6, "RISK_REJECTED": 6
  },
  "aiPerformance": { "totalDecisions": 30, "averageConfidence": 0.61 },
  "policyPerformance": { "totalEvaluations": 30, "allowed": 24, "rejected": 6 },
  "actionPerformance": { "totalActions": 24, "successful": 11, "failed": 7, "cancelled": 0 }
}
```

---

## 🔒 Safety & Compliance

| Feature | Implementation |
|---------|---------------|
| **AI is Advisory Only** | Gemini recommends, Policy Engine decides |
| **Retry Limits** | Max 3 attempts per payment (configurable) |
| **Confidence Threshold** | AI confidence < 50% → action blocked |
| **Human Escalation** | Low-confidence or complex cases flagged for review |
| **Idempotency** | Duplicate webhooks safely ignored (atomic claims) |
| **Audit Trail** | Every event immutably logged with actor + timestamp |
| **Transaction Safety** | Payment state transitions use PostgreSQL transactions |
| **Demo Mode** | `DEMO ENVIRONMENT · RAZORPAY TEST MODE` clearly labeled |

---

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Golden path (full pipeline test)
npx tsx src/test-golden-path.ts

# AI agent integration test
npx tsx src/test-ai-agent.ts

# Policy decision boundary tests
npx tsx src/test-policy-decision.ts

# Recovery executor tests
npx tsx src/test-executor-e2e.ts
npx tsx src/test-executor-link.ts
npx tsx src/test-executor-failure.ts
npx tsx src/test-executor-concurrency.ts

# Orchestrator tests
npx tsx src/test-orchestrator-idempotency.ts
npx tsx src/test-orchestrator-boundary.ts
npx tsx src/test-orchestrator-ai-failure.ts

# Metrics regression tests
npx tsx src/test-metrics-regression.ts
npx tsx src/test-metrics-structure.ts
npx tsx src/test-metrics-trend.ts
```

---

## 📂 Project Structure

```
nolan/
├── backend/
│   ├── src/
│   │   ├── index.ts                          # Express server entry point
│   │   ├── db.ts                             # PostgreSQL connection pool
│   │   ├── setupDB.ts                        # Database initialization
│   │   ├── models/                           # Table schemas & creation
│   │   │   ├── merchant.ts
│   │   │   ├── customer.ts
│   │   │   ├── payment.ts
│   │   │   ├── recoverycase.ts
│   │   │   ├── agentdecision.ts
│   │   │   ├── policydecision.ts
│   │   │   ├── recoveryaction.ts
│   │   │   ├── auditevent.ts
│   │   │   └── webhookevent.ts
│   │   ├── services/                         # Business logic layer
│   │   │   ├── recovery-orchestrator.service.ts  # 🧠 Core pipeline
│   │   │   ├── ai-agent.service.ts               # 🤖 Gemini integration
│   │   │   ├── policy-decision.service.ts        # 🛡️ Safety rules
│   │   │   ├── recovery-executor.service.ts      # ⚡ Razorpay execution
│   │   │   ├── webhook-processor.service.ts      # 📡 Webhook handler
│   │   │   ├── payment-recovery.service.ts       # 🔄 Closed-loop recovery
│   │   │   ├── metrics.service.ts                # 📊 Dashboard analytics
│   │   │   ├── payment.service.ts
│   │   │   ├── recovery-case.service.ts
│   │   │   ├── recovery-action.service.ts
│   │   │   ├── agent-decision.service.ts
│   │   │   ├── audit-event.service.ts
│   │   │   ├── customer.service.ts
│   │   │   └── webhook-event.service.ts
│   │   ├── routes/                           # REST API endpoints
│   │   │   ├── metrics.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── recovery-case.routes.ts
│   │   │   ├── recovery-action.routes.ts
│   │   │   ├── agent-decision.routes.ts
│   │   │   ├── policy-decision.routes.ts
│   │   │   ├── audit-event.routes.ts
│   │   │   ├── webhook-event.routes.ts
│   │   │   ├── merchant.routes.ts
│   │   │   └── customer.routes.ts
│   │   └── validators/                       # Zod input validators
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── (landing)/                        # Marketing landing page
│   │   ├── dashboard/
│   │   │   ├── page.tsx                      # Overview dashboard
│   │   │   ├── payments/page.tsx             # Payments table
│   │   │   ├── recovery-cases/page.tsx       # Cases list
│   │   │   ├── recovery-cases/[id]/page.tsx  # Case detail
│   │   │   ├── ai-decisions/page.tsx         # AI logs
│   │   │   ├── recovery-actions/page.tsx     # Action logs
│   │   │   ├── audit/page.tsx                # Audit trail
│   │   │   └── integrations/page.tsx         # Razorpay setup
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/                        # 18 dashboard components
│   │   └── landing/                          # Landing page components
│   ├── lib/
│   │   ├── api.ts                            # API client
│   │   └── useDashboardData.ts               # Real-time data hook
│   └── package.json
└── README.md
```

---

## 🏆 Why Nolan Wins

| Differentiator | Detail |
|---------------|--------|
| **Not just retries** | AI diagnoses root cause and picks the right action per case |
| **Safe by design** | Policy engine prevents runaway AI with hard limits |
| **Closed-loop** | Webhooks detect when payments succeed, auto-closing cases |
| **Full observability** | Every decision traceable in the audit trail |
| **Production-grade DB** | 9 normalized tables with proper FK constraints, not a toy schema |
| **Real Razorpay integration** | Actual webhook processing, not mocked endpoints |
| **Industry-grade metrics** | Recovery rate, revenue at risk, failure distribution — not vanity numbers |

---

<p align="center">
  <b>Built for Razorpay Buildathon 2025</b><br/>
  <sub>Nolan — Because no failed payment should go unrecovered.</sub>
</p>
