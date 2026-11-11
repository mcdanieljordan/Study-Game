# Study Quest 🌈🧱

One app, two looks, built from the research plan (intrinsic integration, retrieval practice, spaced repetition, no timers /
buzzers / point penalties, pick-1-of-3 avatar rewards, no dark patterns, no tracking).

* **Ensley (2nd grade)** — pastel *Unicorn Meadow*. Unicorn avatar (SVG), big on-screen letter keyboard, spoken words and praise.
  Packs: Lesson 6 spelling (the 15 words + her old *Ensley's Spelling Quest* activities), Frequency tables (Savvas 5-1), The Water Cycle.
* **Sida (6th grade)** — dark neon *Block World*. 3D voxel avatar and island (three.js), mature tone, elaborated review after each level.
  Packs: EUS 1–7 (integers, rational numbers, algebra, proportionality, statistics, geometry, financial literacy).
* **Grown-ups** (math gate) — readiness per test, strengths / needs-practice, most-missed questions *and what was typed*, activity charts,
  spaced-repetition boxes, test dates, family sync, backup/restore, content library.

## How learning works
Pathway = Learn (try-first pre-test → lesson cards → questions) → Practice → Challenge (construct-response) → Test Day Boss.
Every answer is tracked by a Leitner spaced-repetition scheduler (compressed to finish before the test date). Smart Review, skill practice,
Memory Match, Bubble Spell / Fact Check, and brain breaks (movement, breathing, popping, beat pads) are always one tap away.

## Saving & backup
Progress saves on the device automatically (localStorage). **Optional family sync**: Grown-ups → Sync & backup → *Create a family code*.
Progress then also backs up to the project's Supabase database (functions `sg_push` / `sg_pull`, only the code's SHA-256 is stored, no accounts).
Open the *setup link* on another device and both kids' progress appear in the Grown-ups dashboard everywhere.

## Privacy
No accounts, ads, analytics, third-party scripts or web fonts. Don't put real names/photos in this (public) repo.

## Adding content
See [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md).

## Credits
[three.js](https://threejs.org) (MIT) and [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC) are vendored in `/vendor`.
