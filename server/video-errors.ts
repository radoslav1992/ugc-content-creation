const messages = {
  AUTH: "The video service has an access issue. Please contact support.",
  BALANCE: "The video service currently has no generation capacity. Please contact support.",
  ACCESS: "Access to this quality level is temporarily restricted. Please contact support.",
  INPUT: "The audio or portrait was not accepted for video. Contact support with the code below.",
  MEDIA: "The video service could not read the audio or portrait.",
  CAPACITY: "The video service is busy. Try again shortly.",
  CONTENT: "The content was not accepted for video generation.",
  TIMEOUT: "The video was not ready within the allowed time.",
  PROVIDER: "The video service returned a generation error.",
  INTERNAL: "The video could not be created due to a technical error.",
} as const;
type Category = keyof typeof messages;
export type VideoStage = "LOAD" | "SUBMIT" | "STATUS" | "RESULT" | "DOWNLOAD" | "SAVE" | "CLEANUP";
export class VideoFailure extends Error {
  constructor(stage: VideoStage, category: Category, status = 0) {
    // A fixed-format message survives serialization by Cloudflare Workflows.
    super(`VIDEO_${stage}_${category}_${status}`);
  }
}
export function videoFailureMessage(error: unknown, stage: VideoStage) {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\bVIDEO_(LOAD|SUBMIT|STATUS|RESULT|DOWNLOAD|SAVE|CLEANUP)_(AUTH|BALANCE|ACCESS|INPUT|MEDIA|CAPACITY|CONTENT|TIMEOUT|PROVIDER|INTERNAL)_(\d{1,3})\b/);
  const category: Category = match ? match[2] as Category : (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "TIMEOUT" : "INTERNAL");
  const code = match?.[0] || `VIDEO_${stage}_${category}_0`;
  return { code, message: `${messages[category]} Your video credits have been returned. Your audio remains available. Code: ${code}.` };
}
export async function providerFailure(response: Response, stage: VideoStage): Promise<VideoFailure> {
  const body = await response.json().catch(() => null) as any;
  const types = [body?.error_type, ...(Array.isArray(body?.detail) ? body.detail.map((d: any) => d?.type) : [])];
  // Some account/balance failures still use unstructured detail strings. Only
  // classify them; never persist or log raw bodies, input URLs, or input fields.
  const detail = typeof body?.detail === "string" ? body.detail.toLowerCase() : "";
  let category: Category = "PROVIDER";
  if (response.status === 401) category = "AUTH";
  else if (response.status === 402 || ((response.status === 403 || response.status === 400) && /balance|credits|top.?up/.test(detail))) category = "BALANCE";
  else if (response.status === 403) category = "ACCESS";
  else if (response.status === 429) category = "CAPACITY";
  else if (types.includes("content_policy_violation")) category = "CONTENT";
  else if (types.some(t => ["file_download_error", "file_download_failed", "audio_load_error", "image_load_error"].includes(t))) category = "MEDIA";
  else if (types.some(t => ["request_timeout", "generation_timeout", "startup_timeout"].includes(t))) category = "TIMEOUT";
  else if ([400, 422].includes(response.status)) category = "INPUT";
  return new VideoFailure(stage, category, response.status);
}
