# BakeConnect k6 Performance Test Suite

Comprehensive performance, load, stress, spike, and concurrency-integrity testing suite for the **BakeConnect** backend modular monolith.

---

## 1. Prerequisites & Setup

### 1.1 Tool Requirements
- **k6**: v0.48+ (or v2.x CLI)
- **Spring Boot Backend**: Running on port `8080` (with Virtual Threads enabled, HikariCP max pool 50)
- **PostgreSQL 18**: Running on port `5433` (or configured port)
- **Strict Cache-Only Redis**: Running on port `6379`

### 1.2 Installation
If k6 is not installed on your system:
```bash
# Ubuntu / Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E34100
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

---

## 2. Test Scripts Overview

| Script | Virtual Users (VUs) | Duration | Primary Objective |
| :--- | :--- | :--- | :--- |
| [`smoke-test.js`](./smoke-test.js) | 5 VUs | 30s | Quick sanity check across health, auth, catalog, cart quote, checkout, and invoices |
| [`concurrency-integrity-test.js`](./concurrency-integrity-test.js) | 50 VUs | 30s | Simultaneous contention on a single item: proves deterministic row-level locks, zero deadlocks, and exact inventory conservation |
| [`load-test-1000vu.js`](./load-test-1000vu.js) | Up to 1,000 VUs | 22m | Full 1,000 concurrent VUs validation with 60/25/10/5 traffic mix and strict p95 < 500ms SLA |
| [`stress-test.js`](./stress-test.js) | Up to 1,500 VUs | 13m | Capacity breaking-point identification and pool saturation recovery |
| [`spike-test.js`](./spike-test.js) | Sudden 0 $\to$ 800 VUs | 2m10s | Rapid traffic surge absorption and instant elasticity validation |
| [`soak-test.js`](./soak-test.js) | 200 VUs | 18m+ | Endurance testing to identify slow memory leaks, connection leaks, or GC degradation |

---

## 3. SLA Targets & Thresholds

Under nominal 1,000 concurrent Virtual Users load:
- **`http_req_duration`**:
  - `p(95) < 500ms`
  - `p(99) < 1000ms`
- **`http_req_failed`**:
  - `rate < 0.1%` (excluding deliberate synthetic inventory exhaustion rejections)
- **Deadlock Occurrences**:
  - `count == 0` (strict requirement enforced via deterministic product ID sorting)
- **Inventory Conservation**:
  - $\text{Initial Stock} - \text{Final Stock} = \sum \text{Quantity in Confirmed Orders}$

---

## 4. Execution Commands

### 4.1 Smoke Test (Run First)
```bash
k6 run performance/k6/smoke-test.js
```

### 4.2 Concurrency & Inventory Integrity Test
```bash
k6 run performance/k6/concurrency-integrity-test.js
```
Expected output confirms:
- 50 concurrent transactions placed simultaneously
- Exact inventory delta equals `50 * ordered_quantity`
- Zero deadlocks and zero 500 Internal Server Errors

### 4.3 1,000 Concurrent VUs Load Test
```bash
# Standard 22-minute full validation run
k6 run performance/k6/load-test-1000vu.js

# Accelerated preview run (5-minute test with same 1,000 VU peak target)
k6 run --stage 30s:100,1m:500,2m:1000,1m:1000,30s:0 performance/k6/load-test-1000vu.js
```

### 4.4 Stress Test (Breaking Point)
```bash
k6 run performance/k6/stress-test.js
```

### 4.5 Spike Test (Flash Sale Rush)
```bash
k6 run performance/k6/spike-test.js
```

### 4.6 Soak Test (Endurance)
```bash
k6 run performance/k6/soak-test.js
```

---

## 5. Environment & Hardware Assumptions

To achieve and validate 1,000 concurrent Virtual Users sustainably:
- **Backend Node**: 4+ vCPU, 8GB RAM, Java 21+ with Virtual Threads enabled (`spring.threads.virtual.enabled=true`).
- **PostgreSQL**: PostgreSQL 18+, SSD storage, `max_connections >= 200`, `shared_buffers >= 512MB`.
- **HikariCP**: `maximum-pool-size: 50`, `minimum-idle: 10`, `connection-timeout: 5000ms`.
- **Strict Cache-Only Redis**: Dedicated Redis 7+ instance running with `--save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru`.
- **Network**: Low latency (< 5ms) local or VPC interconnect between application and database.
