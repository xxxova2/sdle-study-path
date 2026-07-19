# SDLE Study Path (KSA)

Free, open-source browser coach for the **Saudi Dental Licensure Examination (SDLE)**  
(SCFHS / Prometric-style prep — **not** official exam software).

| | |
|--|--|
| **Live app** | https://xxxova2.github.io/sdle-study-path/ |
| **Source code** | https://github.com/xxxova2/sdle-study-path |
| **Intro letter** | [INTRO.md](./INTRO.md) · [EN + AR post](./docs/INTRO_POST_EN_AR.md) |
| **Owner feedback inbox** | [ntfy topic](https://ntfy.sh/sdle-study-path-feedback-xxxova2-k7m9) (no login for students) |

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

**Simple mode (default):** **Today · Practice · Progress · More**  
Same content. Fewer choices so first-time students are not lost.

| Tab | Purpose |
|-----|---------|
| **Today** | Day path (read → video → cards → quiz) |
| **Practice** | Extra volume by subject |
| **Progress** | Score, wrong book, history |
| **More** | Days, Pass, Always, MCQs hub, Feedback, switch to **Coach mode** |

**Coach mode** (More → “full Coach”): all original tabs (Days, Pass, Always, Extra, MCQs, Feedback) plus volume packs expanded.

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

## Feedback (how it works — no login)

Students do **not** need GitHub or any account.

1. User opens **Feedback**, writes a note, taps **Send**  
2. Message is delivered automatically (free **ntfy** inbox + optional email)  
3. **You** read messages here (bookmark on phone):  
   https://ntfy.sh/sdle-study-path-feedback-xxxova2-k7m9  
4. Fix the app, push to `main` — live site updates  

**Optional permanent email archive:** edit `data/feedback_config.js`, set `email: "you@gmail.com"`, push.  
Confirm FormSubmit’s one-time activation email, then every feedback also lands in your inbox.

Drafts can be saved on the device only (not sent until Send).

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
