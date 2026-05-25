# LocusFounder 🏗️

> **Fully unattended AI storefront builder** — Send a niche prompt, get a complete dropshipping store.

Built on [Mastra](https://mastra.ai) + Gemini AI + 17TRACK + Stripe Connect.

---

## What It Does

You send a single Telegram message:

```
/build pet accessory dropshipping store
```

LocusFounder autonomously:

1. **Sources products** — queries dropship supplier APIs for trending items
2. **Builds a storefront** — generates brand name, colour palette, full HTML/CSS shop
3. **Writes all listings** — uses Gemini AI to write SEO-optimized titles, descriptions, bullet points & CTAs for every product
4. **Registers tracking with 17TRACK** — registers shipment numbers for multi-carrier monitoring and receives webhook updates
5. **Routes payouts** — sets up Stripe Connect split payments (platform fee + owner share)
6. **Notifies the owner** — sends a Telegram summary with store URL, Stripe onboarding link, and payout details

**Zero human input required after the initial prompt.**

---

## Architecture

```
locusfounder/
├── libs/
│   └── mastra-engine/          # Core library
│       └── src/
│           ├── agents/
│           │   └── locusFounderAgent.ts     # Gemini-powered agent
│           ├── workflows/
│           │   └── storefrontBuilderWorkflow.ts  # 6-step Mastra workflow
│           ├── tools/
│           │   ├── sourceProducts.ts        # Supplier API integration
│           │   ├── buildStorefront.ts       # HTML storefront generator
│           │   ├── writeListings.ts         # AI copywriting (Gemini)
│           │   ├── integrateLocusCheckout.ts # Locus Logistics integration
│           │   ├── routePayouts.ts          # Stripe Connect payout routing
│           │   └── notifyOwner.ts           # Telegram notifications
│           ├── db/
│           │   └── inMemoryStore.ts         # Dev store (→ Prisma in prod)
│           └── mastra.config.ts             # Mastra Studio registration
│
└── apps/
    ├── telegram-bot/                        # Bot + Express API server
    │   └── src/
    │       ├── bot.ts                       # Telegram bot handlers
    │       └── server.ts                    # Express HTTP server
    └── admin-dashboard/                     # Next.js admin UI
        └── app/
            ├── page.tsx                     # Dashboard UI
            └── globals.css
```

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- pnpm ≥ 8 (`npm install -g pnpm`)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required keys:
| Key | Source |
|-----|--------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com) |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/botfather) on Telegram |
| `TRACK17_API_TOKEN` | 17TRACK Access Token |
| `LOCUS_API_KEY` | [Locus Dashboard](https://locus.sh) |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com) |
| `CJ_API_KEY` | CJ Dropshipping API |

### 4. Build the Engine

```bash
pnpm build:engine
```

### 5. Start the Bot + API Server

```bash
pnpm dev:bot
```

Server starts at `http://localhost:3001`

### 6. Start the Admin Dashboard

In a second terminal:

```bash
pnpm dev:dashboard
```

Dashboard at `http://localhost:3000`

### 7. Open Mastra Studio

```bash
pnpm dev:studio
```

Mastra Studio at `http://localhost:4111` — test agents and workflows interactively.

---

## Usage

### Via Telegram Bot

```
/start          — Welcome
/build <niche>  — Build a store
/stores         — List your stores
/status <id>    — Check store status
```

### Via REST API

```bash
# Trigger a build
curl -X POST http://localhost:3001/api/build \
  -H "Content-Type: application/json" \
  -d '{
    "nichePrompt": "pet accessory dropshipping store",
    "ownerTelegramId": "123456789",
    "productLimit": 5,
    "platformFeePercent": 10,
    "payoutSchedule": "weekly"
  }'

# List all stores
curl http://localhost:3001/api/stores

# Preview a store
open http://localhost:3001/stores/happy-tails-store/preview
```

---

## Workflow Steps

```
Trigger: { nichePrompt, ownerTelegramId }
         │
         ▼
  ┌─────────────────┐
  │ 1. sourceProducts│  ← CJ Dropshipping API
  └────────┬────────┘
           ▼
  ┌──────────────────┐
  │ 2. buildStorefront│  ← Brand name + palette + full HTML
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │ 3. writeListings  │  ← Gemini Flash AI copywriting
  └────────┬─────────┘
           ▼
  ┌───────────────────────┐
  │ 4. integrateLocusCheckout│  ← Locus API registration + webhook
  └────────┬──────────────┘
           ▼
  ┌────────────────┐
  │ 5. routePayouts │  ← Stripe Connect split payment setup
  └────────┬───────┘
           ▼
  ┌───────────────┐
  │ 6. notifyOwner │  ← Telegram summary message
  └───────────────┘
```

---

## Extending LocusFounder

### Add a New Tool

```ts
// libs/mastra-engine/src/tools/myNewTool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myNewTool = createTool({
  id: "my-new-tool",
  description: "...",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async ({ inputData }) => { ... },
});
```

### Add a Workflow Step

```ts
// Add to storefrontBuilderWorkflow.ts
const step7MyStep = createStep({ id: "my-step", ... });

// Chain it
export const storefrontBuilderWorkflow = createWorkflow({ ... })
  .then(step1SourceProducts)
  // ... existing steps
  .then(step7MyStep)  // ← add here
  .commit();
```

### Production Checklist

- [ ] Replace `inMemoryStore.ts` with Prisma + PostgreSQL
- [ ] Implement real CJ Dropshipping API calls in `sourceProducts.ts`
- [ ] Enable Stripe webhook signature verification
- [ ] Add rate limiting and authentication to `/api/build`
- [ ] Deploy to Railway / Fly.io / AWS ECS
- [ ] Set up domain and HTTPS for storefront previews
- [ ] Configure Locus production webhook URL

---

## License

MIT — build freely, ship fast. 🚀
