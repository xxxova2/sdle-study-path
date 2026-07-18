# SDLE Study Path (KSA)

Free, open-source browser coach for the **Saudi Dental Licensure Examination (SDLE)**  
(SCFHS / Prometric-style prep — **not** official exam software).

| | |
|--|--|
| **Live app** | https://xxxova2.github.io/sdle-study-path/ |
| **Source code** | https://github.com/xxxova2/sdle-study-path |
| **Intro letter** | [INTRO.md](./INTRO.md) |
| **Read feedback** | [GitHub Issues · feedback](https://github.com/xxxova2/sdle-study-path/issues?q=is%3Aissue+label%3Afeedback) |

Works on **desktop and mobile browsers**. Same content as local study: readings, MCQs, quizzes, plans. Videos open on **Google Drive**.

---

## Introduction (short)

This app is a step-by-step path so you do not wander between random PDFs.

1. Pick a plan (14–90 days) on **Today**  
2. **Read** the lesson in the app  
3. **Watch** only the listed videos (Drive)  
4. **Cards + MCQs** until accuracy trends **≥80%**  
5. Use **Feedback** if something is wrong — the maintainer can read it and fix it  

Full welcome letter: **[INTRO.md](./INTRO.md)**

---

## Tabs

| Tab | Purpose |
|-----|---------|
| **Today** | Your day path (read → video → cards → quiz) |
| **Days** | Jump calendar days |
| **Pass** | How to pass (free points, volume, mocks) |
| **Always** | Always-comes free-point rules |
| **Extra** | Volume practice by subject |
| **MCQs** | Full-pool tests by subject |
| **Progress** | Score, wrong book, history |
| **Feedback** | Anyone can send notes; opens a GitHub Issue for the maintainer |

---

## Where is Endodontics?

**Endo is separate — not inside Restorative.**

- **Day 6** lesson: *Endodontics + dental trauma*  
- **Extra / MCQs → Endo** buttons  
- Days **1–4** = restorative only; Day **5** = perio  

---

## Run on your computer

```bash
git clone https://github.com/xxxova2/sdle-study-path.git
cd sdle-study-path
python3 -m http.server 8765
```

Open http://localhost:8765 and hard-refresh (`Ctrl+Shift+R` / mobile reload).

## Deploy package (optional)

```bash
bash scripts/pack_deploy.sh   # → dist/
```

GitHub Pages already serves the repo root (live link above).

**Not in git:** textbook PDFs (`data/raw/`), local video files, `node_modules`.

---

## Feedback (how it works)

1. User opens the **Feedback** tab in the app  
2. Writes a message and taps **Send feedback**  
3. A **GitHub Issue** opens (label `feedback`)  
4. **You** read issues here:  
   https://github.com/xxxova2/sdle-study-path/issues?q=is%3Aissue+label%3Afeedback  
5. Fix the app, push to `main` — site updates automatically  

Optional: save a draft on the device without sending.

---

## Mobile

- Viewport + safe-area for notched phones  
- Tabs scroll sideways if they do not fit  
- Larger tap targets for buttons and forms  
- Reading type sized for phone screens  

Use Safari or Chrome. Progress is stored **in that browser** (clearing site data clears progress).

---

## License & notice

- Software: [MIT](./LICENSE)  
- Study materials notice: [NOTICE.md](./NOTICE.md)  

Not affiliated with SCFHS or Prometric.
