# Nooka Home Post Layout Design

## Goal

Restructure the Home post to match the approved reference: identify the post author before the image, show a Locket-style caption on the image, and move place information into a separate card below the action row.

## Layout Order

1. App header with Nooka, location, and notification action.
2. Post author row with avatar, author name, and posting time.
3. Large place photo with a readable caption anchored near the lower edge.
4. Like, Want to go, Ask, and Been actions.
5. Place card with name, detailed location, category chips, and hashtags.
6. Existing friends-who-visited row.
7. Existing bottom navigation.

## Post Author

The author row replaces the current "friends have been here" social-proof row. Author name and posting time come from the post mock data rather than being hardcoded in the screen. The current prototype post uses Linh and Yesterday/Hôm qua. The avatar is a compact circular identity mark suitable for the current mock-data stage.

## Photo Caption

The caption appears inside the image near the bottom, centered horizontally in the compact social-photo treatment used by Locket. It uses a roughly 40% opaque black surface, white centered text, and a pill radius. The bubble grows with its content up to 88% of the image width, wraps to at most two lines, and stays about 14 pixels above the lower edge. No blur dependency is added.

Prototype caption:

- English: "A quiet corner for an afternoon of work."
- Vietnamese: "Một góc yên tĩnh cho buổi chiều làm việc."

The existing bookmark overlay is removed from the photo because saving remains available through the Want to go action and the separate Saved workflow.

## Place Card

The place card moves below the action row and contains four distinct layers:

1. Place name: The Workshop Coffee.
2. Detailed location: District 1, Ho Chi Minh City / Quận 1, TP. Hồ Chí Minh.
3. Category chips: Quiet, Work friendly, Outdoor / Yên tĩnh, Làm việc, Ngoài trời.
4. Hashtag line: `#coffeeDistrict1 #workcorner #quietspace` / `#caphequan1 #goclamviec #khonggianyentinh`.

Category chips remain interactive-looking metadata but do not filter within this scope. Hashtags use compact accent-colored text rather than pill containers, matching familiar social-post vocabulary.

## Data and Components

- Extend the isolated Home post mock data with author, posted-time, caption, detailed-location, category, and hashtag translation keys.
- Keep all displayed copy in `locales/en.json` and `locales/vi.json`.
- Keep all colors sourced from the existing light/dark theme tokens.
- Reuse the existing `Pill`, `AvatarStack`, and `ScreenShell` foundations where appropriate.
- Preserve existing Like, Want to go, and Been interaction state.

## Responsive and Theme Behavior

The image keeps a stable height and rounded clipping. The caption wraps to at most two lines and never overlaps the action row. The place card expands vertically for translated text. Category chips wrap on narrow screens; hashtags wrap as natural text. Both light and dark palettes must remain readable.

## Verification

- Confirm the author row displays Linh and the localized posting time.
- Confirm the caption is inside the image and remains readable in light and dark modes.
- Confirm the place card appears below the action row.
- Confirm detailed location, category chips, and hashtag text appear in the approved order.
- Confirm the old social-proof row, overlay place card, and standalone category section are removed.
- Check 390x844 and 430x932 without clipping or overlap.
- Run theme tests, lint, TypeScript, and Expo Doctor.
