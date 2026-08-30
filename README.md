# SpeakBetter — Your Personal English Coach

Practice speaking English: read a sentence, hear the model pronunciation, record
yourself, and get an instant word-by-word breakdown with coaching tips.

Then compare your recording against the model side by side, practice sentences
you type yourself, and get something to work on next even when you scored 100.

**The whole application runs in the browser.** There is no server, no account,
no database, and no API key. Your voice is never uploaded anywhere by this app.

```
Choose a level → See a sentence → Listen → Record → Analyze
        ↑                                              ↓
    Next sentence ←──── Try again ←──── Score + feedback
```

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, build to `dist/`, then generate deploy files |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run check` | Tests followed by a full production build |

**Use Google Chrome or Microsoft Edge.** Speech recognition is a browser
feature and Firefox does not implement it. See [Browser support](#browser-support).

---

## How it works

Recording and recognition run off a single microphone permission, then the
transcript flows through three pure functions:

```
       ┌──────────────────── Browser ────────────────────┐
       │                                                 │
 You ──┤  MediaRecorder ──── timer, level meter,         │
speak  │                     length cap, playback        │
       │                                                 │
       │  SpeechRecognition ──── transcript              │
       │          │                                      │
       │          ▼                                      │
       │  normalize()   "I think, this is good!"         │
       │          │     → ["i","think","this","is","good"]
       │          ▼                                      │
       │  compare()     word-level Levenshtein alignment │
       │          │     → per-word verdict + score       │
       │          ▼                                      │
       │  coach()       rule lookup → tips + feedback    │
       │          │                                      │
       │          ▼                                      │
       │  Result card ──── localStorage progress         │
       └─────────────────────────────────────────────────┘
```

### The comparison engine

Both the target sentence and the transcript go through identical
normalization — lowercased, punctuation stripped, contractions expanded
(`I'd` → `I would`), digits spelled out (`3` → `three`). This removes a whole
class of false errors caused by transcription style rather than speaking.

The two word sequences are then aligned with **word-level Levenshtein distance
with a backtrace**, producing four kinds of operation:

| Operation | Shown as | Error weight |
| --- | --- | --- |
| match | `✓` word spoken correctly | — |
| substitute | `⚠` word sounded different | 1.0 |
| delete | `⚠` word missed | 1.0 |
| insert | `+` extra word added | 0.5 |

Substituting two similar-looking words (`think` / `tink`) costs less than
substituting unrelated ones, so the aligner treats a mispronunciation as *one
imperfect word* rather than a deletion plus an insertion. Similarity is
character-level edit distance; above 0.5 the words are read as the same word
pronounced imperfectly.

### Scoring

```
score = 100 × (1 − weighted errors ÷ words in the target)
```

Roughly, **the percentage of the passage you said correctly**.

This is normalized by length rather than using fixed per-error penalties, and
that matters once paragraphs are involved. Under the fixed scheme (start at
100, −10 per slip), a forty-word paragraph read with ten slips scores **zero** —
even though three-quarters of it was right. Normalizing also makes a slip in a
three-word sentence and a slip in a fifty-word paragraph weigh proportionally,
so scores are comparable across levels.

An extra word weighs half: adding a word still shows you produced the target
text, whereas dropping one means part of it was never said.

It is labelled **Speaking Match**, not a pronunciation score — it measures how
closely the recognizer's transcript matches the target text, which is a useful
practice signal but not a validated pronunciation assessment.

### The coaching engine

A two-layer lookup in `src/data/pronunciationRules.ts`, no model of any kind:

1. **Word rules** — a tip written for one specific word (~38 entries covering
   TH, R, V, W, L, SH, ZH and multi-syllable words).
2. **Sound rules** — regex patterns that catch any word containing a tricky
   sound, so words with no hand-written entry still get useful help.

At most three tips appear at once, one per distinct sound.

### The suggestion engine

The coaching engine explains what went wrong. The suggestion engine answers a
different question — what should you work on next? — and it runs on every
attempt, so a perfect score still leaves you with something to try.

Suggestions come only from signals actually measured, never from a guess about
pronunciation quality:

| Signal | Source | Suggests |
| --- | --- | --- |
| Recognizer confidence | `SpeechRecognition` result | Clearer articulation |
| Speaking pace | Recording duration ÷ word count | Faster or slower delivery |
| Rule-backed word said correctly | Sentence text + coaching rules | A sound to keep polishing |
| Long sentence read well | Word count + score | Linking words together |
| High score | Score | Moving up a level |

