# Nooka Mobile Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo starter UI with an interactive four-screen Nooka social-place prototype matching the approved reference.

**Architecture:** Expo Router keeps Home, Search, Saved, and Map inside a tab group. A custom tab bar renders four destinations plus a central Create action, while `app/create.tsx` is a stack route. Screens consume shared theme tokens, localized copy, reusable Nooka UI components, and mock data isolated from future API types.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, expo-image, @expo/vector-icons, TypeScript strict, i18n-js.

## Global Constraints

- Modify only `nooka-mobile/`.
- Keep Expo SDK 54 and existing package versions.
- Do not add dependencies, branches, worktrees, or commits.
- Every displayed string goes through `lib/i18n.ts`.
- Every color comes from `constants/theme.ts` and exists in light and dark themes.
- Use mock data only; do not invent API response DTOs.
- Do not request or track real-time location.

---

### Task 1: Foundations and assets

**Files:**
- Modify: `constants/theme.ts`
- Modify: `locales/en.json`
- Create: `locales/vi.json`
- Modify: `lib/i18n.ts`
- Create: `assets/images/nooka/*.png`

- [ ] Add symmetric light/dark Nooka tokens.
- [ ] Add complete English and Vietnamese prototype copy.
- [ ] Register Vietnamese with English fallback.
- [ ] Add the approved cafe and map image crops as bundled assets.

### Task 2: Shared navigation and UI primitives

**Files:**
- Create: `hooks/use-nooka-theme.ts`
- Create: `components/nooka/nooka-tab-bar.tsx`
- Create: `components/nooka/ui.tsx`
- Create: `features/nooka/prototype-data.ts`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/_layout.tsx`

- [ ] Add typed theme access and reusable chips, cards, avatar stacks, and screen shell.
- [ ] Replace the stock tab bar with Home, Search, Create, Saved, and Map controls.
- [ ] Keep Create as a stack route and preload Ionicons.

### Task 3: Home and Create interactions

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `app/create.tsx`

- [ ] Build the visual-first place feed with intent actions and saved state.
- [ ] Build the four-step create surface with photo state, visibility selection, hide-time toggle, and publish navigation.

### Task 4: Search, Saved, and Map

**Files:**
- Create: `app/(tabs)/search.tsx`
- Create: `app/(tabs)/saved.tsx`
- Create: `app/(tabs)/map.tsx`
- Delete: `app/(tabs)/explore.tsx`

- [ ] Build searchable/filterable place results.
- [ ] Build Want to go / Been saved views over the map artwork.
- [ ] Add a lightweight map destination so every tab is functional.

### Task 5: Verification

- [ ] Run `npm run lint` and fix all findings.
- [ ] Run `npx tsc --noEmit` and fix all findings.
- [ ] Run `npx expo-doctor` and record dependency health.
- [ ] Start Expo web, inspect desktop/mobile screenshots in light and dark mode, and fix clipping or overlap.

