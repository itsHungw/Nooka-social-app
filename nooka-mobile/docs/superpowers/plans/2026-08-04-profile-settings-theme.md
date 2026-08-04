# Profile, Settings, and Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Map tab with a TikTok-inspired Profile and add a dedicated Settings screen with a persistent System, Light, and Dark appearance selector.

**Architecture:** A root `NookaThemeProvider` owns the persisted theme preference and resolves it against the device color scheme. Existing consumers continue using `useNookaTheme`, keeping palette access centralized. Profile, Settings, and post preview are Expo Router routes backed by isolated prototype data and localized copy.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, TypeScript strict, Expo Image, AsyncStorage, Node test runner.

## Global Constraints

- Modify only `nooka-mobile/`.
- Keep Expo SDK at 54 and do not upgrade existing dependencies.
- Install Expo-compatible packages with `npx expo install`.
- Keep every UI string in English and Vietnamese locale files.
- Keep all UI colors in both `Colors.light` and `Colors.dark`.
- Keep profile and post content in the mock data layer; do not invent API DTOs.
- Do not create a commit, branch, or worktree unless the user explicitly asks.
- Before completion, run `npm run lint`, `npx tsc --noEmit`, and `npx expo-doctor`.

---

### Task 1: Theme Preference Core and Provider

**Files:**
- Create: `features/theme/theme-preference.ts`
- Create: `features/theme/theme-preference.test.ts`
- Create: `providers/nooka-theme-provider.tsx`
- Modify: `hooks/use-nooka-theme.ts`
- Modify: `app/_layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `ThemePreference = 'system' | 'light' | 'dark'`.
- Produces: `resolveThemeScheme(preference, systemScheme): 'light' | 'dark'`.
- Produces: `useNookaTheme(): { preference, colorScheme, colors, setPreference }`.
- Persists preference under `@nooka/theme-preference`.

- [ ] **Step 1: Fetch current AsyncStorage and Expo theme documentation**

Use Context7 for `@react-native-async-storage/async-storage` and Expo SDK 54/React Native color schemes. Confirm the package version selected by Expo before editing source.

- [ ] **Step 2: Install the compatible persistence package**

Run:

```powershell
npx expo install @react-native-async-storage/async-storage
```

Expected: only `package.json` and `package-lock.json` dependency metadata changes.

- [ ] **Step 3: Write the failing resolver tests**

Create `features/theme/theme-preference.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { isThemePreference, resolveThemeScheme } from './theme-preference.ts';

test('resolves explicit preferences without the system scheme', () => {
  assert.equal(resolveThemeScheme('light', 'dark'), 'light');
  assert.equal(resolveThemeScheme('dark', 'light'), 'dark');
});

test('resolves system preference and falls back to light', () => {
  assert.equal(resolveThemeScheme('system', 'dark'), 'dark');
  assert.equal(resolveThemeScheme('system', null), 'light');
});

