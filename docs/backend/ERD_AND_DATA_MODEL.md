# BakeConnect Database Entity-Relationship Model & Schema Documentation

- **Database:** PostgreSQL 18+
- **Migration Authority:** Flyway (`V1__init_schema.sql`, `V2__performance_indexes.sql`, `V3__seed_data.sql`)
- **Persistence Layer:** Spring Data JPA + Hibernate (No Prisma, No secondary schema mutator)
- **Currency & Money:** Explicit `NUMERIC(12,2)` (Strictly zero floating-point arithmetic)
- **Timestamps:** UTC `TIMESTAMP WITH TIME ZONE`

---

## 1. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ addresses : "owns"
    users ||--o| retailer_profiles : "has profile"
    users ||--o{ orders : "places"
    users ||--o{ product_reviews : "writes"

    categories ||--o{ products : "contains"
    products ||--o{ order_items : "snapshotted into"
    products ||--o{ product_reviews : "receives"

    orders ||--o{ order_items : "contains"
    orders ||--o{ order_status_history : "tracks"
    orders ||--o| invoices : "generates (B2B)"
    orders ||--o{ payment_attempts : "attempts payment"
    orders ||--o{ product_reviews : "qualifies"

    retailer_profiles ||--o{ invoices : "billed via"
    retailer_profiles ||--o{ retailer_ledger : "tracks balance"
    invoices ||--o{ retailer_ledger : "debits balance"

    discount_rules ||--o{ orders : "applies to"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone
        varchar role "ADMIN, RETAILER, CUSTOMER, DELIVERY"
        boolean is_active
        timestamp created_at
    }

    retailer_profiles {
        uuid id PK
        uuid user_id FK,UK
        varchar business_name
        varchar gst_number
        varchar approval_status "PENDING, APPROVED, REJECTED"
        varchar payment_terms "IMMEDIATE, NET_3, NET_15, CUSTOM"
        numeric credit_limit
    }

    addresses {
        uuid id PK
        uuid user_id FK
        varchar type "SHIPPING, BILLING"
        varchar contact_name
        varchar contact_phone
        varchar address_line1
        varchar city
        varchar state
        varchar postal_code
        boolean is_default
    }

    categories {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        boolean is_active
    }

    products {
        uuid id PK
        uuid category_id FK
        varchar name
        varchar slug UK
        numeric retail_price
        numeric wholesale_price
        numeric unit_cost
        int moq
        int moq_increment
        int stock_quantity
        boolean is_available
        bigint version "Optimistic Lock"
    }

    orders {
        uuid id PK
        varchar order_number UK
        uuid user_id FK
        varchar order_type "PERSONAL, BUSINESS"
        varchar status "PENDING, ACCEPTED, CONFIRMED, DELAYED, DECLINED, DELIVERED"
        varchar payment_status "PENDING, PAID, PARTIALLY_PAID, FAILED"
        varchar delivery_type "DELIVERY, STORE_PICKUP"
        numeric subtotal_amount
        numeric discount_amount
        numeric tax_amount
        numeric total_amount
        bigint version
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        varchar product_name_snapshot
        varchar product_sku_snapshot
        numeric unit_price_snapshot
        int quantity
        numeric tax_rate_snapshot
        numeric total_price_snapshot
    }

    invoices {
        uuid id PK
        varchar invoice_number UK
        uuid order_id FK,UK
        uuid retailer_id FK
        numeric total_amount
        numeric amount_paid
        numeric balance_due
        varchar status "ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED"
        date due_date
    }

    retailer_ledger {
        uuid id PK
        uuid retailer_id FK
        uuid invoice_id FK
        varchar entry_type "INVOICE_DEBIT, PAYMENT_CREDIT, ADJUSTMENT"
        numeric debit_amount
        numeric credit_amount
        numeric running_balance
        timestamp entry_timestamp
    }

    payment_attempts {
        uuid id PK
        varchar attempt_reference UK
        uuid order_id FK
        varchar provider "MOCK, YOUPI_PG"
        numeric amount
        varchar status "INITIATED, SUCCESS, FAILED"
    }

    webhook_event_inbox {
        uuid id PK
        varchar delivery_id UK
        varchar provider
        varchar event_type
        varchar signature_status "VALID, INVALID, TAMPERED"
        varchar processing_status "PROCESSED, DUPLICATE, FAILED"
    }

    notification_outbox {
        uuid id PK
        varchar event_type
        varchar recipient_email
        text payload_json
        varchar status "PENDING, PROCESSING, SENT, FAILED, DEAD_LETTER"
        int retry_count
        timestamp next_retry_at
    }

    product_reviews {
        uuid id PK
        uuid product_id FK
        uuid user_id FK
        uuid order_id FK
        int rating "1 to 5"
        text review_text
        boolean is_verified_purchase
    }
```

---

## 2. Invariant Rules Enforced by Schema

1. **Unique Review Invariant**: `uq_product_user_order (product_id, user_id, order_id)` guarantees a customer can review a purchased item at most once per qualifying delivered order.
2. **Immutable Snapshots**: `order_items` stores historical copies of `product_name_snapshot`, `product_sku_snapshot`, `unit_price_snapshot`, and `tax_rate_snapshot`. Subsequent product updates in `products` never alter past invoices.
3. **Optimistic Locking**: `products.version` and `orders.version` prevent concurrent read-modify-write lost updates.
4. **Deterministic Deadlock Prevention**: Enforced at the application transaction boundary via ascending UUID sort before issuing `SELECT ... FOR UPDATE` row locks.
5. **Append-Only Receivables Ledger**: Double-entry ledger structure recording `INVOICE_DEBIT`, `PAYMENT_CREDIT`, and `ADJUSTMENT`. Direct SQL mutation of historical ledger rows is disallowed.
