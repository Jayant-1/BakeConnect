# BakeConnect Cache-Only Redis & Consistency Architecture

## 1. Architectural Mandate: Cache-Only Redis

> **RULE OF TRUTH**: Redis is strictly a read cache for performance acceleration. It is NEVER the system of record.

### Prohibited Usages (BANNED in Redis):
1. **User Sessions**: BakeConnect uses stateless cryptographic JWT tokens.
2. **Auth State & Passwords**: Authoritatively verified via PostgreSQL `users` table.
3. **Notification Outbox**: Stored authoritatively in PostgreSQL `notification_outbox` table.
4. **Order State & Inventory Truth**: Stored authoritatively in PostgreSQL `orders` and `products` tables.
5. **Idempotency Locks & Webhooks**: Stored in PostgreSQL `payment_attempts` and `webhook_event_inbox` tables.

### Failure Recovery Guarantee:
If the Redis cluster is flushed (`FLUSHALL`) or crashes:
- Zero data loss occurs.
- Zero orders or payments are lost.
- The system continues operating with graceful degradation (direct PostgreSQL reads).

---

## 2. Permitted Cache Names & TTL Policies

| Cache Name | Key Schema | Default TTL | Invalidation Trigger |
| :--- | :--- | :--- | :--- |
| `categories` | `"all"` | 15 minutes | Admin creates, edits, or deletes a category |
| `products` | `"cat:" + categoryId` or `productId` | 10 minutes | Admin updates product, prices, or stock status |
| `product-reviews` | `productId` | 10 minutes | Verified customer submits new review |

---

## 3. Invalidation & Cache Eviction Rules

1. **Eviction on Write**:
   Any administrative mutation to a catalog item (`POST /api/v1/admin/catalog/products`, `PUT`, `PATCH /stock`) issues an explicit `@CacheEvict(value = "products", allEntries = true)`.
2. **LRU Memory Management**:
   The Redis instance runs with:
   ```bash
   redis-server --save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
   ```
   This ensures that under heavy load (1,000 VUs), Redis never exhausts container memory or blocks writes.
