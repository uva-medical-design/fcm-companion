# FCM Companion

**A clinical reasoning platform for medical education -- built by medical students with no coding experience.**

> Designed and built during the [Health Design Sprint](https://github.com/uva-medical-design/health-design-sprint) at UVA School of Medicine, February 2026.

<!-- screenshot placeholder -- MATT will add -->

## What It Does

FCM Companion helps medical students develop clinical reasoning skills through their Foundations of Clinical Medicine (FCM) course:

- **Differential Diagnosis Practice** -- Submit differentials with confidence ratings, receive AI-generated feedback highlighting can't-miss diagnoses and VINDICATE coverage gaps
- **OSCE Preparation** -- Three-phase flow (Door Prep, SOAP Note, Feedback) with PE maneuver autocomplete, evidence-to-diagnosis linking, highlightable text annotations, and Socratic AI chat
- **Plan Ahead** -- Pre-session preparation with AI-generated history questions (Claude Haiku), PE planner, Stanford Medicine 25 exam videos, and session countdown
- **Try a Case** -- 324 practice cases from AgentClinic in three modes: Essential, Full Case, and Simulation (4-step connected flow with AI semantic matching)
- **Faculty Dashboard** -- Aggregated diagnostic patterns, VINDICATE coverage grid, and projectable session presentation mode
- **Design Lab** -- AI-powered theme extraction from screenshots; students customize the entire app's design tokens live

## Try It

**Live:** [fcm-companion.vercel.app](https://fcm-companion.vercel.app)

Click **"Try as Demo Student"** on the login page, or add `?demo=true` to any URL. Demo mode works without authentication and includes sample cases. The path `?demo=true` -> Try a Case -> Simulation mode works with zero database calls.

## Built With

- **Framework:** Next.js 16, TypeScript, Tailwind v4
- **UI:** shadcn/ui, Lucide icons
- **Database:** Supabase (Postgres + Row Level Security)
- **AI:** Anthropic Claude -- Sonnet for feedback and OSCE evaluation, Haiku for plan questions, Vision for design extraction
- **PWA:** Serwist service worker (installable on mobile)
- **Deployment:** Vercel

## The Story

This app was built by 8 fourth-year medical students with zero prior coding experience, using the [Health Design Sprint](https://uva-medical-design.github.io/health-design-sprint/) methodology. It evolved through 9 major versions over 10 days -- from a basic differential submission form to a full clinical reasoning platform with AI feedback, OSCE preparation, and a design system lab.

Three students contributed directly to the codebase:

- **Matt Nguyen** -- OSCE preparation system (3-phase flow, Socratic chat, evidence mapping, PE maneuver autocomplete)
- **Farah Kabir** -- Feedback page redesign (interactive VINDICATE coverage, clinical reasoning frameworks, danger highlighting)
- **Maddie Kwarteng** -- Plan Ahead module (AI history questions, PE planning, resource consolidation, session countdown)

## Architecture

```
src/
  app/
    page.tsx                    # Roster picker login
    (student)/                  # Student route group (mobile shell + desktop sidebar)
      cases/                    # Case list + submission
      practice/                 # Try a Case (324 cases, 3 modes)
      osce/                     # OSCE Prep (door prep -> SOAP note -> feedback)
      plan/                     # Plan Ahead (pre-session preparation)
      notes/                    # Student notes + topic voting
      resources/                # Course resources + StatPearls links
      design-lab/               # AI theme extraction + gallery
    (faculty)/                  # Faculty route group (desktop sidebar)
      dashboard/                # Aggregated analytics
      present/                  # Projectable session slides
    api/                        # API routes (feedback, OSCE, themes, etc.)
  components/                   # Shared UI components
  data/                         # Static data (practice cases, clinical vocabularies)
  lib/                          # Utilities, Supabase client, feedback logic
  types/                        # TypeScript type definitions
```

## Development

```bash
npm install
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build (uses --webpack for Serwist PWA)
npm run data:process     # Regenerate practice cases from AgentClinic JSONL
npm run data:diagnoses   # Extract new diagnoses from practice cases
```

Requires environment variables for Supabase and Anthropic API access. Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

See [`.env.example`](.env.example) for required variables.

## License

[MIT](LICENSE)

## Related

- [Health Design Sprint](https://github.com/uva-medical-design/health-design-sprint) -- The methodology and course site
- [FCM Journey Mapper](https://github.com/hds-2026s-digital-01/fcm-journey-mapper) -- Research-to-PRD pipeline built during the sprint
- [Session Explorer](https://github.com/uva-medical-design/session-explorer) -- Video search and AI narrative tool for course recordings

---

*Built during the Health Design Sprint at the University of Virginia School of Medicine, February 2026.*
