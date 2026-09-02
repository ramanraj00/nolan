# Nolan API Documentation

This document outlines the core REST API endpoints available in the Nolan Payment Recovery backend.

---

## 1. Metrics API

### Get Merchant Metrics
**Endpoint:** `GET /api/metrics/:merchantId`  
**Description:** Fetches all aggregated recovery analytics, trends, and AI performance metrics for a specific merchant. Designed to directly power the frontend dashboard.

**Parameters:**
- `merchantId` (URL Param): UUID of the merchant.

**Success Response (200 OK):**
```json
{
  "summary": {
    "totalRevenueAtRisk": 21000,
    "recoveredRevenue": 3000,
    "recoveryRate": 14.29,
    "failedPayments": 6,
    "recoveryCases": 6,
    "recoveredRevenueToday": 1000,
    "averageRecoveryProbability": 65
  },
  "recoveryCasesByStatus": {
    "OPEN": 1,
    "ANALYZING": 0,
    "ACTION_PENDING": 0,
    "IN_PROGRESS": 1,
    "RECOVERED": 2,
    "ESCALATED": 1,
    "STOPPED": 0,
    "UNRECOVERABLE": 1
  },
  "recoveryTrend": [
    {
      "date": "2026-08-28",
      "recoveredRevenue": 0
    },
    {
      "date": "2026-09-03",
      "recoveredRevenue": 1000
    }
  ],
  "failedPaymentsByReason": {
    "BANK_ERROR": 2,
    "INSUFFICIENT_FUNDS": 3,
    "UNKNOWN": 1
  },
  "aiPerformance": {
    "totalDecisions": 2,
    "averageConfidence": 90
  },
  "policyPerformance": {
    "totalEvaluations": 3,
    "allowed": 2,
    "rejected": 1,
    "approvalRequired": 1
  },
  "actionPerformance": {
    "totalActions": 3,
    "successful": 1,
    "failed": 1,
    "cancelled": 0
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid Merchant ID format.
- `404 Not Found`: Merchant not found.
- `500 Internal Server Error`: Server error during aggregation.

---

## 2. Webhook API

### Razorpay Webhook Ingestion
**Endpoint:** `POST /api/webhook-events/razorpay`  
**Description:** Receives event payloads (e.g. `payment.failed`) from Razorpay. Validates the `x-razorpay-signature` securely using the raw request body.

**Headers:**
- `x-razorpay-signature`: HMAC SHA256 signature from Razorpay.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Webhook processed successfully."
}
```

**Error Responses:**
- `400 Bad Request`: Missing signature.
- `401 Unauthorized`: Invalid signature.
- `500 Internal Server Error`: Error processing webhook.

---

## 3. Core Entities APIs

### Merchants
- `POST /api/merchants`: Create a new merchant.
- `GET /api/merchants/:id`: Fetch merchant details.

### Customers
- `POST /api/customers`: Create a new customer for a merchant.
- `GET /api/customers/:merchantId`: List all customers for a merchant.

### Payments
- `GET /api/payments/:merchantId`: List all payments for a merchant.
- `GET /api/payments/:merchantId/:paymentId`: Get specific payment details.

### Recovery Cases
- `POST /api/recovery-cases`: Create a new recovery case manually (usually created via Webhook Processor).
- `GET /api/recovery-cases/:merchantId`: List all recovery cases for a merchant.

### Agent Decisions (AI)
- `POST /api/agent-decisions`: Record an AI decision for a recovery case.
- `GET /api/agent-decisions/:merchantId`: Fetch AI decisions for a merchant's cases.

### Policy Decisions (Rules Engine)
- `POST /api/policy-decisions`: Evaluate and record a policy outcome based on an agent decision.
- `GET /api/policy-decisions/:merchantId`: Fetch policy decisions for a merchant.

### Recovery Actions
- `POST /api/recovery-actions`: Dispatch a recovery action (e.g. `RETRY_PAYMENT`).
- `GET /api/recovery-actions/:merchantId`: Fetch all recovery actions executed for a merchant.

### Audit Events
- `POST /api/audit-events`: Create an immutable audit log entry.
- `GET /api/audit-events/:merchantId`: List audit trail for a merchant's recovery process.

