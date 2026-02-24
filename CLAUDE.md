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
- `src/app/(faculty)/present/page.tsx` — Projectable session dashboard (4 auto-advancing slides)
- `src/app/api/` — API routes (feedback, practice-feedback, match-elements, submissions, notes, dashboard, osce, sentiments, session-captures, extract-theme, themes)
- `src/lib/feedback.ts` — Deterministic comparison + AI narrative generation
- `src/data/practice-cases.ts` — 324 practice cases from AgentClinic (static JSON)
- `src/data/clinical-vocabulary.json` — 666 diagnoses with abbreviations, body_system, vindicate_category
- `src/data/diagnosis-lookup.ts` — Imports vocabulary JSON, exports `searchDiagnoses()` with scored matching
- `src/components/diagnosis-input.tsx` — Shared autocomplete input (3-char threshold)
- `src/components/diagnosis-row.tsx` — Shared diagnosis card (reorder, confidence, reasoning)
- `src/components/confidence-rating.tsx` — 1-5 confidence circle picker
- `src/components/feedback-narrative.tsx` — AI feedback renderer (bullet + prose formats)
- `src/types/` — All TypeScript types
- `scripts/` — Data processing and generation scripts

## Key Patterns
- User context via localStorage (`fcm-user` key), no auth
- Autosave via `useAutosave` hook (500ms debounce to Supabase)
- VINDICATE framework: V-I-N-D-I-C-A-T-E (9 categories, "I2" key for Iatrogenic)
- Feedback: deterministic comparison first, then AI narrative (categorized bullets)
- Practice cases stored in localStorage (no Supabase FK dependency)
- Practice mode 3-way toggle: "Essential" (default) / "Full Case" / "Simulation" — persisted in localStorage (`practice-mode` key, values: `differential`, `full`, `simulation`)
- Topic voting: stored in `fcm_notes` with `[TOPIC VOTE]` prefix and `is_sent_to_instructor: true`
- Responsive layout: mobile bottom nav + desktop sidebar (md breakpoint). Sidebar uses `h-dvh sticky top-0` to stay viewport-pinned with user info always visible.
- Student nav: Cases, Try a Case, OSCE Prep, Notes, Resources, Design Lab

- `src/sw.ts` — Serwist service worker for PWA

