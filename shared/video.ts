export const videoTiers = {
  low: { name: "Low quality", description: "An economical option for your portrait", creditsPerSecond: 300 },
  medium: { name: "Medium quality", description: "A balance of detail and cost", creditsPerSecond: 900 },
  high: { name: "High quality", description: "More detail and expressive movement", creditsPerSecond: 1800 },
} as const;
export type VideoTier = keyof typeof videoTiers;
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 60;
export function videoCredits(seconds: number, tier: VideoTier) {
  if (!Number.isFinite(seconds) || seconds < MIN_VIDEO_SECONDS || seconds > MAX_VIDEO_SECONDS)
    throw new Error("Use a 5–60 second recording for video.");
  return Math.ceil(seconds) * videoTiers[tier].creditsPerSecond;
}
