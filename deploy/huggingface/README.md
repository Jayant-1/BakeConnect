---
title: BakeConnect & YouPi PG Ecosystem
emoji: 🥐
colorFrom: amber
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# 🥐 BakeConnect & YouPi PG Autonomous Gateway

Complete enterprise deployment of **BakeConnect** (Artisanal Bakery & Wholesale Distribution) and **YouPi PG** (Autonomous UPI Payment Gateway with zero-human-interaction Google Messages Web observation).

## 🚀 Architecture in this Space

This Space runs the complete backend stack inside a unified Docker container listening on **Port `7860`**:

1. **BakeConnect Backend** (`/api/v1/*`): Spring Boot 3.3 (Java 21) REST API with Flyway migrations.
2. **YouPi Payment API** (`/payment-api/*`): Node.js Core Payment Gateway with dynamic paise matching.
3. **YouPi Checkout Portal** (`/checkout/*`): Real-time UPI payment screen and SSE live poller.
4. **Autonomous SMS Observer**: Headless Chromium with pre-paired Google Messages Web session monitoring bank credit SMS notifications in real-time.
5. **PostgreSQL 16 & Redis 7**: Embedded in-container persistence and caching.
6. **Internal Nginx Proxy**: Reverse proxy on port `7860` routing requests securely.

## 🔗 Endpoints

- **Live Status & Control Hub:** `https://<space-host>/`
- **Health Check:** `https://<space-host>/health`
- **Spring Boot Actuator:** `https://<space-host>/actuator/health`
- **Products Catalog API:** `https://<space-host>/api/v1/products`
- **Checkout Portal:** `https://<space-host>/checkout/<session-id>`
- **Merchant Admin Hub:** `https://<space-host>/admin/`

## 📱 Frontend Integration

To connect your local or Vercel Next.js frontend to this Hugging Face Space:

```env
NEXT_PUBLIC_API_URL=https://<your-username>-<your-space-name>.hf.space
```
