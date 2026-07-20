# DeepSeek V4 Pro — helper package for SDLE bank audit

You are helping another coding agent (Grok) on an exam-critical study app.
Work carefully. Output JSON only when asked. No fake confidence.

## Your role
- Clinical MCQ answer verification + department tags + note classification
- Grok will merge your JSON into the bank with scripts
- Do NOT invent SCFHS official keys; use clinical standards

## System rules (always)
You are auditing KSA SDLE / Prometric-style dental MCQs for a study app.
Rules:
- Community/PDF ✅ marks are often wrong — decide by clinical board standard, not the mark.
- Output ONLY a valid JSON array (no markdown fences).
- Each object MUST have:
  id, answer_index (0-3), confidence (high|med|low),
  hinge (clinical why, 1-3 sentences, English),
  flip (boolean: true if answer_index differs from answer_index_in),
  department (operative|fixed|rpd|endo|perio|oms|ortho_pedo|ethics|mixed)
- If image-only / impossible: answer_index null, usable false, hinge explains.
- operative = direct restorations/preps/materials technique; fixed/rpd = prostho; do not dump all into restorative.
- Do not invent textbook page numbers.


## Wave 01 — Saud delta (226 MCQs, highest priority)
Files in this folder (run in order):
- `wave01_saud_00.json` (30 items)
- `wave01_saud_01.json` (30 items)
- `wave01_saud_02.json` (30 items)
- `wave01_saud_03.json` (30 items)
- `wave01_saud_04.json` (30 items)
- `wave01_saud_05.json` (30 items)
- `wave01_saud_06.json` (30 items)
- `wave01_saud_07.json` (16 items)

### Per file prompt (copy-paste into DeepSeek)
```
[PASTE system rules above]

Task: Audit every item in the attached JSON under key "items".
Return a JSON array with one object per id:
id, answer_index, confidence, hinge, flip, department

Input file content:
[PASTE full wave01_saud_XX.json]
```

Save DeepSeek output as:
`data/generated/deepseek_out/wave01_saud_XX.json`
(same XX number)

## Wave 02 (later) — Mar–June أبطال missing-from-bank stems
Grok will generate after gap analysis. Do not start until wave01 complete.

## Wave 03 — Note classification
Will use notes_seed.json after Phase A notes extract.

## Quality bar
- If unsure: confidence med/low — still pick best answer
- flip:true must have hinge that explains why community key was wrong
- No empty hinges
