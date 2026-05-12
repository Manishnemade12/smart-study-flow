# SSC Smart Notes

## PWA setup

This app is now configured as a Progressive Web App.

### What it includes
- Offline support through a generated service worker
- Install prompt on supported browsers
- Mobile home-screen support guidance for iPhone/iPad
- App-like standalone launch via the web manifest

### Run locally
```bash
npm install
npm run dev
```

### Build for production
```bash
npm run build
npm run preview
```

### Notes
- The previous Electron-specific files were removed.
- The homepage now shows an install card instead of desktop download buttons.
- Replace the SVG icons in `public/` with PNG variants later if you want stricter store/browser compatibility.

## AI chunking prompt behavior

The `chunk-content` edge function organizes pasted ChatGPT / syllabus text into structured study chunks. Its behavior is intentionally **format-first, NOT summarize-first**.

### Rules the prompt enforces

- **Preserve ~95% of the original content.** If the user pastes 100 lines, ~95 lines must still appear in the resulting `notes` fields. The AI is a re-formatter, not a summarizer.
- **Only allowed deletions:** greetings/filler ("sure!", "here you go"), exact duplicate sentences, and the literal quiz/MCQ Q&A blocks (those are MOVED into the quiz array).
- **No paraphrasing-for-brevity.** Original wording stays; the AI only re-flows it into clean markdown.
- **Never invent facts** that aren't in the source.

### Formatting expectations

- Use `#`, `##`, `###` headings, bullet lists, numbered lists, **bold**, tables, and blank-line spacing.
- Plain lines like `Basic Map Orientation of India` become `### Basic Map Orientation of India` — they are **converted**, never dropped.
- Original ordering of content within a chunk is preserved.
- `notes` = the FULL re-formatted study content for that section.
- `summary` = 2–4 lines (the only place compression is allowed).
- `keyPoints` and `terms` are **additive** — they don't replace the notes.

### Quiz handling

- Any quiz / MCQ / Q&A blocks in the source are **removed from `notes`** and placed into the chunk's `quiz` array.
- All extracted questions become MCQs with exactly 4 options. Missing distractors are fabricated; correct answers are kept verbatim.
- The AI may add 2–4 extra MCQs per leaf chunk on top of the extracted ones.

If you tweak the prompt in `supabase/functions/chunk-content/index.ts`, keep these rules intact.
