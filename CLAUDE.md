# CLAUDE.md — FCM Companion

## Project Overview
FCM Companion is a mobile-first web app for UVA medical students to practice differential diagnosis during their Foundations of Clinical Medicine (FCM) course. Three components: Student App, Faculty Dashboard, Admin Panel.

## Stack
- **Framework:** Next.js 16, TypeScript, Tailwind v4
- **UI:** shadcn/ui components, Lucide icons
- **Database:** Supabase (project `zuksjgrkxyjpkatxeebg`, `fcm_` prefixed tables)
- **AI:** Anthropic SDK (claude-sonnet-4-6 for feedback + OSCE evaluation)
- **Deploy:** Vercel (auto-deploy from main)
- **Live:** https://fcm-companion.vercel.app

## Architecture
- `src/app/page.tsx` — Roster picker login
- `src/app/(student)/` — Student route group (mobile shell + desktop sidebar)
- `src/app/(faculty)/` — Faculty route group (desktop sidebar)
- `src/app/api/` — API routes (feedback, practice-feedback, submissions, notes, dashboard, osce)
- `src/lib/feedback.ts` — Deterministic comparison + AI narrative generation
- `src/data/practice-cases.ts` — 324 practice cases from AgentClinic (static JSON)
- `src/data/diagnosis-lookup.ts` — 256 diagnoses with abbreviation matching
- `src/types/` — All TypeScript types
- `scripts/` — Data processing scripts (process-agentclinic.ts, expand-diagnoses.ts)

## Key Patterns
- User context via localStorage (`fcm-user` key), no auth
- Autosave via `useAutosave` hook (500ms debounce to Supabase)
- VINDICATE framework: V-I-N-D-I-C-A-T-E (9 categories, "I2" key for Iatrogenic)
- Feedback: deterministic comparison first, then AI narrative (categorized bullets)
- Practice cases stored in localStorage (no Supabase FK dependency)
- Responsive layout: mobile bottom nav + desktop sidebar (md breakpoint)

## Database Tables
`fcm_users`, `fcm_cases`, `fcm_schedule`, `fcm_submissions`, `fcm_notes`, `fcm_settings`, `fcm_osce_responses`

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run data:process # Regenerate practice-cases.json from AgentClinic JSONL
npm run data:diagnoses # Extract new diagnoses from practice cases
```

## Version History
- **v1** (Feb 18): Full 3-part system — Student App, Faculty Dashboard, Admin Panel
- **v2.1** (Feb 19 AM): Pedagogical upgrade — autocomplete delay, fuzzy matching, reasoning field, two-phase feedback
- **v3** (Feb 19 PM): Clinical data integration (324 practice cases, 256 diagnoses), UX redesign (confidence rating, optional VINDICATE, bullet feedback, desktop sidebar, StatPearls links), Practice Library, Gamified Refresh Quiz

## Commit Style
`type: description` (feat:, fix:, chore:, docs:)
