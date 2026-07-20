# Binding mandate (user — restated)

**Official** = SCFHS Appendix C **recommended textbooks** (Drive SDLE Book folder), local at:
- PDFs: `data/raw/books/sdle_book/` (22 titles)
- Text: `data/raw/books/text/`
- Factpacks: `data/raw/books/text/FACTPACKS/`

## Required work (not optional)

1. Download / keep official recommended books (Drive)  
2. Review **every usable MCQ answer** against those books (Grok 4.5 + book text)  
3. Write lessons from those sources (days 1–9)  
4. Do **not** call lower models the final judge  
5. Do **not** report “finished” while residual items lack `truth_judge=grok_book`  

## Residual wave

Items without `truth_judge=grok_book` → `data/generated/grok_book_residual/`  
Apply → `scripts/apply_grok_book_wave.py` (also scan residual out dir — extend if needed)
