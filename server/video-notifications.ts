import type { Env } from "./types";
import { withDefaults } from "./config";
import { sendMail } from "./security";

export async function notifyVideo(env: Env, id: string) {
  const e = withDefaults(env);
  if (!e.EMAIL || !e.EMAIL_FROM || !e.SITE_URL) return;
  const job = await e.DB.prepare("SELECT j.*,u.email,u.verified FROM jobs j JOIN users u ON u.id=j.user_id WHERE j.id=? AND j.kind='video' AND j.status IN ('completed','failed')")
    .bind(id).first<any>();
  if (!job || !job.verified || !JSON.parse(job.video_meta || "{}").notifyEmail) return;
  // Claim before sending: replaying a Workflow must not send duplicate emails.
  // An ambiguous send remains 'sending'; do not blindly repeat it.
  const claim = await e.DB.prepare("UPDATE jobs SET video_meta=json_set(video_meta,'$.emailStatus','sending') WHERE id=? AND json_extract(video_meta,'$.emailStatus') IS NULL")
    .bind(id).run();
  if (!claim.meta.changes) return;
  const complete = job.status === "completed";
  const link = `${e.SITE_URL!.replace(/\/$/, "")}/app/${job.mode === "studio" ? "video-studio" : "studio"}/${job.project_id}?job=${id}`;
  try {
    await sendMail(e, job.email,
      complete ? "Your video is ready — Scene" : "Your video could not be created — Scene",
      complete
        ? `Your video “${job.title}” is ready.\n\nWatch and download it from your account:\n${link}\n\nScene`
        : `Video “${job.title}” could not be created. Your video credits have been returned and your audio remains available.\n\nDetails and retry:\n${link}\n\nScene`);
    await e.DB.prepare("UPDATE jobs SET video_meta=json_set(video_meta,'$.emailStatus','sent') WHERE id=?").bind(id).run();
  } catch {
    await e.DB.prepare("UPDATE jobs SET video_meta=json_set(video_meta,'$.emailStatus','failed') WHERE id=?").bind(id).run();
    console.error("Video notification was not confirmed", { jobId: id });
  }
}
