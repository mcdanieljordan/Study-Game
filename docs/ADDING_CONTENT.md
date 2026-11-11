# Adding new assignments, study guides and tests

The fast way: **send Claude the photo / PDF** ("add this to Sida's pathway"). Claude reads it, writes a content pack
in `content/`, adds one line to `content/manifest.json`, and commits it. The kids see a new pathway on their home screen
the next time they open the app (it updates itself; no install needed).

## What a pack looks like
A pack is one JSON file (`content/<child>/<name>.json`). It has **units** (each becomes Learn → Practice → Challenge nodes on the
pathway) and **items** (the facts / skills practiced). Items come in these flavours:

| `t` | What it is | Becomes |
|---|---|---|
| `word` | spelling word with meaning, sentence, part of speech, syllables, plural, misspellings | listen & build, type it, cloze, unscramble, which-is-spelled-right, meaning, syllables, plural… |
| `terms` | `[["Term","definition"],…]` | "what does X mean?" / "which term matches?" (distractors from the same list) |
| `qas` | `{q, a, w:[wrong answers], why, hint}` — or `num` for a numeric answer; optional `visual` | multiple choice / number pad |
| `seq` | ordered steps | put-it-in-order |
| `counts` | raw data + categories | build-a-frequency-table |
| `diagram` | water-cycle picture with a glowing part | "what is happening here?" |
| `gen` | name of a procedural generator in `js/gen.js` (45 of them: integers, fractions, algebra, ratios, statistics, geometry, finance, tally/frequency tables) | unlimited fresh practice problems |
| `story` | silly story with `[[word]]` blanks | tap-the-blank cloze |

Tips from the research plan that packs follow:
* Wrong answers (`w`) should be **real misconceptions**, not silly options.
* Add a `why` to every question — that is the kind feedback the child reads after a miss.
* Give a unit a `lesson` (a few short cards) so the *Learn* node can teach before it tests.
* Set `"due": "YYYY-MM-DD"` (or let a grown-up set it in **Grown-ups → Tests**) so review is compressed before the test.

## If something in a worksheet disagrees with another worksheet
Put it in the pack's `"notes": [...]` — it shows up under **Grown-ups → Content** (e.g. the water-cycle doodle says 75% but the study guide says 70%).

## Test locally
```bash
cd Study-Game && python3 -m http.server 8123     # then open http://localhost:8123
```
(ES modules need a web server; opening `index.html` straight from disk won't work.)
