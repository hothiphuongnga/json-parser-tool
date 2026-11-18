---
name: verify
description: Run the full GoingTool check — lint, typecheck, unit tests, production build, and a smoke test of every page in every locale. Use before reporting work as done or before a commit.
---

# Verify the project

Run in order and stop at the first failure; report the actual output.

1. `npx eslint .`
2. `npx tsc --noEmit` — errors inside `.next/` come from stale generated route types; they disappear after step 4. Only errors in source files count.
3. `npx vitest run`
4. `npm run build` — expect every tool route prerendered once per locale (●).

## Smoke test

Only one `next dev` may run per project directory. If the user's dev server is already up (usually port 3000), test against it instead of starting another, and never kill it.

Otherwise start the production build on a free port:

```bash
npx next start -p 3123   # run in the background
```

Then check:

- Every tool path returns 200 for `/`, `/vi/…`, `/zh/…`, `/ja/…`, `/ko/…`, and `<html lang>` matches the locale.
- `/en/<path>` → 308 to the unprefixed path.
- An unknown path (`/foo`, `/vi/foo`) → 404 with the localized not-found page.
- `/sitemap.xml`, `/robots.txt`, `/ads.txt`, `/icon.png` → 200 (the proxy must not touch them).
- In a real browser (headless Chrome is fine): no console errors or hydration warnings, light and dark theme, and no horizontal scroll at 390px width.

Stop the server you started when done.
