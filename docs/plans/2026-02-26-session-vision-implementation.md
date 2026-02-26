# Session Vision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that extracts visual context from Zoom recordings by cross-referencing VTT transcripts with video files, producing enriched markdown reports with inline screenshots.

**Architecture:** Four-module pipeline: VTT parser → signal detector → frame extractor (ffmpeg) → report generator. Each module is a single TypeScript file with a clean interface. No npm runtime dependencies.

**Tech Stack:** TypeScript, tsx (runner), ffmpeg (system binary)

**Design doc:** `docs/plans/2026-02-26-session-vision-design.md`

---

### Task 0: Install ffmpeg

**Step 1: Install ffmpeg via Homebrew**

Run: `brew install ffmpeg`

**Step 2: Verify installation**

Run: `ffmpeg -version`
Expected: Version string, no errors

**Step 3: Verify frame extraction works**

Run:
```bash
ffmpeg -ss 00:01:00 -i "/Users/matthewtrowbridge/Projects/fcm-companion-v9/Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording_1956x1070.mp4" -frames:v 1 -q:v 2 /tmp/test-frame.png -y 2>&1 | tail -3
```
Expected: A PNG file at `/tmp/test-frame.png`. Open it to verify it's a real frame from the video.

---

### Task 1: Project scaffold + VTT parser

**Files:**
- Create: `tools/session-vision/package.json`
- Create: `tools/session-vision/vtt-parser.ts`

**Step 1: Create package.json**

```json
{
  "name": "session-vision",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx session-vision.ts"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: Install dependencies**

Run: `cd ~/Projects/fcm-companion-v9/tools/session-vision && npm install`

**Step 3: Write vtt-parser.ts**

Exports:
```typescript
export interface Cue {
  index: number;
  startTime: number;    // seconds (float)
  endTime: number;      // seconds (float)
  startTimestamp: string; // "HH:MM:SS.mmm" for display
  speaker: string;
  text: string;         // without speaker prefix
  raw: string;          // original line
}

export function parseVTT(filePath: string): Cue[]
```

Parse logic:
- Skip `WEBVTT` header
- Split on blank lines into blocks
- Each block: line 1 = cue index, line 2 = timestamps, line 3+ = text
- Extract speaker from `Speaker: text` pattern
- Convert `HH:MM:SS.mmm` to float seconds

**Step 4: Verify parser**

Run:
```bash
cd ~/Projects/fcm-companion-v9/tools/session-vision
npx tsx -e "
import { parseVTT } from './vtt-parser.ts';
const cues = parseVTT('../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording.transcript.vtt');
console.log('Total cues:', cues.length);
console.log('First cue:', JSON.stringify(cues[0], null, 2));
console.log('Last cue:', JSON.stringify(cues[cues.length-1], null, 2));
console.log('Unique speakers:', [...new Set(cues.map(c => c.speaker))]);
"
```
Expected: ~760 cues, speakers include "Matthew Trowbridge", "Matthew Nguyen", "justinmassa", "Derek Meyers", etc.

---

### Task 2: Signal detector

**Files:**
- Create: `tools/session-vision/signals/demo-review.ts`
- Create: `tools/session-vision/signal-detector.ts`

**Step 1: Write demo-review.ts signal profile**

Exports:
```typescript
export interface SignalMatch {
  tier: 1 | 2 | 3;
  signal: string;      // the pattern that matched
  weight: number;       // tier 1 = 3, tier 2 = 2, tier 3 = 1
}

export function matchSignals(text: string): SignalMatch[]
```

Contains the three tiers from the design doc. Case-insensitive matching. Returns all matches found in the text.

**Step 2: Write signal-detector.ts**

Exports:
```typescript
export interface CaptureWindow {
  startTime: number;
  endTime: number;
  startTimestamp: string;
  endTimestamp: string;
  signals: SignalMatch[];
  cues: Cue[];           // all cues within this window
  peakScore: number;      // highest cumulative score in window
}

