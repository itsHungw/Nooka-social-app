# Expo SDK 57 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Nooka directly from Expo SDK 54 to Expo SDK 57 so it runs in the current iOS Expo Go client.

**Architecture:** Keep the managed Expo/CNG workflow and align dependencies through Expo CLI rather than editing compatible package versions by hand. Preserve the user's existing `bundleIdentifier` and `expo run:*` script changes, remove configuration that SDK 57 no longer accepts, then verify tests, static checks, Expo Doctor, config generation, and Metro startup.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, Expo Router, TypeScript, npm.

**Spec:** `AGENTS.md` and the Expo SDK 55, 56, and 57 release notes.

## Global Constraints

- Modify files only inside `nooka-mobile/`.
- Preserve pre-existing uncommitted edits in `app.json` and `package.json`.
- Keep the managed CNG workflow; do not create or commit `ios/` or `android/`.
- Use npm and Expo CLI; do not mix package managers.
- Do not create commits, branches, or worktrees.
- Keep New Architecture enabled implicitly; SDK 57 no longer supports Legacy Architecture.
- Do not add or expose secrets.

---

### Task 1: Align the SDK 57 dependency graph

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Existing npm dependency graph for SDK 54.
- Produces: Expo SDK 57-compatible dependency graph resolved by Expo CLI.

- [x] **Step 1: Install and align SDK 57 dependencies**

Run `npx expo install expo@^57.0.0 --fix`.

Expected: `expo`, React, React Native, Expo packages, and compatible community native packages are updated; npm lockfile is regenerated.

- [x] **Step 2: Inspect the resulting dependency diff**

Run `git diff -- package.json package-lock.json`.

Expected: Existing script edits remain, dependency changes are limited to SDK compatibility, and no second package-manager lockfile appears.

### Task 2: Migrate Expo configuration and repository guidance

**Files:**
- Modify: `app.json`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: SDK 57 configuration schema and the aligned package versions from Task 1.
- Produces: Valid SDK 57 app configuration and accurate contributor guidance.

- [x] **Step 1: Remove obsolete New Architecture configuration**

Remove `newArchEnabled` from `app.json`; SDK 55 and later always use New Architecture. Preserve `ios.bundleIdentifier` and all other existing values.

- [x] **Step 2: Update version-specific repository rules**

Replace the SDK 54 pinning rule with SDK 57 guidance, update the platform/version summary, and revise `react-native-maps` wording to match the version selected by Expo CLI. Retain privacy, map architecture, and testing constraints.

- [x] **Step 3: Validate evaluated app configuration**

Run `npx expo config --type public`.

Expected: Config evaluation succeeds, reports SDK 57, and retains `com.anonymous.nooka` as the iOS bundle identifier.

### Task 3: Verify the migrated application

**Files:**
- Test: Existing source and test files under `nooka-mobile/`

**Interfaces:**
- Consumes: SDK 57 dependency graph and configuration.
- Produces: Evidence that the migrated project is internally consistent and can start Metro for Expo Go.

- [x] **Step 1: Run domain tests**

Run `node --test features/nooka/ranking.test.ts features/nooka/geo.test.ts features/nooka/mascot.test.ts features/nooka/ascent.test.ts features/nooka/ladder.test.ts features/nooka/balloon.test.ts features/nooka/mood.test.ts`.

Expected: All tests pass.

- [x] **Step 2: Run lint and TypeScript checks**

Run `npm run lint`, then `npx tsc --noEmit`.

Expected: Both commands exit successfully.

- [x] **Step 3: Run Expo Doctor**

Run `npx expo-doctor@latest`.

Result: All project/dependency checks pass. The only remaining host warning is that local CocoaPods is not installed; Nooka builds iOS through EAS cloud, so no project change is required.

- [x] **Step 4: Verify Metro startup**

Run `npx expo start --clear --non-interactive` and stop it after startup is confirmed.

Expected: Metro initializes under SDK 57 without configuration or dependency errors.

- [x] **Step 5: Review the final working-tree diff**

Run `git status --short`, `git diff --check`, and `git diff -- nooka-mobile`.

Expected: Only intended files inside `nooka-mobile/` changed, existing user edits remain, and no whitespace errors are reported.
