---
name: project-overview
description: Likh tech stack, monorepo structure, key patterns (fully rebranded from Docmost)
metadata:
  type: project
---

**Likh** is a fully rebranded fork of Docmost - a team collaboration platform. All "Docmost" references have been replaced with "Likh".

Stack: NestJS (Fastify) + Kysely ORM (PostgreSQL) backend, React + Vite + Mantine UI v8 + TanStack React Query v5 frontend.

Monorepo: pnpm workspaces with Nx. Apps in `apps/server` and `apps/client`.

Key patterns:
- `@Global()` DatabaseModule makes all repos available without re-importing
- Integration settings (LiveKit, Jitsi, mail) stored encrypted in `integration_settings` table; `IntegrationSettingsService.firstNonEmpty()` falls back from DB to env vars
- JWT guards on all endpoints; `AuthUser` + `AuthWorkspace` decorators
- Kysely helpers: `jsonObjectFrom`, `jsonArrayFrom` for nested relations
- TanStack React Query cache invalidation pattern on mutations
- TipTap editor used for comments, pages, and mail compose
- LiveKit `VideoConference` and Jitsi `JitsiMeeting` have built-in screen sharing

**Why:** User is building a complete team collaboration platform with chat, projects, calendar, mail, video calls.
**How to apply:** Always follow existing patterns (Kysely for DB, Mantine for UI, existing repo/service patterns).
