# MOTORATE — Claude Code Project Context

## About This Project

MotoRate is a vehicle-first social platform where vehicles accumulate reputation through community interactions (spots, stickers, reviews, follows). The owner built this from zero technical background using AI assistance. This is a real product with real stakes — treat every decision as production-grade.

## About The Owner

- Non-technical founder building solo with AI assistance
- Has no programming background — relies entirely on Claude Code as technical SME
- Invested last of savings into this project — ~2 months runway remaining
- Needs strategic architecture advice, not just code execution
- When something seems risky or wrong, speak up proactively — don't just execute blindly
- Help see around corners: security, scalability, cost, UX pitfalls
- If a prompt asks for something that would create tech debt or break existing work, flag it before implementing

## Design System (V11)

```
Page bg:         #070a0f
Surface:         #0a0d14
Surface 2:       #0e1320
Border dim:      rgba(255,255,255,0.06)
Orange:          #F97316
Text white:      #eef4f8
Text sub:        #7a8e9e
Text dim:        #5a6e7e
Text muted:      #3a4e60
Gold:            #f0a030
Green:           #20c060
Font display:    Rajdhani, sans-serif
Font condensed:  Barlow Condensed, sans-serif
Font body:       Barlow, sans-serif
Font mono:       JetBrains Mono, monospace
```

### Rules

- ALL inline styles. No Tailwind classes, no CSS variables (`var(--xxx)`).
- No emojis anywhere. Use SVG icons.
- No card wrappers (`card-v3`, `card-v3-lift`).
- No animation classes (`page-enter`, `stg`, `v3-stagger`).
- No font weights 800/900/extrabold/black.
- Orange reserved for: primary actions, unread states, rank highlights, verified status.
- Dense, efficient layouts. Rows and lists, not cards.

## Database (Supabase)

- **Project ref:** `qxnnvnllwbykjzxqvqfi`
- **URL:** `https://qxnnvnllwbykjzxqvqfi.supabase.co`

### Tables That Are Easy To Confuse

| What you want | Correct table | NOT this |
|---|---|---|
| Sticker definitions (120 rows) | `sticker_catalog` | `bumper_stickers` (legacy transaction table) |
| User-to-user follows | `follows` | `vehicle_follows` |
| User-to-vehicle follows | `vehicle_follows` | `follows` |
| Spot count column on vehicles | `spots_count` | `spot_count` (does not exist) |
| Vehicle badges (sticker tiers) | `vehicle_badges` | `user_badges` (different — user achievement badges) |
| Sticker count aggregation | `vehicle_sticker_counts` keyed by `(vehicle_id, tag_name)` | NOT `sticker_id` |

### Columns That Do NOT Exist On `vehicles`

- `city` — does not exist
- `spot_count` — use `spots_count`
- `updated_at` — does not exist
- `owner_proof_url` — does not exist

### Vehicle Column Constants (`src/lib/vehicles.ts`)

Three named exports control what gets selected. Every vehicle query MUST use one of these (never inline columns, never SELECT *):

- `VEHICLE_PUBLIC_COLUMNS` — No plate fields. For: feed, rankings, search results, public profiles.
- `VEHICLE_PLATE_VISIBLE_COLUMNS` — Adds `plate_number`, `plate_state`. For: plate search confirmation, spot flow, vehicle detail page.
- `VEHICLE_OWNER_COLUMNS` — Adds `verification_status`, `claimed_at`. For: garage, owner profile.

Every vehicle query should have a comment: `// PLATE: hidden — public surface` or `// PLATE: visible — spot flow` or `// PLATE: owner context`.

### VIN Rule

VIN fields (`vin`, `vin_raw_data`, `vin_*`) are **write-only** from the frontend. They are written during the claim flow in `VinClaimModal.tsx` and NEVER read back or displayed. Do not add VIN fields to any SELECT query.

## Sticker System

- `giveSticker()` in `src/lib/stickerService.ts` is the SINGLE write path for stickers
- It writes to `vehicle_stickers`, upserts `vehicle_sticker_counts`, triggers reputation, and evaluates badges
- Sticker definitions come from `sticker_catalog` table (with `bumper_stickers` fallback)
- `vehicle_badges` stores tier badges: `badge_id` is TEXT (sticker name like "Head Turner"), not a UUID
- Tier system: Bronze (1) / Silver (5) / Gold (10) / Platinum (20) unique givers

## Reputation System

- `calculateAndAwardReputation()` in `src/lib/reputation.ts` is the main entry point
- It calls `award_motorate_points` RPC with params: `p_user_id, p_action, p_points, p_reference_type, p_reference_id`
- Vehicle RP is stored on `vehicles.reputation_score` (per-vehicle, not per-user)
- Rankings sort by `vehicles.reputation_score DESC`

## Auto.dev Plate Lookup

- Edge function: `supabase/functions/lookup-plate/index.ts`
- Client: `src/lib/plateToVinApi.ts` calls the edge function (NOT Auto.dev directly — CORS)
- Edge function secret: `AUTO_DEV_API_KEY` (set via `supabase secrets set`)
- Free tier: 1,000 lookups/month

## Key File Locations

- `src/lib/vehicles.ts` — Column constants + claim functions
- `src/lib/stickerService.ts` — Canonical sticker write path
- `src/lib/plateToVinApi.ts` — Plate lookup client
- `src/lib/reputation.ts` — Reputation system
- `src/config/badgeConfig.ts` — BADGE_TIER_THRESHOLDS, BADGE_TIER_COLORS
- `src/types/spot.ts` — SpotWizardData type
- `src/types/garage.ts` — GarageVehicle type

## Before Making Changes

1. Read the files you're about to modify IN FULL before writing code
2. Run `npx tsc --noEmit` after every change
3. Never introduce `SELECT *` on vehicles
4. Never add VIN fields to frontend reads
5. Use the correct column constant for the context
6. Check if a migration exists before assuming a column/table is live
