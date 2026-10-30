# ADR 0001: Resolution of Backend Persistence Stack and ORM Migration Authority

- **Status:** Proposed & Decided
- **Date:** 2026-10-28
- **Context:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System

---

## 1. Context and Problem Statement

The initial project specifications and architecture diagrams (`Docs/BakeConnect UML Architecture Overview.png`, Panel 5) reference a backend stack consisting of **Spring Boot + PostgreSQL + Prisma**.

However, **Prisma Client** is fundamentally designed and maintained for Node.js and TypeScript runtimes (see official documentation: [https://www.prisma.io/docs/orm/v7/prisma-client](https://www.prisma.io/docs/orm/v7/prisma-client)). Spring Boot is an enterprise Java application framework. They are not a coherent single-backend ORM combination:
1. Spring Boot cannot directly execute Prisma Client without embedding an external Node.js process or running a separate microservice.
2. Introducing a sidecar Node.js/Prisma process solely to act as a database bridge violates the capstone principle of keeping BakeConnect a maintainable, clean modular monolith without unwarranted distributed complexity.
3. Managing PostgreSQL database migrations through two independent systems (e.g. Prisma Migrate alongside Java tools) risks schema drift, race conditions, lock contention, and transactional ambiguity.
4. Permitting a frontend application (such as Next.js) to write directly to PostgreSQL via Prisma bypasses Spring Boot's business validation, authorization policies, stock reservation invariants, and audit logging.

Inspection of the repository confirms that **zero Prisma code, schemas, or migrations currently exist** in the repository. The diagram reference was an early conceptual artifact before backend implementation commenced.

---

## 2. Decision

We will use a unified, standard enterprise Java persistence stack with **one single authoritative writer and migration authority**:

1. **Backend Framework:** Java 21+ (targeting Ubuntu / OpenJDK 26 runtime) with **Spring Boot 3.4+ REST API**.
2. **Persistence Layer:** **Spring Data JPA + Hibernate 6.x** as the primary Object-Relational Mapping (ORM) framework.
3. **Primary Database:** **PostgreSQL 18+** as the authoritative, transactional system of record.
4. **Schema Migration Authority:** **Flyway** as the sole database migration tool, executing versioned SQL scripts (`V1__...sql`) automatically at application startup.
5. **Caching Layer:** **Redis** strictly for non-authoritative cache data (cache-aside for active catalog items, category metadata, and pre-computed report aggregates). Redis will **never** store durable queues, outbox messages, idempotency locks, or inventory truth.
6. **Frontend Integration:** Next.js (and any client) will interact with PostgreSQL **exclusively through Spring Boot's versioned REST API (`/api/v1/`)**. No direct database connections from clients or external runtimes are permitted.

---

## 3. Rationale

- **Cohesion and Clean Boundaries:** Spring Data JPA with Hibernate is the first-class, battle-tested standard for Java modular monoliths, providing type-safe repositories, optimistic locking (`@Version`), declarative transaction management (`@Transactional`), and seamless connection pooling with HikariCP.
- **Deterministic Schema Evolution:** Flyway ensures that all PostgreSQL tables, indexes, check constraints, foreign keys, and trigger-free audit columns are versioned in source control as plain SQL files. Database DBAs or developers can inspect the exact DDL.
- **High Concurrency and Integrity:** High concurrent load (target: 1,000 VUs) requires fine-grained control over connection pool sizing, index execution plans (`EXPLAIN ANALYZE`), row-level locks (`PessimisticLock`) where necessary, and optimistic locks (`@Version`) for order stock contention. This is directly achievable within Spring Boot without serialization overhead across runtime boundaries.
- **Security:** Concentrating all database reads and writes in the Spring Boot service layer guarantees that role-based access control (RBAC), tenant object ownership (retailer data isolation), and business rules (e.g., GST requirements for business orders) are enforced universally.

---

## 4. Consequences and Invariants

- **Positive:**
  - Single runtime to compile, test, package, and deploy.
  - Zero dual-ORM sync issues or cross-runtime serialization latency.
  - Full compatibility with Testcontainers for true integration testing against PostgreSQL and Redis.
  - Clean path to k6 load testing with reproducible metrics.
- **Negative / Constraints:**
  - Any future Node.js service or Next.js Server Action must call the Spring Boot REST API rather than querying the database directly.
  - Developers must write explicit Flyway SQL migrations rather than relying on automatic Prisma schema push.
