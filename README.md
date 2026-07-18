# SDLE Study Path (KSA)

Open-source browser coach for the **Saudi Dental Licensure Examination (SDLE)** (SCFHS / Prometric-style prep).

**Live app (free GitHub Pages):**  
https://xxxova2.github.io/sdle-study-path/

Same experience as running locally: all tabs, full readings, MCQs/quizzes. Videos open on **Google Drive**.

## Where is Endodontics?

**Endo is its own subject — not inside Restorative.**

| Place in the app | What to open |
|------------------|--------------|
| **Today / All days → Day 6** | Lesson: *Endodontics + dental trauma* (`focus: endo`) |
| **Extra practice / MCQs** | Topic filter / buttons labeled **Endo** (pool `endo`, ~300 Q) |
| **Pass plan / Progress** | Endo shown as its own blueprint slice (~17%) |

Restorative days are **Days 1–4** (operative, fixed, RPD/CD, resto mega). Day 5 = Perio. Day 6 = **Endo**.

## Run on your computer

```bash
cd sdle-study-path   # or sdle-prep
python3 -m http.server 8765
```

Open **http://localhost:8765** and hard-refresh (`Ctrl+Shift+R`).

## Deploy package (optional)

```bash
bash scripts/pack_deploy.sh   # → dist/ (~2 MB)
```

Repo root is already the live SPA (GitHub Pages serves it). `dist/` is a copy without tooling.

Does **not** ship in git: `data/raw` PDFs, local video files, `node_modules`.

## How to use (7 plan tabs)

Top bar always shows: **Today · All days · Pass plan · Always-comes · Extra practice · MCQs · Progress**. Focus mode does **not** hide these tabs.

Pick **14-day (blitz)** or **30-day (spaced)** on Today / Progress — same 14 deep lessons, different calendar pacing toward **≥80% practice**.

| Menu | What it is |
|------|------------|
| **Today** | Main path — mode coach (learn/volume/review/mock/light) + steps adapt to track |
| **All days** | Jump calendar days (14 or 30) |
| **Pass plan** | How to pass: free points, resto volume, mocks, emergency order |
| **Always-comes** | Free-point rules + MCQ drill |
| **Extra practice** | **50 / 100 / 150 / ALL** by subject + free points + timed mocks |
| **MCQs** | Full-pool tests by subject · Show answer only · honest why + SCFHS book titles |
| **Progress** | Practice readiness gates · score · wrong book · history |

### SPA integrity gate

```bash
bash scripts/check_spa_invariants.sh   # nav never hidden · script order · bank floor
```

Design notes: `docs/DESIGN-chrome-sync-ui.md`

### Every content day

1. **Read** — full ADHD lessons in the app (Days **1–9** are full-depth; each 45′ block is active study, not a 3′ skim)  
2. **Watch** — only listed video files (paths verified)  
3. **Cards** — flashcards  
4. **Quiz** — multi-block **50 / 100 / 150** (not 20)  
5. **Mock** when scheduled — timed exam pace  
6. **Always-comes** skim  
7. Tick **I finished Day X**

### Lesson depth gate (prevents fake 45‑min blocks)

```bash
python3 scripts/audit_lesson_depth.py   # must PASS after any reading edit
```

Content days 1–9 must be ≥~3,200 words / ≥~22k chars, and every claimed **read** pomodoro must have enough text for active study (≥55% of the minutes claimed).

### Exam Q&A inside the lesson (Days 1–9)

After each main **read block** you get:

1. **How SDLE asks this** — exam packaging (stem shape, distractors, bank signal)  
2. **5 full MCQs** — a/b/c/d · cover the answer · open **Answer + hinge**  

