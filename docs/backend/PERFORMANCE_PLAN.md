# BakeConnect Performance Engineering & 1,000 VU Target Plan

## 1. Objective & Target Profile

Validate sustainable operation under **1,000 concurrent Virtual Users (VUs)** with:
- `http_req_duration`: p95 < 500ms, p99 < 1,000ms.
- `http_req_failed`: error rate < 0.1% (excluding deliberate synthetic business rejections).
- Zero database deadlocks under high-concurrency order placement.

---

## 2. Concurrency Bottleneck Mitigations

### 2.1 Deterministic Product Locking (Deadlock Prevention)
When multiple concurrent requests checkout orders containing overlapping products (e.g. Order A: [Prod 1, Prod 2], Order B: [Prod 2, Prod 1]), acquiring row-level locks in arbitrary order creates circular wait deadlocks.

**BakeConnect Solution**:
In `OrderService.java`, all requested product IDs are sorted in **deterministic ascending order** before issuing `SELECT ... FOR UPDATE` locks:
```java
List<UUID> sortedProductIds = request.items().stream()
        .map(OrderItemRequest::productId)
        .distinct()
        .sorted()
        .toList();

for (UUID prodId : sortedProductIds) {
    Product product = productRepository.findByIdWithPessimisticLock(prodId)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", prodId));
    productMap.put(prodId, product);
}
```
This guarantees an acyclic wait graph, completely eliminating deadlocks under high concurrency.

### 2.2 Virtual Threads (Java 21+)
Enabled in `application.yml`:
```yaml
spring:
  threads:
    virtual:
      enabled: true
```
Enables lightweight non-blocking dispatch across thousands of concurrent HTTP connections without thread exhaustion.

### 2.3 Database Indexing (Migration V2)
- Indexes on `(is_active, is_available, category_id)` for catalog queries.
- Composite indexes on `(user_id, created_at DESC)` for order lookups.
- Composite indexes on `(retailer_id, status, due_date ASC)` for billing queries.
- Index on `(status, next_retry_at ASC)` for outbox worker polling efficiency.

### 2.4 HikariCP Connection Pool
- `maximum-pool-size: 50`
- `minimum-idle: 10`
- `connection-timeout: 5000ms`
- `leak-detection-threshold: 20000ms`

---

## 3. k6 Test Suite Structure

The k6 performance test suite is located in `performance/k6/`:

1. `smoke-test.js`: 5 VUs, 1 minute validation.
2. `load-test-1000vu.js`: Target ramping from 100 -> 250 -> 500 -> 1000 VUs, holds peak for 10 minutes.
3. `concurrency-integrity-test.js`: Parallel simultaneous checkouts on a single limited-stock item to prove exact inventory conservation and zero double-allocation.
4. `stress-test.js`: Pushes system beyond nominal capacity (up to 1,500 VUs).
5. `spike-test.js`: Sudden burst from 0 to 800 VUs within 15 seconds to verify recovery.
6. `soak-test.js`: Constant 200 VUs for 2 hours to detect memory leaks.
