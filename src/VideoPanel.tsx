import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Sparkles, ImagePlus } from "lucide-react";
import { videoTiers, videoCredits, type VideoTier } from "../shared/video";
import { api, Button, Notice, number, useAuth, type Job } from "./lib";
import { jobLink, jobStatus } from "./JobActivity";
export function VideoPanel({ jobs, approved, activeJob, submissionBlocked, onCreated, selectedAsset = "", onClearAsset }: { selectedAsset?: string; onClearAsset?: () => void; jobs: Job[]; approved: boolean; activeJob: Job | null; submissionBlocked: boolean; onCreated: (job: Job) => void }) {
  const { user, refresh } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tier, setTier] = useState<VideoTier>("medium");
  const [available, setAvailable] = useState<Record<VideoTier, boolean>>({ low: false, medium: false, high: false });
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const [configAttempt, setConfigAttempt] = useState(0);
  const sources = jobs.filter(j => j.kind !== "video" && j.status === "completed" && j.mode !== "podcast");
  const source = sources[0];
  let cost = 0, durationError = "";
  if (source) {
    try { cost = videoCredits(source.duration, tier); } catch (e) { durationError = (e as Error).message; }
  }
  const remaining = Math.max(0, (user?.limit || 0) - (user?.used || 0));
  useEffect(() => {
    let live = true;
    setEnabled(null);
    api("/videos/config").then(d => {
      if (!live) return;
      setEnabled(d.enabled); setEmailAvailable(d.emailNotifications);
      const enabledTiers = { low: !!d.tiers.low?.enabled, medium: !!d.tiers.medium?.enabled, high: !!d.tiers.high?.enabled };
      setAvailable(enabledTiers);
      setTier(current => enabledTiers[current] ? current : enabledTiers.medium ? "medium" : enabledTiers.low ? "low" : "high");
    }).catch(() => { if (live) setEnabled(false); });
    return () => { live = false; };
  }, [configAttempt]);
  useEffect(() => { key.current = crypto.randomUUID(); }, [source?.id]);
  useEffect(() => {
    if (!image) { setImageUrl(""); return; }
    const url = URL.createObjectURL(image); setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => { key.current = crypto.randomUUID(); setConsent(false); }, [selectedAsset]);
  const edit = (fn: () => void) => { setError(""); fn(); key.current = crypto.randomUUID(); };
  const generate = async () => {
    if (submitting.current || !source || !cost || !approved || submissionBlocked || activeJob || !enabled || !available[tier] || (!image && !selectedAsset) || !consent || !user?.verified || cost > remaining) return;
    submitting.current = true;
    setBusy(true); setError("");
    try {
      const body = new FormData();
      body.set("sourceId", source.id); body.set("tier", tier);
      body.set("idempotencyKey", key.current); body.set("credits", String(cost));
      body.set("consent", String(consent));
      body.set("notifyEmail", String(emailAvailable && notifyEmail));
      if (selectedAsset) body.set("assetId", selectedAsset);
      else if (image) body.set("image", image);
      const result = await api("/videos", { method: "POST", body });
      const { job } = await api("/jobs/" + result.id);
      onCreated(job); key.current = crypto.randomUUID(); await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section className="output-panel avatar-panel">
    <div className="sub-heading"><h2><Film size={22} /> Give your voice a face</h2><span>VIDEO AVATAR</span></div>
    <p>Turn a finished audio recording into a talking video. Upload a portrait and choose one of three quality levels.</p>
    <div aria-live="polite">
      {activeJob && <Notice>„{activeJob.title}” — {jobStatus(activeJob).toLowerCase()}. You can prepare your next video. Generation unlocks when the current request finishes. <Link to={jobLink(activeJob)}>Track request</Link></Notice>}
      {enabled === null && <p>Checking available quality levels…</p>}
      {enabled === false && <Notice>We could not load the available video quality levels. <button className="btn" type="button" onClick={() => setConfigAttempt(n => n + 1)}>Try again</button></Notice>}
      {!source && <p>Create and listen to a 5–60 second audio recording. You can prepare the portrait and quality settings now.</p>}
      {source && !approved && <Notice>Approve the selected voice version above to create a video. Your settings remain while you edit the script.</Notice>}
    </div>
      <fieldset disabled={busy} className="avatar-fields">
        {source && <div className="video-source-summary"><strong>Selected voice version</strong><p>{source.title} · {Math.ceil(source.duration)} sec. · {new Date(source.created_at * 1000).toLocaleString("en")}</p><small>To use another version, select it in the audio preview section.</small></div>}
        <div className="avatar-tiers" role="group" aria-label="Video quality">
          {(Object.keys(videoTiers) as VideoTier[]).map(id => <button type="button" key={id} disabled={!available[id]} aria-pressed={tier === id} className={tier === id ? "selected" : ""} onClick={() => edit(() => setTier(id))}>
            <strong>{videoTiers[id].name}</strong><span>{number(videoTiers[id].creditsPerSecond)} credits / sec.</span>
            <small>{available[id] ? videoTiers[id].description : "Temporarily unavailable"}</small>
          </button>)}
        </div>
        <div className="avatar-portrait">
          {selectedAsset && <div className="product-selected"><strong>Selected product avatar</strong><img src={`/api/media/assets/${selectedAsset}/file`} alt="Selected product avatar"/><button type="button" className="btn" onClick={onClearAsset}>Use another portrait</button></div>}
          <label><ImagePlus size={18} /> Your portrait<input type="file" accept="image/jpeg,image/png" onChange={e => edit(() => {
            const file = e.target.files?.[0] || null;
            if (file && file.size > 2 * 1024 * 1024) { setImage(null); e.target.value = ""; setError("Choose an image up to 2 MB."); return; }
            setImage(file); onClearAsset?.(); setConsent(false);
          })} /></label>
          <p className="small-note">JPG or PNG up to 2 MB, with a clearly visible face. Use a portrait image for vertical video.</p>
          {imageUrl && <img src={imageUrl} alt="Your video portrait" />}
          <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={e => edit(() => setConsent(e.target.checked))} /> I have the right to use this image and the consent of the person depicted.</label>
        </div>
        {emailAvailable && <label className="checkbox-label"><input type="checkbox" checked={notifyEmail} onChange={e => edit(() => setNotifyEmail(e.target.checked))} /> Email me when the video is ready or if an error occurs.</label>}
      </fieldset>
      {durationError && <Notice>{durationError}</Notice>}
      {error && <Notice>{error}</Notice>}
      <div className="generate-bar">
        <div><strong>{number(cost)} video credits</strong><small>Available: {number(remaining)} credits</small></div>
        <Button className="btn dark" busy={busy} disabled={submissionBlocked || !!activeJob || !source || !approved || !enabled || !available[tier] || !user?.verified || !cost || cost > remaining || (!image && !selectedAsset) || !consent} onClick={generate}>
          <Sparkles size={18} /> Create video · {number(cost)} credits
        </Button>
      </div>
      {cost > remaining && <p className="small-note">You do not have enough credits. <Link to="/app/billing">View plans</Link></p>}
      <p className="small-note">This cost is in addition to the existing audio. Each started second counts as a full second. Failed videos refund their video credits. You can close this page — the result will be waiting in your project.</p>
  </section>;
}
