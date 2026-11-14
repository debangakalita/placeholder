# Placeholder: Project Rules

Nov 6, 2026 · @Debanga

## What this is

Placeholder is a private, camera-first app for saving small cool places you notice while walking or riding: a cafe, a gali, a house, a tree. It opens straight into the camera, like Locket, and keeps everything simple, like Notion.

This doc is the rulebook for the project. Give it to Claude or Cursor at the start of every session: export it as Markdown and save it in the code folder as `CLAUDE.md` (Claude Code) or as a Cursor rules file. When a decision changes, change it here first.

## Product rules

**V1 does:**

- Opens directly into the camera. No home screen, no cards.
- Photo flow: take a photo, then the preview shows it with optional title, note and tags, then Save or Retake. Location is saved automatically.
- Pin only: one button saves the current location without a photo, for awkward places where taking a photo is hard.
- Swipe up (or tap the "places" pill at the top) to open the Places viewer: one big photo at a time with its title and area, and a filmstrip of all places below. The map view opens from the map icon in its top bar; the "…" menu has Grid view (all places, three per row), Directions (opens Google Maps directions to the place) and Delete place.
- Details are always optional. Add them on the preview, or later by tapping a photo in Places: the card flips and you edit title, note and tags on its back. Tags are typed by hand. Auto tags suggested from the photo and the "must revisit" flag are parked for later.
- Saves on the phone first and uploads when the internet is back.
- Works on Android and iPhone as an installable web app. English only.

**V1 does not:**

- Share places, show other people's places, or have profiles
- Send reminders or "you are near" notifications
- Have collections, trips, or voice notes
- Ship to the App Store or Play Store (maybe later)

## Design rules

Minimal and quiet. Inspiration: Locket for the camera, Notion for everything else. When in doubt, remove something.

- Every screen is true black, like a real camera app. No white screens anywhere. In text, the title always leads: big and bold; note, tags and places are smaller and grey.
- Gojek green is the only accent colour. Use it for the shutter ring, the Save button and small highlights only.
- Text on green is black, never white (white on this green is too hard to read).
- The signature idea, from the name: anything not filled in yet (a Pin only place, a suggested tag, an empty grid) is a dashed placeholder box, and it turns solid once filled. No shadows, gradients, emoji or decorative shapes.
- Main buttons sit at the bottom of the screen, within thumb reach, because it is used one-handed while walking.
- Every tap target is at least 44 px.

**Style guide**

| Token | Value | Used for |
| --- | --- | --- |
| Accent | #00AA13 (Gojek green) | Shutter ring, Save button, location pin, small dots. Text on it is black |
| Background | #000000 | Every screen |
| Dark surface | #1C1C1C | Buttons, menus, the "24 places" pill |
| Raised surface | #2A2A2A | Tags, filled chips |
| Flip card back | #161616 with #2A2A2A border | Back of the Places card |
| Text | #FFFFFF | Titles and main text |
| Soft text | #D0D0D0 | Notes |
| Muted text | #A3A3A3 | Areas, dates, labels, hints |
| Placeholder dash | #555555 to #6A6A6A, 1.5 px dashed | Anything not filled in yet |
| Danger | #FF7A6E | Delete place |
| Font | Bricolage Grotesque (400 to 700) | All text, logo included |
| Logo | "placeholder" in Bricolage Grotesque Bold inside a dashed placeholder box, with a green dot on its top-right corner. App icon = the empty dashed box with the green dot | Camera top bar (src/components/Logo.jsx, live text), app icon, favicon; vector file public/logo.svg |
| Sizes | Title 30 to 32 bold, place title 24 bold, note 16, small 13 to 15 | Title always leads |
| Corners | 36 camera view, 28 photo and cards, 10 filmstrip, pill tags, round buttons | A different radius per level |
| Spacing | 24 px screen edges on preview, 8 px between filmstrip items |  |
| Icons | Simple line icons, 2 px stroke |  |

## Screens

The approved direction is **D** on the [mockup canvas](https://claude.ai/artifact/J3svDnHCWAAEPT2QzJ3oEY). Directions A, B and C are old and not used.

| Screen | Canvas name | What it does |
| --- | --- | --- |
| Camera | D · Camera | Opens here. Pin only on the left, shutter on the right, "places" pill at the top, or swipe up, opens Places |
| Preview + details | D · Photo preview + details | The photo, then optional title (big), note and tags (small), then Retake or Save |
| Saved | D · Saved | Photo shrinks into a pin, then back to camera |
| Places | D · Places | One big photo with title and area, filmstrip below. Tap the photo to flip it and edit details on the back |
| Places map | D · Places map | Dark map with photo pins, opened from the map icon |
| Nothing saved yet | D · Places (nothing saved yet) | Empty dashed card with Open camera |

## Tech rules

| Piece | Choice | What it is for |
| --- | --- | --- |
| App | React + Vite, installable web app (PWA) | The screens |
| Database | Supabase | Place details and coordinates |
| Photos | Supabase Storage | The images, shrunk on the phone before upload |
| Sign-in | Supabase Auth, Google one-tap | Keeps photos and locations private |
| Offline | IndexedDB on the phone | Saves places with no internet, uploads later |
| Map | Leaflet + OpenStreetMap | Free map with photo pins |
| Auto tags (parked) | AI vision API via a server function | Later: suggests tags; the key stays hidden |
| Hosting | Vercel (already set up) | Puts the app online |

- Start reading GPS the moment the app opens, not when the photo is taken.
- Test every change on a real Android phone and a real iPhone.
- Never put secret keys in the app code. On the preview screen, when the phone keyboard opens, shrink the photo and slide the title area up so it stays visible; restore it when the keyboard closes.

## Skills

Use one skill at a time. This doc always wins over a skill: if a skill says something different, follow this doc.

| Phase | Skill | How to use it |
| --- | --- | --- |
| Designing screens | [frontend-design](https://www.skills.sh/anthropics/skills/frontend-design) | Always add: "Keep it minimal, like Notion and Locket. Follow the design rules in CLAUDE.md." It likes bold styles otherwise |
| Before launch | [web-design-guidelines](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines) | Run it on the finished code. It lists problems to fix; it does not design |
| Marketing website (later) | [design-taste-frontend](https://www.skills.sh/leonxlnx/taste-skill/design-taste-frontend) | Only if we build a landing page |

Not used: [design-mobile-apps](https://www.skills.sh/designed-by-ai/skills/design-mobile-apps) (it controls a separate tool called Sleek) and [high-end-visual-design](https://www.skills.sh/leonxlnx/taste-skill/high-end-visual-design) (heavy glass and animation, the opposite of this app).

## How to work with AI on this project

1. One feature per session. Start each one by sharing this doc.
2. For anything big, ask: "Propose a short plan first and wait for my OK."
3. Add: "I am a designer. Explain technical choices in one simple line each. If my idea is wrong, tell me."
4. Build the camera screen first and test it on both phones before anything else. The whole app depends on it feeling instant.
5. Use Opus for design and hard problems, Sonnet for most coding.

Other docs: [v1 Plan](https://claude.ai/artifact/4Sbzr9cmsbff1tTLN9w6e8) (background and risks) and the [mockup canvas](https://claude.ai/artifact/J3svDnHCWAAEPT2QzJ3oEY).
