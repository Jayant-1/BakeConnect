# Unified Tunnel Router Architecture

## 1. Overview
In a hybrid cloud/local deployment where the frontend runs globally distributed on **Vercel Edge** while backend micro-services, database engines, and banking observer daemons run on local development or on-premise infrastructure, managing multi-port network egress presents significant friction:
- **Port fragmentation**: Spring Boot listens on `8080`, YouPi PG checkout portal on `7000`, payment processing API on `6100`, and Admin Hub on `6001`.
- **Tunnel limits**: Cloudflare Quick Tunnels (`trycloudflare.com`) allow exposing only **one single local port per tunnel session**.
- **CORS & Preflight complexity**: Direct cross-origin calls across distinct tunnel hostnames trigger browser preflights, cookies/credential blocks, and mixed-content security policies.

To resolve this seamlessly, BakeConnect employs the **Unified Tunnel Router** ([`scripts/tunnel-router.js`](../../scripts/tunnel-router.js)).

---

## 2. Router Routing Table & Port Topology

The Tunnel Router binds to port `8000` (configurable via `ROUTER_PORT`) and acts as a single-origin reverse proxy:

```mermaid
graph TD
    Client["Vercel Edge / Browser Client<br/>https://bakeconnect.vercel.app"] -->|Single Cloudflare Tunnel HTTPS| Cloudflare["Cloudflare Edge Network<br/>*.trycloudflare.com"]
    Cloudflare -->|quic / HTTP/2| TunnelRouter["Unified Tunnel Router<br/>http://127.0.0.1:8000"]
    
    TunnelRouter -->|"/api/v1/*", "/actuator/*"| SpringBoot["Spring Boot Backend<br/>127.0.0.1:8080"]
    TunnelRouter -->|"/checkout/*", "/css/*", "/js/*"| Checkout["YouPi PG Checkout Portal<br/>127.0.0.1:7000"]
    TunnelRouter -->|"/payment-api/*"| PaymentApi["YouPi Payment API<br/>127.0.0.1:6100"]
    TunnelRouter -->|"/admin/*"| AdminHub["Admin Hub<br/>127.0.0.1:6001"]
    
    SpringBoot --> PostgreSQL[("PostgreSQL 18<br/>Port 5433")]
    SpringBoot --> Redis[("Redis Cache<br/>Port 6379")]
    PaymentApi --> SQLite[("YouPi SQLite<br/>data/youpi_pg.sqlite")]
```

### Path Dispatches

| URL Pattern | Destination Service | Internal Port | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/*` | Spring Boot REST API | `8080` | Product catalog, ordering, identity, billing, cart quotes. |
| `/actuator/*` | Spring Boot Actuator | `8080` | Liveness, readiness, and metrics endpoints. |
| `/checkout/*` | YouPi PG Portal | `7000` | Dynamic UPI QR code presentation & customer payment UI. |
| `/css/*`, `/js/*`, `/icons/*`, `/assets/*` | YouPi Static Assets | `7000` | Static stylesheets, client scripts, bank brand assets. |
| `/api/v1/checkout/*`, `/api/v1/customer/*` | YouPi Checkout API | `7000` | Session polling and real-time payment status checks. |
| `/payment-api/*` | Payment API | `6100` | Core transaction initiation and merchant verification. |
| `/admin/*` | Admin Hub | `6001` | Management console for merchant operations. |
| `/health` | Tunnel Router Health Probe | `8000` | Instant JSON status (`{"status":"UP"}`). |

---

## 3. Key Invariants & Features

### 3.1 Transparent CORS & Header Forwarding
The router automatically attaches permissive CORS headers to all responses and intercepts `OPTIONS` preflight requests:
- `Access-Control-Allow-Origin: *` (or requested origin)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Merchant-Id, X-Merchant-Key, Idempotency-Key, x-internal-service-token, x-device-id, x-device-token`
- `Access-Control-Allow-Credentials: true`

It injects standard reverse proxy forwarding headers:
- `x-forwarded-host`
- `x-forwarded-proto`
- `x-forwarded-for`

### 3.2 Server-Sent Events (SSE) Streaming
When forwarding responses with `content-type: text/event-stream` (such as real-time banking notification listeners or status streams), proxy buffering is strictly disabled:
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- Immediate header flushing via `res.flushHeaders?.()`

### 3.3 Full WebSocket Upgrade Support
The router listens for HTTP `upgrade` events on port `8000`. WebSocket streams targeted at `/api/v1/*` or `/actuator/*` are forwarded to Spring Boot (`8080`), while general real-time socket connections pipe directly to the YouPi PG checkout engine (`7000`).

---

## 4. Operational Runbook

### Starting the Tunnel Router
```bash
# Start the router on port 8000
node scripts/tunnel-router.js
```

### Connecting Cloudflare Tunnel
```bash
# Expose port 8000 via quick tunnel
cloudflared tunnel --url http://127.0.0.1:8000
```

### Configuring Vercel Production
Set the assigned tunnel domain in Vercel project environment variables:
```bash
echo "https://your-tunnel-name.trycloudflare.com" | npx vercel env add BACKEND_INTERNAL_URL production --force
echo "https://your-tunnel-name.trycloudflare.com" | npx vercel env add NEXT_PUBLIC_API_URL production --force
```