export function detectWindows(cues: Cue[], gapSeconds: number): CaptureWindow[]
```

Logic:
- Walk through cues sequentially
- For each cue, run `matchSignals` on its text
- If matches found and no window is open → open a new window
- If matches found and window is open → extend the window
- If no matches and window is open → check if gap since last match exceeds `gapSeconds`; if so, close window
- Merge windows that are within `gapSeconds` of each other
- Return sorted list of windows

**Step 3: Verify detector with dry run**

Run:
```bash
cd ~/Projects/fcm-companion-v9/tools/session-vision
npx tsx -e "
import { parseVTT } from './vtt-parser.ts';
import { detectWindows } from './signal-detector.ts';
const cues = parseVTT('../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording.transcript.vtt');
const windows = detectWindows(cues, 15);
console.log('Detected', windows.length, 'capture windows:\n');
for (const w of windows) {
  console.log('Window:', w.startTimestamp, '→', w.endTimestamp);
  console.log('  Duration:', Math.round(w.endTime - w.startTime), 'seconds');
  console.log('  Cues:', w.cues.length);
  console.log('  Peak score:', w.peakScore);
  console.log('  Top signals:', w.signals.slice(0, 5).map(s => s.signal).join(', '));
  console.log();
}
"
```
Expected: Should detect windows around 01:18:20–01:22:30 (v8 demo) and possibly Justin Massa's slides sections. Review output and tune signal terms or gap if needed.

---

### Task 3: Frame extractor

**Files:**
- Create: `tools/session-vision/frame-extractor.ts`

**Step 1: Write frame-extractor.ts**

Exports:
```typescript
export interface ExtractedFrame {
  timestamp: string;     // "HH-MM-SS" for filenames
  displayTime: string;   // "HH:MM:SS" for report
  filePath: string;      // relative path to PNG
  timeSeconds: number;
}

export interface ExtractionResult {
  windowIndex: number;
  outputDir: string;     // "frames/moment-01/"
  frames: ExtractedFrame[];
}

export function extractFrames(
  videoPath: string,
  windows: CaptureWindow[],
  outputBase: string,     // directory to write frames into
  intervalSeconds: number
): ExtractionResult[]
```

Logic:
- For each window, create `frames/moment-NN/` directory
- Calculate frame timestamps: start, start+interval, start+2*interval, ..., end
- For each timestamp, run:
  ```
  ffmpeg -ss HH:MM:SS -i video.mp4 -frames:v 1 -q:v 2 frames/moment-NN/frame-HH-MM-SS.png -y
  ```
- Use `execSync` with `stdio: 'pipe'` to suppress ffmpeg output
- Return extraction results with file paths

**Step 2: Verify extraction on first window only**

Run:
```bash
cd ~/Projects/fcm-companion-v9/tools/session-vision
npx tsx -e "
import { parseVTT } from './vtt-parser.ts';
import { detectWindows } from './signal-detector.ts';
import { extractFrames } from './frame-extractor.ts';
const cues = parseVTT('../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording.transcript.vtt');
const windows = detectWindows(cues, 15);
// Extract only the first window as a test
const results = extractFrames(
  '../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording_1956x1070.mp4',
  [windows[0]],
  '../../Day 7/test-frames',
  5
);
console.log('Extracted', results[0].frames.length, 'frames to', results[0].outputDir);
results[0].frames.forEach(f => console.log(' ', f.displayTime, f.filePath));
"
```
Expected: PNG files in `Day 7/test-frames/moment-01/`. Open a few to verify they show actual screen content.

---

### Task 4: Report generator

**Files:**
- Create: `tools/session-vision/report-generator.ts`

**Step 1: Write report-generator.ts**

Exports:
```typescript
export interface ReportOptions {
  title: string;
  date: string;
  transcriptPath: string;
  videoPath: string;
}