| Day | Blocks | Qs | Topics |
|-----|--------|----|--------|
| 1 | A · B | 10 | operative + materials/pulp/IC |
| 2 | A · B · C | 15 | prep/ferrule · cement/failures · implants/medical |
| 3 | A · B · C | 15 | Kennedy/RPI · connectors/CD · impressions/gypsum |
| 4 | A · B | 10 | resto integration traps · pace/wrong-book |
| 5 | A · B · C | 15 | 2017 stage/grade · SRP · peri-implant/enlargement |
| 6 | A · B · C | 15 | pulp/apical · irrigants · trauma/apex |
| 7 | A · B · C | 15 | dry socket/3rd molars · Ludwig/MRONJ/LA · toxicity |
| 8 | A · B · C | 15 | white/red/biopsy · bone/MRONJ · IC/ethics |
| 9 | A · B · C | 15 | Angle/OJ · space maintainers · pedo pulp/F/trauma |

**125** in-lesson exam Qs total. Same shape as أبطال/Prometric free points. Audit gates stems (≥12 words) + hinges (≥8 words) + 4 options; answers scrambled across a–d.

**Interactive scoring:** tap **a/b/c/d** in each block → green/red lock · hinge auto-opens · block score (e.g. 4/5) · counts toward daily MCQ goal · saved in browser (`exam_qa` on Progress). **Reset block** to re-drill.

### ADHD tools (in app)

- Sticky **pomodoro** bar: **45 min focus / 5 min break** · Start/Pause/Reset  
- **Focus mode** hides nav chrome  
- **Daily MCQ goal** bar (default 150) + session Q counter  
- Do **Block 1 → break → Block 2 → break → Block 3**  
- Target **100–200 MCQs/day** on content days. Exam is **200 MCQs**.

## Bank size (this install)

- **~2300+** MCQs (stream + free-point pass pack)  
- Restorative is the largest pool (~40% of exam weight)  
- **Free-point bank** (`source: always`) — drill from **Pass plan** or Always-comes  

Sources: always-comes, أبطال extracts, premium boosts, Google Doc stream, pass free-point pack.

### Source-backed workflow (videos + Drive + stream)

Public Drive links and the local `prometric/` tree are the video/PDF truth. Do **not** trust folder URLs without listing them.

```bash
python3 scripts/build_video_catalog.py    # disk → video_catalog.json (part 1→2→3)
python3 scripts/import_stream_mcqs.py --merge
python3 scripts/audit_sources.py          # master gate
python3 scripts/audit_videos.py
python3 scripts/audit_lesson_depth.py
```

Docs: `data/raw/SOURCE_WORKFLOW.md` · `SOURCE_REGISTRY.json` · `DRIVE_SOURCES_READ.md`

## Print packs

`print/` Word docs (rebuild: `node scripts/build_print_docx.js`):

- `01_always_comes.docx` · `02_14_day_plan.docx` · `03_flashcards.docx` · `04_day_cheatsheets.docx`

## Agent skill

Project skill **`/sdle-day`** expands any day to the quality bar (full reading + MCQs + videos).

## Videos (all 52 verified)

Base: `/data/prometric/prometric/` · labels show **`1/N · … · VERIFIED`** in watch order.

| Day | Folders (sequence) | # |
|-----|--------------------|--:|
| 1 | operative 19→20→21 | 7 |
| 2 | prostho 9→10→11 | 8 |
| 3 | prostho 12→13→14 | 7 |
| 4 | none (practice) | 0 |
| 5 | perio 5→6→7→8 | 8 |
| 6 | endo 1→2→3→4 | 4 |
| 7 | surgery 15→16→17→18 | 10 |
| 8 | path 23→24 + ethics | 6 |
| 9 | ortho and pedo 22 | 2 |

Re-audit: `python3 scripts/audit_videos.py` (must PASS). Exact on-disk filenames kept (typos included) so **Copy path** works.

## Target

≥ **80%** practice accuracy before exam day (pass scaled ~542/800).

## Disclaimer

Community / generated teaching items can err. Verify critical clinical facts. Not affiliated with SCFHS/Prometric.