**Pace is measured carefully rather than naively.** A recording includes the
gap between clicking Record and starting to speak, plus the ~1 s of silence
Chrome waits through before deciding you have finished — so a fixed 1200 ms is
subtracted first. Sentences under six words get no pace advice at all, because
that overhead dominates whatever is left. Without both corrections, *"I like
coffee"* spoken normally in three seconds computes as 60 wpm and gets wrongly
nagged for being slow. Thresholds are wide (below 75 wpm, above 190 wpm) so
only clear extremes are remarked on.

### Sentences and paragraphs

Beginner is single sentences. **Intermediate and Advanced are paragraphs** of
two to four sentences, because reading connected speech — carrying intonation
across a sentence boundary, breathing in sensible places — is a different skill
from reading one sentence in isolation.

Two things had to change to support that:

- **The recording budget scales with length**: `6 s + 1.2 s per word`, floored
  at 15 s and capped at 3 minutes. A beginner sentence gets 15 s; a 39-word
  advanced paragraph gets 53 s. The per-word rate is set for a learner reading
  aloud — roughly 50 words a minute — rather than for conversational pace.
- **Recognition runs in continuous mode** above twelve words. This is not
  optional — with it off, the recognizer treats the first pause as the end of
  the utterance, so on a three-sentence paragraph it would transcribe only the
  opening sentence and report everything after the first full stop as missing.

Single sentences keep continuous mode off, which preserves the nice behaviour
of stopping automatically the moment you finish speaking.

### Your own sentences

Any text you type — up to 400 characters, so a paragraph is fine — gets the
same treatment as a library item: same normalization, alignment, scoring, and
coaching. The last five are remembered in localStorage so you can jump back to
them without retyping.

You can reach it from the home page, from the practice page before recording,
or from the result card afterwards.

---

## Project structure

```
src/
├── components/
│   ├── Header.tsx            Brand bar and the "3 / 10" counter
│   ├── ExerciseCard.tsx      The sentence, with Listen / Slowly
│   ├── RecordButton.tsx      Record button and the live recording panel
│   ├── ResultCard.tsx        Score, words, feedback, tips, suggestions, compare
│   ├── WordResult.tsx        One word with its ✓ / ⚠ mark
│   ├── CustomSentenceCard.tsx  Type your own sentence
│   └── ProgressCard.tsx      Statistics and recent history
│
├── pages/
│   ├── Home.tsx              Title, level picker, progress
│   └── Practice.tsx          The practice loop
│
├── engine/                   Pure functions, no I/O, fully unit-tested
│   ├── normalize.ts          Text normalization and tokenization
│   ├── comparison.ts         Alignment and scoring
│   ├── coaching.ts           Rule lookup and feedback text
│   └── suggestions.ts        What to work on next
│
├── services/
│   ├── api.ts                analyzeSpeech() — the seam a server would sit behind
│   ├── tts.ts                Text-to-speech
│   ├── progress.ts           localStorage history and statistics
│   └── customSentences.ts    Recently used custom sentences
│
├── hooks/
│   └── useSpeechRecorder.ts  MediaRecorder + SpeechRecognition controller
│
├── data/
│   ├── exercises.ts          30 sentences across three levels
│   └── pronunciationRules.ts Coaching rules
│
├── types.ts
├── App.tsx
└── styles.css
```

---

## Design decisions

### Why there is no backend

The original design put a FastAPI service behind `POST /api/analyze`. Of the
four things that service did, three need no server at all: serving the exercise
list is a static JSON read, and the comparison and coaching engines are pure
text functions. Only speech-to-text genuinely required one.

Using the browser's own speech recognition removes that last reason, and the
result is strictly better for this project:

- **Nothing to keep running.** No cold starts on a free tier, which matters
  when a reviewer opens the URL once and expects it to respond immediately.
- **No API key to leak or pay for.**
- **Better privacy.** Audio is never uploaded by this app.
- **Free static hosting**, anywhere.

The cost is browser support, covered below.

`analyzeSpeech()` in `src/services/api.ts` keeps the request/response shape from
the original API design and is the only place that knows where analysis
happens, so moving the pipeline back behind HTTP later means changing one
function.

### Privacy

Recorded audio stays in browser memory as a `Blob`, is used only for the timer,
the level meter and optional self-playback, and is released with
`URL.revokeObjectURL` as soon as you retry or move on. Nothing is written to
disk and nothing is uploaded by this app.

One caveat worth stating plainly: Chrome's `SpeechRecognition` implementation
sends audio to Google's speech service for transcription. That is the browser's
behaviour, not this app's, but "runs in your browser" does not mean "audio never
leaves your device."

### Reliability

