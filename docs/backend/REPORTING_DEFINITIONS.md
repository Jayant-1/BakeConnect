# BakeConnect Business Reports & Metrics Definitions

## 1. Executive Summary

This document establishes the authoritative financial, operational, and customer metrics computed by BakeConnect's backend reporting engine. All formulas, data sources, and margin guardrails are strictly standardized.

---

## 2. Core Financial Metrics

### 2.1 Gross Sales
- **Definition**: The total catalogue list price value of all product items ordered during the specified reporting window across non-cancelled/non-declined orders.
- **Formula**:
  $$\text{Gross Sales} = \sum_{\text{eligible orders}} \text{subtotalAmount}$$
- **Data Source**: `orders.subtotal_amount` (computed as $\sum \text{quantity} \times \text{unitPriceSnapshot}$).
- **Eligible Statuses**: `CONFIRMED`, `DELIVERED`, `PROCESSING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`.
- **Exclusions**: `CANCELLED`, `DECLINED`, `PENDING_REVIEW` (unaccepted drafts).

### 2.2 Total Discounts
- **Definition**: The total value of promotional and automated volume discounts deducted from gross order values.
- **Formula**:
  $$\text{Total Discounts} = \sum_{\text{eligible orders}} \text{discountAmount}$$
- **Components**: Includes automatic 2.5% wholesale volume discount on orders $\ge$ ₹10,000.

### 2.3 Net Sales
- **Definition**: Gross revenue after subtracting discounts, prior to tax additions.
- **Formula**:
  $$\text{Net Sales} = \text{Gross Sales} - \text{Total Discounts}$$

### 2.4 Taxes (GST)
- **Definition**: Total statutory Goods and Services Tax collected.
- **Bakery Rate**: Standardized at 5% Indian GST for fresh bakery and confectionery products.
- **Formula**:
  $$\text{Tax} = \text{Net Sales} \times 0.05$$

### 2.5 Total Revenue (Gross Invoiced Value)
- **Definition**: Total financial obligation settled or receivables invoiced to customers and retailers.
- **Formula**:
  $$\text{Total Revenue} = \text{Net Sales} + \text{Total Tax}$$

---

## 3. Order & Basket Analytics

### 3.1 Average Order Value (AOV)

BakeConnect explicitly isolates retail consumer dynamics from commercial distribution orders:

1. **B2C AOV (Direct Consumer)**:
   $$\text{AOV}_{\text{B2C}} = \frac{\sum \text{Gross Sales}_{\text{OrderType.PERSONAL}}}{\text{Count}(\text{OrderType.PERSONAL})}$$
2. **B2B AOV (Retailer Distribution)**:
   $$\text{AOV}_{\text{B2B}} = \frac{\sum \text{Gross Sales}_{\text{OrderType.BUSINESS}}}{\text{Count}(\text{OrderType.BUSINESS})}$$
3. **Blended AOV**:
   $$\text{AOV}_{\text{Blended}} = \frac{\text{Gross Sales}_{\text{Total}}}{\text{Total Orders}}$$

---

## 4. Margin Guardrails & Gating Policy

> **MANDATORY POLICY**: Margin calculation is strictly gated by historized unit cost.

### 4.1 Cost of Goods Sold (COGS)
- **Formula**:
  $$\text{COGS} = \sum_{\text{items}} (\text{product.unitCost} \times \text{quantity})$$

### 4.2 Gating Status
- If **ANY** item in the reporting window has `product.unitCost == null`:
  - `marginStatus`: `"NOT_AVAILABLE"`
  - `totalCostOfGoodsSold`: `null`
  - `grossMargin`: `null`
  - `grossMarginPercentage`: `null`
  - `marginExplanatoryNote`: `"Margin calculation unavailable: One or more products sold during this period do not have a configured unit cost."`
- If **ALL** items have configured unit costs:
  - `marginStatus`: `"AVAILABLE"`
  - `grossMargin`: $\text{Net Sales} - \text{COGS}$
  - `grossMarginPercentage`: $\frac{\text{Gross Margin}}{\text{Net Sales}} \times 100$

This prevents fabricated or misleading profitability metrics from leaking to executive decision-makers.

---

## 5. Retailer Growth & Churn Telemetry

### 5.1 Active Retailers
- Count of all retailer profiles with `approvalStatus == APPROVED`.

### 5.2 New Retailer Onboarding
- Count of approved retailer profiles with `created_at` inside the requested reporting window.

### 5.3 Churn Risk Criteria
- **Signal**: Any approved retailer who has placed **zero orders in the last 30 consecutive days**.
- **Context Provided**:
  - `daysSinceLastOrder`: Days elapsed since the most recent order (or account creation if no orders yet).
  - `lastOrderDate`: ISO date of last purchase.
  - `lifetimeOrderCount`: Historical orders placed.
  - `lifetimeRevenue`: Total historical spend.