test('accepts only supported stored preferences', () => {
  assert.equal(isThemePreference('system'), true);
  assert.equal(isThemePreference('sepia'), false);
  assert.equal(isThemePreference(null), false);
});
```

- [ ] **Step 4: Run the resolver test and confirm RED**

Run:

```powershell
node --test features/theme/theme-preference.test.ts
```

Expected: FAIL because `theme-preference.ts` does not exist.

- [ ] **Step 5: Implement the pure preference resolver**

Create `features/theme/theme-preference.ts` with:

```ts
import type { ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveColorScheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = '@nooka/theme-preference';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveThemeScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ActiveColorScheme {
  return preference === 'system'
    ? systemScheme === 'dark' ? 'dark' : 'light'
    : preference;
}
```

- [ ] **Step 6: Run the resolver tests and confirm GREEN**

Run `node --test features/theme/theme-preference.test.ts`.

Expected: 3 passing tests.

- [ ] **Step 7: Implement the root theme provider**

Create a context in `providers/nooka-theme-provider.tsx` that:

- initializes `preference` as `system`;
- reads `THEME_STORAGE_KEY` once with `AsyncStorage.getItem`;
- accepts only values passing `isThemePreference`;
- resolves `colorScheme` with `resolveThemeScheme`;
- updates state immediately in `setPreference`;
- writes asynchronously with `AsyncStorage.setItem` and does not block rendering on a write failure;
- exposes `preference`, `colorScheme`, `colors`, and `setPreference`.

- [ ] **Step 8: Route existing theme consumers through the provider**

Make `useNookaTheme` read the new context. Split `app/_layout.tsx` into an outer provider wrapper and an inner navigator so React Navigation theme, stack background, and `StatusBar` use the resolved scheme.

- [ ] **Step 9: Verify the theme foundation**

Run:

```powershell
node --test features/theme/theme-preference.test.ts
npx tsc --noEmit
```

Expected: all tests pass and TypeScript reports no errors.

### Task 2: Profile Data, Localization, and Tab Replacement

**Files:**
- Modify: `features/nooka/prototype-data.ts`
- Modify: `locales/en.json`
- Modify: `locales/vi.json`
- Modify: `components/nooka/nooka-tab-bar.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Delete: `app/(tabs)/map.tsx`
- Create: `app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: existing bundled Nooka images and `useNookaTheme`.
- Produces: `profile` and `profilePosts` mock constants with stable post IDs.
- Produces: `/profile` as the fifth tab route.

- [ ] **Step 1: Add localized profile and settings vocabulary**

Add matching `navigation.profile`, `profile.*`, `settings.*`, and `post.*` keys to both locale files. Required concepts include profile, menu, posts, followers, following, biography, settings, appearance, system, light, dark, selected, and post-not-found.

- [ ] **Step 2: Add isolated profile mock data**

Extend `prototype-data.ts` with a profile object and at least six `profilePosts`. Each post contains `id`, `image`, `placeNameKey`, and `postedAtKey`; reuse bundled café assets rather than adding stock placeholders.

- [ ] **Step 3: Replace the Map route in navigation**

Change `routeItems.map` to:

```ts
profile: {
  labelKey: 'navigation.profile',
  icon: 'person-outline',
  activeIcon: 'person',
}
```

Update both normal and Create-route tab bars from `/map` to `/profile`, update `app/(tabs)/_layout.tsx`, and delete `map.tsx`.

- [ ] **Step 4: Build the Profile header**

Create `profile.tsx` with a compact username title and an accessible `menu` icon button that routes to `/settings`. Add a circular avatar, display name, username, biography, and a fixed three-column statistics row.

- [ ] **Step 5: Build the posted-photo grid**

Render `profilePosts` as a three-column square grid. Use stable dimensions based on the available container width, a 2-pixel gap, themed loading fallback, and an accessibility label containing the localized place name. Pressing a tile routes to `/post/[id]`.

- [ ] **Step 6: Verify Profile navigation and layout**

Run `npx tsc --noEmit`, then open `/profile` at 390x844 and 430x932. Confirm the grid remains three columns and the bottom bar shows Profile instead of Map.

### Task 3: Settings and Appearance Selection

**Files:**
- Create: `components/nooka/theme-option.tsx`
- Create: `app/settings.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `preference` and `setPreference` from `useNookaTheme`.
- Produces: accessible radio controls for System, Light, and Dark.

- [ ] **Step 1: Build an accessible theme option row**

Create `ThemeOption` with props:

```ts
type ThemeOptionProps = {
  value: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};
```

The component reads the current preference, uses `accessibilityRole="radio"`, sets `accessibilityState.checked`, and calls `setPreference(value)` on press. Selected styling uses existing accent/mint/theme tokens.

- [ ] **Step 2: Build the Settings screen**

Create a full-screen route with back button, localized title, Appearance section title, and three `ThemeOption` rows in this order: System, Light, Dark. Keep the layout unframed except for the individual radio rows.

- [ ] **Step 3: Register the stack route**

Add `settings` to `app/_layout.tsx` with hidden native header and `slide_from_right` animation.

- [ ] **Step 4: Verify immediate switching**

From Profile, open Settings and select Light, Dark, and System. Check that the Settings background, text, selected indicator, status bar, Profile, and Home all update without reload.

- [ ] **Step 5: Verify persistence**

Select Dark, reload the web app, and confirm Dark remains active. Select System and confirm device appearance controls the resolved theme.

### Task 4: Post Preview

**Files:**
- Create: `app/post/[id].tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `profilePosts` and Expo Router `useLocalSearchParams`.
- Produces: a focused post preview route and a localized not-found state.

- [ ] **Step 1: Implement post lookup and not-found behavior**

Read `id` from route parameters and find the post by stable ID. If missing, show a localized message and a back button; do not throw or render a blank screen.

- [ ] **Step 2: Build the post preview**

Show a back button, square/full-width image, localized place name, localized posting time, and a subtle bookmark affordance using existing theme tokens.

- [ ] **Step 3: Register and verify the preview route**

Register `post/[id]` with hidden native header and `slide_from_right`. Open a grid item, confirm the expected place is shown, and return to the same Profile screen.

### Task 5: Documentation and End-to-End Verification

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Documents the new product-level theme rule for future work.

- [ ] **Step 1: Update theme guidance**

Replace the obsolete statement that the app has no theme control. Document System as the initial default, the three user preferences, the provider/hook path, persistence, and the requirement to inspect both light and dark modes.

- [ ] **Step 2: Run automated verification**

Run:

```powershell
node --test features/theme/theme-preference.test.ts
npm run lint
npx tsc --noEmit
npx expo-doctor
git diff --check
```

Expected: all tests and checks pass with no diagnostics.

- [ ] **Step 3: Run mobile browser interaction checks**

On a clean Expo web server:

1. Open Profile from the fifth tab.
2. Open Settings from the top-right menu.
3. Select Dark and verify Profile, Home, Search, and Settings visually.
4. Select Light and repeat the visual check.
5. Select Dark, reload, and confirm persistence.
6. Open a profile post and navigate back.
7. Check 390x844 and 430x932 without text clipping or overlap.

- [ ] **Step 4: Review the final worktree**

Run `git status --short` and `git diff --stat`. Confirm `.idea/` and unrelated pre-existing changes were not modified or removed.
