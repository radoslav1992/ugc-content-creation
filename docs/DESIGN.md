# Scene design and showcase assets

Scene is a working name for the English edition. No domain purchase or availability claim is implied.

The theme uses an ivory canvas, charcoal workspace navigation, chartreuse actions, warm photography, and large editorial typography. The shared skin is `src/scene.css`, layered on the retained studio layout CSS. Public and authenticated routes share the logo and controls.

## Replace avatar media

Edit `src/showcase-media.ts`. Put replacement files in `public/avatars/` and reference same-origin paths. The app's Content Security Policy intentionally restricts images and video to its own origin.

```ts
{
  name: 'Your creator',
  style: 'Lifestyle',
  category: 'YOUR CATEGORY',
  headline: 'Your short example headline.',
  poster: '/avatars/your-creator.jpg',
  position: 'center',
  alt: 'A useful description of this portrait',
  // Optional:
  video: '/avatars/your-creator.mp4',
}
```

Remove `size` when replacing the provided triptych with standalone portraits. The default becomes `cover`. A GIF can be used as the poster, but MP4/WebM is preferable for moving demos because playback can be paused and respects reduced-motion settings. The showcase automatically rotates every 4.2 seconds, with manual selection and pause controls. Inactive videos are paused.

The initial three cards use `public/avatars/creator-triptych.png`, generated with the built-in image generation tool for this project. The file is not a provider demo or a customer endorsement. Its exact brief was:

> Use case: photorealistic-natural. Create one landscape contact sheet asset for an AI creator app landing page, exactly three equal vertical photographic panels edge-to-edge with no gutters. Each panel is a separate fictional adult UGC presenter, waist up facing the camera: left, a cheerful brunette woman about 30 in an ivory knit top, sunlit apartment with plants, holding an unbranded skincare bottle; center, a handsome Black man about 30 in sage green overshirt in a warm home recording studio; right, an East Asian woman about 35 with short dark hair wearing a rust orange shirt in an airy creative workspace. Authentic premium editorial lifestyle photography, natural skin texture, candid friendly confident expressions, soft sunlight, warm ivory/olive color grading, crisp real photographic detail. All heads and hands comfortably within their own panel. No typography, no text, no logos, no borders, no watermark. Aspect ratio 3:2. The three equal panels will be displayed as individually cropped portrait cards using CSS.

## Branding locations

- `src/lib.tsx`: logo wordmark.
- `public/favicon.svg`: app icon.
- `index.html`, `server/index.ts`: page title and metadata.
- `src/Public.tsx`, `src/Showcase.tsx`: marketing copy.
- `server/security.ts`, `server/auth.ts`, `server/video-notifications.ts`: email brand.
- `server/config.ts`: operator defaults, with no hardcoded domain/sender.
