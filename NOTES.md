# Where we are (handoff notes)

Read `CLAUDE.md` first. This file is the short state of the build, for starting a new chat.

Live app: https://placeholder-three-flax.vercel.app (Vercel deploys every push to `main`).

## Done
- Step 1: camera screen (opens straight into the back camera, GPS starts on open, Pin only + shutter, swipe up or the small bottom bar or the "places" pill opens Places).
- Step 2: preview + save on the phone (IndexedDB), Saved pin animation, area names filled in when online (OpenStreetMap Nominatim).
- Step 3: Places viewer (big card, swipe left/right, filmstrip), flip card to edit title/note/tags, "…" menu (Open in Maps, Delete with confirm), dark Leaflet map with photo pins.
- Step 4: cloud backup (Supabase) + Google sign-in. Built and pushed; **real sign-in on iPhone and Android still being tested**.

## Step 4 details
- Supabase project `placeholder`, id `piucpyzjxjmidevhahtx`, region Mumbai. Schema in `supabase/schema.sql` (table `places`, private bucket `photos/<user id>/<place id>.jpg`, owner-only rules).
- Public settings in `src/config.js` (Supabase URL, publishable key, Google client ID). None are secret.
- Sign-in: Google's own button (popup) gives an ID token, then `supabase.auth.signInWithIdToken` with a nonce (`src/components/GoogleButton.jsx`, `src/hooks/useAuth.js`). If this fails inside the iPhone home-screen app, the fallback is Supabase's redirect sign-in (`signInWithOAuth`); the Google client already has the Supabase callback URL for that.
- Sync (`src/lib/sync.js`, `src/hooks/useSync.js`): phone first. Each place has `updatedAt`, `synced`, `deleted`. Push uploads unsynced places and photos; deletes are sent as `deleted = true`. Pull reads all rows; latest `updatedAt` wins; photos are downloaded for places the phone doesn't have. Runs on sign-in, every local change (1.5 s later), when the internet returns, when the app reopens, and every minute.
- Sign out clears places from the phone (warns if some are not backed up).

## Next
1. Finish Step 4 testing on both phones (iPhone home-screen app first).
2. UI feedback batch from Debanga (visual changes) — do as one pass, Opus.
3. Step 5: auto tags (AI vision via a server function; key stays secret).
4. Step 6: polish, then run the web-design-guidelines skill review.

## Known small things
- Photos are captured square; the Places card is 3:4, so edges are cropped a little.
- Suggested tags on the preview (cafe, blue door, plants, street) are placeholders until Step 5.
- Map streets need internet; offline it shows pins on black.