## Database Tables
`fcm_users`, `fcm_cases`, `fcm_schedule`, `fcm_submissions`, `fcm_notes`, `fcm_settings`, `fcm_osce_responses`, `fcm_quiz_scores`, `fcm_sentiments`, `fcm_session_captures`, `fcm_practice_events`, `fcm_themes`

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build (uses --webpack for Serwist PWA)
npm run data:process # Regenerate practice-cases.json from AgentClinic JSONL
npm run data:diagnoses # Extract new diagnoses from practice cases
npx tsx scripts/generate-vocabulary.ts  # Regenerate clinical-vocabulary.json (666 entries)
npx tsx scripts/build-vocabulary.ts     # Claude API-powered vocabulary expansion
npx tsx scripts/import-uva-cases.ts <dir> # Parse UVA case files → SQL INSERT statements
```

## Version History
- **v1** (Feb 18): Full 3-part system — Student App, Faculty Dashboard, Admin Panel
- **v2.1** (Feb 19 AM): Pedagogical upgrade — autocomplete delay, fuzzy matching, reasoning field, two-phase feedback
- **v3** (Feb 19 PM): Clinical data integration (324 practice cases, 256 diagnoses), UX redesign (confidence rating, optional VINDICATE, bullet feedback, desktop sidebar, StatPearls links), Practice Library, Gamified Refresh Quiz
- **v3.1** (Feb 19 late): Time-aware cases dashboard, Quick Refresh quiz, quiz score persistence
- **v4** (Feb 20 AM): Refocus on early M1 experience — autocomplete threshold 2→3 chars, hide OSCE nav, rename Practice→"Try a Case", hide OSCE data from practice, Random Case button, topic voting (feedback page + case page + dashboard aggregation), vocabulary expansion (268→666 entries with body_system/vindicate_category), practice dual-mode (Differential Only / Full Case), admin case creation UI, UVA case import script, shared component extraction (DiagnosisInput, DiagnosisRow, ConfidenceRating, FeedbackNarrative)
- **v5** (Feb 20 PM): Session dashboard (projectable 4-slide presentation at /present), quiz card quality (removed trivial cards, added differentiator + VINDICATE gap cards), auto-VINDICATE mapping in feedback, enhanced expert differential view (by tier with teaching points), student sentiment capture, feedback focus rotation, post-session quick capture, PWA conversion (Serwist service worker, manifest, installable)
- **v6** (Feb 23): Visual refresh — dark mode, muted palette, diagnosis input elevation, onboarding, demo mode, a11y fixes
- **v7** (Feb 23): OSCE expansion + Team INOVA design pattern integration — DDx drag-drop ranking (DdxRanking), confidence calibration chart (ConfidenceCalibration), decision journey timeline (JourneyTimeline), OSCE case browser with search/filter, structured OSCE rubric scoring (OsceRubric), OSCE history page (/osce/history), OSCE unhidden in nav, practice event logging (fcm_practice_events)
- **v7.1** (Feb 24): Essential/Simulation toggle — 3-way practice mode (Essential, Full Case, Simulation). Simulation mode adds connected 4-step flow: Case Review (vitals grid + presentation) → Gather (free-text H&P input + AI semantic matching via /api/match-elements) → Differential (DDx builder with ranking + confidence + reasoning) → Debrief Dashboard (summary, H&P annotated reveal, DDx evolution snapshots, confidence calibration, journey timeline, expert reasoning, teaching concepts). New components: SimulationFlow, SimulationProgress, CaseReviewStep, GatherStep, DebriefDashboard, DdxEvolution. Extended /api/practice-feedback for enriched simulation debrief.
- **v8** (Feb 24): Design Lab — AI-powered theme extraction. Upload screenshots (Mobbin, Dribbble, Maze), paste image URLs, or pick presets. Claude Vision extracts design tokens (colors, radius, mood). Tokens override CSS custom properties live across the entire app. Save/name/share themes with classmates. New components: ThemeExtractor, ThemePreview, ThemeGallery, ThemeCard. New context: DesignThemeProvider (persists in localStorage). New API routes: /api/extract-theme (Claude Vision), /api/themes (CRUD). New DB table: fcm_themes.

## Design Lab Architecture
- `src/app/(student)/design-lab/page.tsx` — Main Design Lab page (two-panel: extractor + gallery)
- `src/components/theme-extractor.tsx` — Upload/URL/preset input panel with 3 tabs
- `src/components/theme-preview.tsx` — Editable token display (color pickers, radius slider, mini preview card)
- `src/components/theme-gallery.tsx` — Shared gallery of saved themes from all students
- `src/components/theme-card.tsx` — Single theme card (swatches, name, author, "Try It" button)
- `src/lib/design-theme-context.tsx` — Context provider for CSS variable overrides (localStorage key: `fcm-design-theme`)
- `src/app/api/extract-theme/route.ts` — Claude Vision API for screenshot → design tokens extraction
- `src/app/api/themes/route.ts` — CRUD for saved themes in Supabase (GET/POST/DELETE)
- 4 presets: Clinical Sharp, Warm Rounded, Material You, Mono Minimal

## Simulation Architecture
- `src/components/simulation-flow.tsx` — 4-step orchestrator (state machine, localStorage persistence)
- `src/components/simulation-progress.tsx` — Horizontal progress bar (clickable completed steps)
- `src/components/case-review-step.tsx` — Step 1: vitals grid with abnormal highlighting, demographics, history
- `src/components/gather-step.tsx` — Step 2: free-text chip input + AI matching annotated reveal
- `src/components/debrief-dashboard.tsx` — Step 4: composite debrief (7 sections)
- `src/components/ddx-evolution.tsx` — DDx snapshot comparison display
- Simulation state persisted in localStorage key `sim-{practiceId}`
- Step 3 reuses existing DiagnosisInput, DiagnosisRow, DdxRanking

## Commit Style
`type: description` (feat:, fix:, chore:, docs:)
