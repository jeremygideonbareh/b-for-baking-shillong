# B for Baking: demo direction

Client: **B for Baking**, "Love at first bite", a Shillong boutique bakery and hamper studio (@b_for_baking, 9,087 followers).
Bio facts: eggless customised cakes, hampers, paid delivery, phone 7005246168 / 9436100919.
Reference picked by the designer: **Palmo** (palmo.co.in). Borrowed traits only, no assets or code:
- a counting preloader on a dark field
- a giant headline beside one 3D hero object
- the object splits open with orbiting stat badges
- the object morphs as you scroll, with a progress bar
- scalloped section edges
- a statement with highlighted word chips
- a product grid with + buttons
- a polaroid collage
- handwritten annotations with drawn arrows

## Visual thesis
"Love at first bite, built layer by layer." One Blender-made cake carries the whole scroll story:
1. It sits whole in the hero.
2. A slice pulls out to show the inside.
3. The layers come apart into an exploded view with handwritten labels.
4. The layers stack back up and the cake flies on into the cake wall.

The scalloped edges are piped buttercream borders, not waves.

## Tokens
- cream `#FBF5EC` (page), paper `#F4EADB`
- cocoa `#3A2419` (ink, dark sections), cocoa-2 `#4A2F22`
- blush `#F2C3C8` (Palmo's yellow role: badges, chips, blossoms), rose `#C24E68` (small highlights)
- gold `#C29A55` (foil accents, the stands in her photos)
- Type:
  - Fraunces (display: soft, warm, bakery-premium)
  - Caveat (handwritten annotations, which echo the cake-board writing in her photos)
  - DM Sans (UI and body)
  - Allura (wordmark script, close to her logo)

## Sections
1. Loader: a cocoa field, a line-drawn whisk "B" monogram, and a 000→100 counter bottom-left. A scalloped curtain lifts away.
2. Hero: "Love at first bite." with the 3D cake and a swaying cherry-blossom branch (she attends Shillong's Cherry Blossom Festival). Annotations: "100% eggless" and "made to order in Shillong". WhatsApp and Call CTAs. A marquee runs along the bottom.
3. The slice: pinned. A wedge slides out and badges orbit (Eggless, Customised, Hampers, 9,087 followers).
4. The layers: an exploded view with labels and a "BATTER 000 → BAKED 100" bar. The layers then restack, with "Keep slicing.." behind the cake.
5. A scalloped cocoa section: the statement, word by word, with chips (eggless, birthdays, weddings, hampers).
6. The cake wall: a pinned horizontal track of her real cakes, with inner parallax and a velocity marquee.
7. Occasions: a grid built from her highlights (He or She?, Bride to be, For Mom, Hampers, Tiramisu tub, Little ones). "+" adds an item to an enquiry list that becomes a WhatsApp message.
8. A scalloped cream section: "Made for your moments", with polaroids of real cakes flying into a fanned stack.
9. Hampers: a reel in a phone frame that scales on scroll, plus a real caption ("Hampers under ₹2000").
10. How to order: 3 steps with line icons that draw on scroll. The process images are AI-generated and labelled as such.
11. Footer: giant letters rising, tap-to-sprinkle, contacts, the motion switch and credits.

## Motion stack
GSAP 3.13 with ScrollTrigger, Lenis as the only smooth scroller, and a single fixed Three.js canvas for the cake.
Max motion by default, with a footer Motion On/Off switch. Touch: no pins except the horizontal track, native swipe reels, DPR ≤1.25.

## Honesty
- No invented reviews or stats.
- Photos come from her Instagram, for demo preview only.
- The process imagery is AI-generated and labelled.
- The 3D cake is original, made in Blender.
- To confirm with the client: whether the number is on WhatsApp, the delivery area, prices, lead times and flavours.
