# Other Shore Visual System

## Surface

A single-screen, full-bleed digital garden. The scene is the experience; controls recede to its edges. No cards, feature marketing, navigation pages, or scrolling content.

## Composition

The main Chinese title occupies the left upper-middle on desktop. Three staggered botanical hero plants anchor the right, backed by distant flower fields, a textured moon, mountain silhouettes, and a reflective lake. Mobile moves the flower group left and reduces the moon to maintain title clearance. The flowers use a CC0 specimen scan with real ruffled tepals, sweeping filaments, and a gently curved leafless stem; three geometric LODs keep the field practical on mobile. A 76px footer area preserves controls at small sizes.

## Palette

- Default sky: `#101e20`; fog: `#243b38`; water: `#081a19`.
- Default flower material: a scanned red botanical atlas with varied tones, captured petal creases, ruffled edges, and restrained fill light.
- Text: `#eeeae1`; supporting text: `#bdc6c0`; control accent: `#d95354`.
- Ember changes the scene toward muted warm light and rust-red blossoms.
- Mist changes the scene toward pale blush blossoms, gray-green water, and denser fog.

## Typography

Self-hosted Noto Serif SC, weights 300 and 400, subset to page characters. Desktop title is 96px, smaller desktop 78px, mobile 66px, compact mobile 53-58px. Georgia italic is used for the botanical name. All letter spacing remains 0.

## Controls

Lucide line icons, 40px round touch targets where space permits, 35px on compact footer controls. Three labeled scene options with small swatches use `aria-pressed`. Tooltips name icon actions. Hover, focus, loading, unavailable graphics, and capture status are implemented.

## Motion

GPU deformation sways flower geometry. Thin detached petals drift through the scene. Water reflects the garden and moon with animated normal distortion. Low clouds use noise in depth layers. Restrained depth of field follows the main hero plant as the camera moves. Pointer motion adds modest camera parallax; immersion moves the camera forward and hides inactive controls. System reduced-motion preference initially pauses the scene. Audio requires a user gesture.

## Verification

Playwright checked 1440x900, 1920x1080, 390x844, and 320x640. Canvas pixels, real animation, pause, sound, all palettes, keyboard exit, fullscreen, screenshot downloads, resource loading, and reduced motion passed. The flower geometry and texture come from the credited scan; the moonlit water garden remains an artistic environment.
