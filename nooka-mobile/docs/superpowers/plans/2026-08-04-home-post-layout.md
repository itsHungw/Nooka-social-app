# Home Post Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Home post into an author-first social layout with an in-photo caption and a separate place card containing location, category chips, and hashtags.

**Architecture:** Extend the existing isolated prototype data with a Home post descriptor, add localized copy for every new field, and refactor only `app/(tabs)/index.tsx`. Existing interaction state and shared UI primitives remain unchanged.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, Expo Image, TypeScript strict, i18n-js.

## Global Constraints

- Modify only `nooka-mobile/`.
- Do not upgrade Expo SDK or add dependencies.
- Keep all displayed copy in English and Vietnamese locale files.
- Keep every color in the existing light/dark token system.
- Preserve Like, Want to go, and Been interactions.
- Do not create a commit, branch, or worktree.

---

### Task 1: Home Post Data and Copy

**Files:**
- Modify: `features/nooka/prototype-data.ts`
- Modify: `locales/en.json`
- Modify: `locales/vi.json`

**Interfaces:**
- Produces: `homePost` with author initials/name key, posted-time key, caption key, place name key, location key, category keys, and hashtag key.
- Consumes: existing Workshop image and translation helper.

- [ ] Add `homePost` to the mock data module so author and post metadata are not hardcoded in JSX.
- [ ] Add matching English and Vietnamese keys for Linh, Yesterday/Hôm qua, caption, detailed location, categories, and hashtags.
- [ ] Remove obsolete Home keys for the old social-proof row, place metadata byline, and standalone tag list.
- [ ] Run `npx tsc --noEmit` and confirm the data contract compiles.

### Task 2: Home Layout Refactor

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `homePost`, `workshopImage`, `Pill`, `IconButton`, `AvatarStack`, `ScreenShell`, and `useNookaTheme`.
- Produces: author row, captioned image, action row, place card, and friends row in the approved order.

- [ ] Capture the current Home screen as the failing visual baseline: the place card overlaps the image and the author row is absent.
- [ ] Replace the social-proof row with a circular author avatar, author name, and localized time.
- [ ] Remove the image bookmark and overlay place card; add a horizontally centered bottom caption pill with a roughly 40% opaque black surface inside the photo.
- [ ] Keep the existing action controls immediately below the photo.
- [ ] Add a separate place card below actions with title, detailed location, wrapping category chips, and a wrapping hashtag line.
- [ ] Remove the old standalone tag section and keep the friends-who-visited row below the place card.
- [ ] Run `npm run lint` and `npx tsc --noEmit`.

### Task 3: Responsive and Theme Verification

**Files:**
- No production files unless QA reveals a reproducible layout defect.

**Interfaces:**
- Verifies the completed Home post without changing its data contract.

- [ ] Start a clean Expo web server.
- [ ] Inspect Home at 390x844 and 430x932 in light mode.
- [ ] Switch to dark mode through Settings and inspect Home again.
- [ ] Confirm caption readability, category wrapping, hashtag wrapping, and no overlap with actions or bottom navigation.
- [ ] Exercise Like, Want to go, and Been controls.
- [ ] Run `node --test features/theme/theme-preference.test.ts`, `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor`, and `git diff --check`.
- [ ] Review `git status --short` and preserve the existing untracked `.idea/` directory.