Every failure mode in the requirements is handled with a specific message:
microphone permission denied, no microphone found, empty recording, nothing
recognized, network unavailable, and speech-service failure. Recordings run to
a budget of at least 15 seconds and at most 3 minutes, and if recognition goes
quiet the app settles after a 5-second grace period rather than hanging.

Storage failures are non-fatal — in private browsing, practice still works, it
just is not remembered.

---

## Browser support

| Browser | Listen (TTS) | Record | Recognition |
| --- | --- | --- | --- |
| Chrome (desktop) | ✅ | ✅ | ✅ |
| Edge (desktop) | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ⚠️ partial |
| Firefox | ✅ | ✅ | ❌ not implemented |

In an unsupported browser the app detects this on load, explains it, and leaves
the sentences and Listen button working. Recognition also needs an internet
connection.

---

## Deployment

**See [DEPLOYMENT.md](DEPLOYMENT.md)** for the full guide: buying a domain,
choosing a host, DNS records, and a post-deploy checklist.

The short version:

```bash
# 1. Set your domain
#    .env  ->  VITE_SITE_URL=https://yourdomain.com

# 2. Build
npm run check     # tests, then production build into dist/

# 3. Upload dist/ to any static host
```

The repo ships ready-made config for Netlify (`netlify.toml`), Vercel
(`vercel.json`), Cloudflare Pages (`public/_headers`), and GitHub Pages
(`.github/workflows/deploy.yml`), each with security headers and cache rules.
A post-build step writes `sitemap.xml`, the robots `Sitemap:` line, and the
GitHub Pages `CNAME` from your configured domain.

Serve it over **HTTPS** — browsers only grant microphone access on a secure
origin (`localhost` is exempt for development). Every host above issues a
certificate automatically.

Routing is hash-based, so no SPA rewrite rules are needed, and `base` is `./`
so the build also works from a subpath such as
`https://user.github.io/speakbetter/`.

---

## Tests

```bash
npm test
```

86 tests covering the parts worth pinning down:

- **Normalization** — punctuation, case, contractions, digits, curly quotes,
  hyphens, empty input.
- **Alignment** — near-misses align as substitutions, dropped and added words
  are detected, both sequences reconstruct in order.
- **Scoring** — the normalized formula, the 0 floor, the empty-target guard,
  and that the same number of errors scores higher in a longer passage.
- **Comparison** — dropped words, added words, exact readings, and paragraphs.
- **Documented examples** — the worked examples printed in the design document
  are asserted verbatim, so an engine change that would make the document
  wrong fails the build instead of leaving stale examples behind.
- **Coaching** — word rules, pattern fallback, feedback wording, tip cap.
- **Suggestions** — pace maths including the short-sentence guard, confidence
  handling (0 means "not reported", not "bad"), and the guarantee that a
  perfect score still produces advice.
- **Custom sentences** — validation and that they score identically to library
  sentences.
- **Content** — 30 items, unique ids, 10 per level, Beginner single sentences
  and the higher levels paragraphs, and every item scores 100 when read back
  exactly.
- **Rendering** — Home, Practice, ResultCard and ProgressCard render without
  crashing and contain the expected content.

Interactive audio behaviour — microphone permission, recording, recognition —
is verified manually in a browser, since it needs real hardware and a real
speech service.

---

## Requirements coverage

| | Requirement | Where |
| --- | --- | --- |
| FR-1 | Select difficulty | `Home.tsx`, level chips in `Practice.tsx` |
| FR-2 | Display sentence | `ExerciseCard.tsx` |
| FR-3 | Play correct pronunciation | `services/tts.ts` (normal and slow) |
| FR-4 | Record microphone input | `hooks/useSpeechRecorder.ts` |
| FR-5 | Submit for analysis | Automatic on stop |
| FR-6 | Speech-to-text | Browser `SpeechRecognition` |
| FR-7 | Compare against target | `engine/comparison.ts` |
| FR-8 | Generate score | `scoreAlignment()` |
| FR-9 | Identify problems | Missing, extra, and mismatched words |
| FR-10 | Provide coaching | `engine/coaching.ts` |
| FR-11 | Retry | Try Again on the result card |
| FR-12 | Progress | `services/progress.ts` |
| FR-13 | Replay own recording | Compare block in `ResultCard.tsx` |
| FR-14 | Custom sentence or paragraph | `CustomSentenceCard.tsx`, `analyzeText()` |
| FR-15 | Improvement suggestions | `engine/suggestions.ts` |

---

## Tech stack

React 18 · TypeScript · Vite 6 · Vitest · Web Speech API · MediaRecorder API ·
localStorage. No UI framework, no state library, two runtime dependencies.
