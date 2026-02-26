# Session Vision — Zoom Session Analyzer

**Date:** 2026-02-26
**Status:** Approved
**Goal:** Extract visual context from Zoom recordings by cross-referencing transcripts with video, producing enriched markdown reports that capture what transcript-only analysis misses.

## Problem

Zoom VTT transcripts have excellent speaker separation and timing but miss visual elements: screen shares, UI demos, design explorations. When students demo features (e.g., Matt Nguyen's OSCE SOAP note flow, Maddie's Plan Ahead feature), the transcript captures the conversation *about* the demo but not *what was shown*. This makes it difficult for Claude Code to fully understand and integrate student work into the main app.

## Solution

A CLI tool that:
1. Parses VTT transcripts into structured cues
2. Detects "visual moments" via signal words in the transcript
3. Extracts frames from the video at detected timestamps using ffmpeg
4. Produces a self-contained markdown report with transcript + inline screenshots

## Architecture

```
~/Projects/fcm-companion-v9/tools/session-vision/
├── session-vision.ts          # Main entry + CLI
├── vtt-parser.ts              # VTT → Cue[]
├── signal-detector.ts         # Cue[] → CaptureWindow[]
├── frame-extractor.ts         # ffmpeg frame extraction
├── report-generator.ts        # Markdown assembly
├── signals/
│   └── demo-review.ts         # Default signal profile
└── package.json
```

### Pipeline

```
VTT → vtt-parser → signal-detector → frame-extractor → report-generator → .md
```

## Signal Detection

Three tiers of visual-activity signals:

**Tier 1 — Explicit screen share** (highest confidence):
- "let me share", "I'm gonna share", "stop share", "screen sharing"
- "can you see", "y'all seeing", "are you seeing"
- "let me show you", "let me pull up"

**Tier 2 — Spatial/visual language** (medium):
- "on the left", "on the right", "here's what", "this thing"
- "click on", "click into", "the screen"
- UI vocabulary: "tab", "button", "page", "sidebar", "preset", "theme"

**Tier 3 — Feature demonstration** (contextual):
- Domain terms in present tense: "it has the OSCE Prep", "it does the simulation"
- Speaker describing actions: "when you go back", "if you go to", "you should be able to"

### Capture Windows

Signals open a capture window. The window stays open while signals keep firing, closing after a configurable gap (default: 15s of no signals). Frames are extracted at a configurable interval (default: every 5s) within each window.

## CLI Interface

```bash
npx tsx session-vision.ts \
  --transcript path/to/recording.vtt \
  --video path/to/recording.mp4 \
  --output path/to/output.md \
  --interval 5 \
  --gap 15 \
  --dry-run  # show detected windows without extracting frames
```

## Output Format

Single markdown file with:
1. **Header** — session metadata (date, duration, participants)
2. **Timeline table** — quick skim of session events
3. **Visual Moment sections** — self-contained blocks with context quotes, frames, transcript
4. **Full transcript** — complete VTT reformatted as speaker-attributed paragraphs with visual moment markers inline

Frames stored in `frames/moment-NN/` subdirectories alongside the markdown.

Each Visual Moment section is designed to be independently copy-pasteable into Claude Chat or Claude Code for focused analysis.

## Dependencies

- TypeScript + tsx (dev only)
- ffmpeg (system binary, called via child_process)
- Zero npm runtime dependencies

## Signal Profiles (Future)

The `--mode` flag selects a signal profile. v1 ships with `demo-review` only. Future profiles: `lecture` (slide transitions, "next slide"), `didactic` (teaching moments, Q&A), `design-review` (wireframes, mockups).

## Downstream Uses

1. Feed enriched report to Claude Code to understand student work and update demo app
2. Feed to Gamma for auto-generated presentation slides
3. Feed to Claude Chat for deeper conversational analysis
4. Archive as searchable session record (future: semantic embeddings)

## First Test Case

Day 7 session (Feb 24): Justin Massa guest lecture + v8 review. 144KB transcript, 1GB video. Expected to detect 3 capture windows (~60 frames total, ~30s extraction time).
