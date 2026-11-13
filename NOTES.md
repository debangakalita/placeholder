# Where we are (handoff notes)

Read `CLAUDE.md` first. This file is the short state of the build, for starting a new chat.

Live app: https://placeholder-three-flax.vercel.app (Vercel deploys every push to `main`).

## Done
- Places swipe feels like iPhone Photos (14 Nov, used Emil Kowalski's `gestures` skill): one position value drives both the big photo and the filmstrip (src/hooks/useGallery.js). Finger down = 1:1 tracking with direct style writes (no React re-render per move); release = critically damped spring seeded with finger speed, one photo per swipe; iOS rubber band at the ends; can be caught mid-slide. Filmstrip drag scrubs (big photo swaps instantly), flick glides then settles; thumbnail tap glides there. Reduced motion: settles instantly.
- Camera screen restyle (14 Nov): tall 3:4 frame centred between top bar and buttons; Pin only and shutter both 84 px (Pin only is a dashed circle, no label); swipe-hint bar removed (swipe up and the places pill still open Places). Photos are now captured 3:4 instead of square.
- Step 5 (changed): manual tags only. Preview shows "+ tag"; added tags are solid chips, tap to remove. Fake suggestions removed.
- Step 1: camera screen (opens straight into the back camera, GPS starts on open, Pin only + shutter, swipe up or the small bottom bar or the "places" pill opens Places).
- Step 2: preview + save on the phone (IndexedDB), Saved pin animation, area names filled in when online (OpenStreetMap Nominatim).
- Step 3: Places viewer (big card, swipe left/right, filmstrip), flip card to edit title/note/tags, "…" menu (Open in Maps, Delete with confirm), dark Leaflet map with photo pins.
- Step 4: cloud backup (Supabase) + Google sign-in. Tested and working on both phones (iPhone home-screen app and Android), 7 Nov 2026.

## Step 4 details
- Supabase project `placeholder`, id `piucpyzjxjmidevhahtx`, region Mumbai. Schema in `supabase/schema.sql` (table `places`, private bucket `photos/<user id>/<place id>.jpg`, owner-only rules).
- Public settings in `src/config.js` (Supabase URL, publishable key, Google client ID). None are secret.
- Sign-in: Google's own button (popup) gives an ID token, then `supabase.auth.signInWithIdToken` with a nonce (`src/components/GoogleButton.jsx`, `src/hooks/useAuth.js`). If this fails inside the iPhone home-screen app, the fallback is Supabase's redirect sign-in (`signInWithOAuth`); the Google client already has the Supabase callback URL for that.
- Sync (`src/lib/sync.js`, `src/hooks/useSync.js`): phone first. Each place has `updatedAt`, `synced`, `deleted`. Push uploads unsynced places and photos; deletes are sent as `deleted = true`. Pull reads all rows; latest `updatedAt` wins; photos are downloaded for places the phone doesn't have. Runs on sign-in, every local change (1.5 s later), when the internet returns, when the app reopens, and every minute.
- Sign out clears places from the phone (warns if some are not backed up).

## Next
1. UI feedback batch from Debanga (visual changes) — do as one pass, Opus.
2. Step 6: polish, then run the web-design-guidelines skill review.

## Parked
- Auto tags (11 Nov 2026: decided manual tags only for now). When picked up: Supabase Edge Function calls an AI vision API (Claude Haiku recommended), key in Supabase secrets, signed-in users only, photo shrunk to ~512 px, 6 s timeout; suggestions show as dashed chips on the preview, hidden when offline/signed out.

## Known small things
- Photos are captured square; the Places card is 3:4, so edges are cropped a little.
- Map streets need internet; offline it shows pins on black.
