# Nooka Profile, Settings, and Theme Design

## Goal

Replace the Map tab with a personal Profile experience inspired by familiar short-video social profiles. The upper section presents the user's identity and account statistics, while the lower section shows a three-column grid of photos the user has posted. A menu button in the top-right opens Settings, where the user can choose System, Light, or Dark appearance.

## Scope

- Replace the `map` tab and route with a `profile` tab and route.
- Add a Profile header with avatar, display name, username, biography, and account statistics.
- Add a three-column post-photo grid using isolated prototype data and bundled assets.
- Open a focused post preview when a grid image is selected.
- Add a top-right menu button that opens a dedicated Settings screen.
- Add an Appearance section with System, Light, and Dark choices.
- Persist the selected appearance between app launches.
- Update both English and Vietnamese localization files.
- Update `nooka-mobile/AGENTS.md` so its theme guidance matches the new product behavior.

The backend, API contracts, authentication, and upload flows are outside this change. Profile and post data remain mock data in the prototype data layer.

## User Experience

### Profile Tab

The bottom navigation keeps Home, Search, Create, Saved, and Profile. Profile replaces Map in the fifth position.

The Profile screen contains:

1. A compact title row with the Nooka username and a three-line menu icon.
2. An identity row with a circular avatar and three statistics: posts, followers, and following.
3. Display name and short biography.
4. An Edit Profile button presented as a restrained secondary action.
5. A simple posts selector followed by a stable three-column image grid.

Images use a fixed square aspect ratio so loading and selection states cannot shift the grid. Selecting a post opens a full-screen preview with the image, place name, and posting time. Back navigation returns to the same Profile state.

### Settings

The menu icon opens a full-screen Settings route. The screen has a back button, a Settings title, and an Appearance section. Appearance is represented by three radio-style rows:

- System: follow the device color scheme.
- Light: always use the light palette.
- Dark: always use the dark palette.

The active choice has a check indicator and an accent treatment. Selecting a choice updates all mounted screens immediately and updates the status bar. The selection is saved for the next launch.

## Architecture

### Theme State

Add a root-level `NookaThemeProvider` with one persisted preference:

```ts
type ThemePreference = 'system' | 'light' | 'dark';
```

The provider reads the current device scheme with React Native `useColorScheme`. It resolves the active scheme as follows:

- `system`: use the device scheme, falling back to `light` when unavailable.
- `light`: use the light palette.
- `dark`: use the dark palette.

The provider exposes `preference`, `colorScheme`, `colors`, and `setPreference`. Existing screens continue consuming `useNookaTheme`, so the change remains centralized.

The preference is stored with `@react-native-async-storage/async-storage` under a namespaced key. Invalid or unreadable stored values fall back to `system`; storage failures do not block rendering or theme changes.

### Navigation

- Remove `app/(tabs)/map.tsx`.
- Add `app/(tabs)/profile.tsx`.
- Update the custom tab bar route and icon from Map to Profile.
- Add `app/settings.tsx` as a stack screen.
- Add `app/post/[id].tsx` as a stack preview screen.

### Data

Extend the existing prototype data module with a profile object and posted-place entries. Each post has a stable ID, bundled image, place name, and localized metadata keys. No hand-written API response type is introduced.

## Components

- `NookaThemeProvider`: preference hydration, active-scheme resolution, persistence, and context.
- `ThemeOption`: accessible radio row for one appearance choice.
- `ProfileStats`: fixed three-column statistics row.
- `ProfilePostGrid`: three-column pressable image grid.
- Existing `ScreenShell`, `IconButton`, theme tokens, and i18n utilities remain the visual foundation.

All controls receive accessibility roles and localized labels. All colors come from `constants/theme.ts`, with matching tokens in light and dark palettes.

## Error Handling

- Missing or invalid theme storage values resolve to System.
- A storage write failure keeps the new theme active for the current session.
- An unknown post ID shows a localized not-found state with a back action.
- Images retain the existing themed fallback color while loading.

## Verification

- Lint, TypeScript, and Expo Doctor must pass.
- Verify System, Light, and Dark selections update the Profile, Settings, and another existing tab.
- Reload the app and verify the selected preference is restored.
- Check the Profile grid at 390x844 and 430x932 viewports for clipping or overlap.
- Exercise Profile to Settings, Appearance selection, Profile to post preview, and back navigation.
- Visually inspect both light and dark modes.

## Acceptance Criteria

- The fifth bottom tab is Profile rather than Map.
- The Profile upper section shows personal information and statistics.
- The Profile lower section shows a stable three-column grid of posted photos.
- The top-right menu opens Settings.
- Settings offers System, Light, and Dark appearance choices.
- Theme changes apply immediately and persist after restart.
- Existing Home, Search, Create, and Saved flows continue to work.