export function generateReport(
  cues: Cue[],
  windows: CaptureWindow[],
  extractions: ExtractionResult[],
  options: ReportOptions
): string  // returns markdown content
```

Logic:
- Build header with session metadata
- Build timeline table: scan cues for speaker changes and visual moment starts
- For each visual moment:
  - Section header with time range, speaker, detected signals
  - Interleave transcript quotes with frame images
  - Match frames to nearest cues by timestamp
- Append full transcript as speaker-attributed paragraphs
  - Insert `**[Visual Moment N begins]**` / `**[Visual Moment N ends]**` markers
- Collapse consecutive cues from the same speaker into paragraphs

**Step 2: Verify report generation**

Run the full pipeline on Day 7 (see Task 5) and inspect the output markdown.

---

### Task 5: Main CLI entry point

**Files:**
- Create: `tools/session-vision/session-vision.ts`

**Step 1: Write session-vision.ts**

Minimal arg parsing (no library needed — just process.argv):
```typescript
const args = {
  transcript: '',   // --transcript
  video: '',        // --video
  output: '',       // --output
  interval: 5,      // --interval (seconds)
  gap: 15,           // --gap (seconds)
  dryRun: false,     // --dry-run
};
```

Pipeline:
1. Parse args from `process.argv`
2. `parseVTT(args.transcript)` → cues
3. `detectWindows(cues, args.gap)` → windows
4. Log detected windows summary
5. If `--dry-run`, stop here
6. `extractFrames(args.video, windows, outputDir, args.interval)` → extractions
7. `generateReport(cues, windows, extractions, options)` → markdown
8. Write markdown to `args.output`
9. Log summary: N windows, N frames, output path

**Step 2: Run dry-run on Day 7**

Run:
```bash
cd ~/Projects/fcm-companion-v9/tools/session-vision
npx tsx session-vision.ts \
  --transcript "../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording.transcript.vtt" \
  --video "../../Day 7/Session 1 + 2 - Justin Massa + v8 review/GMT20260224-150616_Recording_1956x1070.mp4" \
  --output "../../Day 7/session-7-enriched.md" \
  --dry-run
```
Expected: List of detected windows with timestamps and signal counts. Review and adjust signals/gap if needed.

**Step 3: Run full extraction on Day 7**

Run same command without `--dry-run`.

Expected: `Day 7/session-7-enriched.md` with inline screenshots. Open it and verify:
- Timeline table makes sense
- Visual moments capture the v8 demo walkthrough
- Frames show actual screen content (not just talking heads)
- Full transcript is readable at the bottom

**Step 4: Commit**

```bash
cd ~/Projects/fcm-companion-v9
git init  # if not already a repo
git add tools/session-vision/
git commit -m "feat: session-vision v0.1 — transcript-guided frame extraction from Zoom recordings"
```

---

### Task 6: Feed enriched report to Claude Code for demo app updates

This is the payoff. Not a code task — it's the workflow step.

**Step 1:** Open the enriched report (`Day 7/session-7-enriched.md`) and review the visual moments

**Step 2:** Identify the specific features visible in frames that are missing from the current FCM Companion:
- Matt's SOAP note flow (Door Prep → SOAP Note → Feedback)
- Matt's OSCE case browser with Resume sessions
- Maddie's Plan Ahead feature (pre-session checklist, exam videos, reading)

**Step 3:** Feed the enriched report + existing demo screenshots + Maddie's codebase snapshot to Claude Code in the fcm-companion project to update the demo app

---

## Task Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 0 | Install ffmpeg | 2 min |
| 1 | VTT parser | 10 min |
| 2 | Signal detector | 15 min |
| 3 | Frame extractor | 10 min |
| 4 | Report generator | 15 min |
| 5 | CLI entry point + run on Day 7 | 10 min |
| 6 | Feed to Claude Code for demo updates | ongoing |
| **Total** | | **~60 min** |
