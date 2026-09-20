import { ProductAvatarPanel } from "./MediaTools";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Film, Mic, Sparkles, Save, Check, ArrowRight } from "lucide-react";
import { api, post, Button, Notice, number, useAuth, type Job } from "./lib";
import { jobsChanged, jobStatus, useJobs } from "./JobActivity";
import { emotionTags, studioMaxChars, validateStudioScript } from "../shared/studio";
import { StudioVoicePicker } from "./StudioVoicePicker";
import type { StudioVoice } from "../shared/studio";
import { VideoPanel } from "./VideoPanel";
import { mergeJobs } from "./job-state";
import { CaptionEditor } from "./CaptionEditor";
import "./video-studio.css";

export function VideoStudio() {
  const { id } = useParams(), navigate = useNavigate(), [params] = useSearchParams();
  const [productAvatar,setProductAvatar] = useState(params.get("avatar") || "");
  const { user, refresh } = useAuth(), { jobs: allJobs, error: pollingError } = useJobs();
  const [title, setTitle] = useState("My video story"), [script, setScript] = useState(""), [voice, setVoice] = useState<string>("");
  const [voices, setVoices] = useState<readonly StudioVoice[]>([]);
  const [voiceError, setVoiceError] = useState(""), [voicesLoaded, setVoicesLoaded] = useState(false);
  const catalogRequest = useRef(0);
  const [enabled, setEnabled] = useState(false), [loading, setLoading] = useState(!!id), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [dirty, setDirty] = useState(false), [tone, setTone] = useState("ad"), [suggestion, setSuggestion] = useState(""), [undo, setUndo] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState(""), [approved, setApproved] = useState(""), [selectedVideo, setSelectedVideo] = useState("");
  const [localJobs, setLocalJobs] = useState<Job[]>([]);
  const [videoFormKey, setVideoFormKey] = useState(() => crypto.randomUUID());
  const projectId = useRef(id), key = useRef(crypto.randomUUID()), editor = useRef<HTMLTextAreaElement>(null), skipLoad = useRef("");
  const jobs = mergeJobs(localJobs, allJobs).filter(j => j.project_id === id).sort((a, b) => b.created_at - a.created_at);
  const audioJobs = jobs.filter(j => j.kind !== "video"), videoJobs = jobs.filter(j => j.kind === "video");
  const audio = audioJobs.find(j => j.id === selectedAudio) || audioJobs[0] || null;
  const video = videoJobs.find(j => j.id === selectedVideo) || videoJobs[0] || null;
  const activeJob = mergeJobs(localJobs.filter(j => j.project_id === id), allJobs).find(j => ["queued", "running"].includes(j.status)) || null;
  const active = !!activeJob;
  const sourceId = video?.status === "completed" ? video.source_job_id : audio?.status === "completed" ? audio.id : undefined;
  const remaining = Math.max(0, (user?.limit || 0) - (user?.used || 0));
  let cost = script.length * 3, scriptError = "";
  try { cost = validateStudioScript(script); } catch (e) { scriptError = (e as Error).message; }
  const loadVoices = async () => {
    const request = ++catalogRequest.current;
    try {
      const d = await api<{ enabled: boolean; voices: StudioVoice[] }>("/video-studio/config");
      if (!Array.isArray(d.voices)) throw new Error("The voice list could not load. Try again.");
      if (request !== catalogRequest.current) return;
      setEnabled(d.enabled); setVoices(d.voices); setVoicesLoaded(true); setVoiceError("");
    } catch (e) { if (request === catalogRequest.current) setVoiceError((e as Error).message); }
  };
  useEffect(() => {
    void loadVoices();
    const refreshVoices = () => { void loadVoices(); };
    window.addEventListener("focus", refreshVoices); window.addEventListener("scene:studio-voices-changed", refreshVoices);
    return () => { catalogRequest.current++; window.removeEventListener("focus", refreshVoices); window.removeEventListener("scene:studio-voices-changed", refreshVoices); };
  }, []);
  useEffect(() => { if (!id && !voice && voices.length) setVoice(voices[0].id); }, [id, voice, voices]);
  useEffect(() => {
    let live = true;
    if (projectId.current !== id) setVideoFormKey(crypto.randomUUID());
    projectId.current = id; setApproved(""); setSuggestion("");
    if (!id) { setTitle("My video story"); setScript(""); setVoice(""); setDirty(false); setLoading(false); return; }
    if (skipLoad.current === id) { skipLoad.current = ""; return; }
    setLoading(true);
    api("/projects/" + id).then(({ project }) => {
      if (!live) return;
      if (project.mode !== "studio") { navigate("/app/studio/" + id, { replace: true }); return; }
      setTitle(project.title); setScript(project.script); setVoice(project.voice); setDirty(false);
    }).catch(e => live && setError(e.message)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [id]);
  useEffect(() => {
    const jobId = params.get("job"); if (!jobId || !id) return;
    api<{ job: Job }>("/jobs/" + encodeURIComponent(jobId)).then(({ job }) => {
      if (job.project_id !== id) return;
      setLocalJobs(j => [job, ...j.filter(x => x.id !== job.id)]);
      if (job.kind === "video") { setSelectedVideo(job.id); setSelectedAudio(job.source_job_id || ""); } else setSelectedAudio(job.id);
    }).catch(e => setError(e.message));
  }, [id, params.get("job")]);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const edit = (fn: () => void) => { fn(); setDirty(true); setSuggestion(""); setApproved(""); key.current = crypto.randomUUID(); };
  const save = async () => {
    const body = { title, mode: "studio", script, voice, second_voice: "boris", pause_ms: 0 };
    let savedId = projectId.current;
    if (savedId) await api("/projects/" + savedId, { method: "PUT", body: JSON.stringify(body) });
    else { const result = await post("/projects", body); savedId = result.id; projectId.current = savedId; skipLoad.current = savedId!; navigate("/app/video-studio/" + savedId, { replace: true }); }
    setDirty(false); return savedId!;
  };
  const generate = async () => {
    setBusy(true); setError(""); setApproved("");
    try {
      const savedId = await save();
      const { id: jobId } = await post("/generate", { projectId: savedId, idempotencyKey: key.current, credits: cost });
      const { job } = await api("/jobs/" + jobId);
      setLocalJobs(j => [job, ...j.filter(x => x.id !== job.id)]); setSelectedAudio(jobId); setSelectedVideo("");
      key.current = crypto.randomUUID(); jobsChanged(); await refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const assist = async () => {
    setBusy(true); setError("");
    try { const d = await post("/video-studio/delivery", { text: script, tone }); setSuggestion(d.text); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const insertTag = (tag: string) => {
    const start = editor.current?.selectionStart ?? script.length;
    edit(() => setScript(script.slice(0, start) + `[${tag}]` + script.slice(start)));
    requestAnimationFrame(() => { editor.current?.focus(); editor.current?.setSelectionRange(start + tag.length + 2, start + tag.length + 2); });
  };
  if (loading) return <p>Loading Video Studio…</p>;
  return <div className="video-studio">
    <header className="vs-heading"><div><span className="eyebrow">FROM SCRIPT TO SCREEN</span><h1>Your Video Studio.</h1><p>A voice with character. A face for your story. Words that stand out.</p></div><Link className="btn" to="/app/studio"><Mic size={17} /> Audio only</Link></header>
    <div className="vs-steps"><span><b>01</b> Script & voice</span><ArrowRight size={18} /><span><b>02</b> Approve & animate</span><ArrowRight size={18} /><span><b>03</b> Captions & export</span></div>
    {error && <Notice>{error}</Notice>}{pollingError && <Notice>{pollingError}</Notice>}
    {!enabled && <Notice>Video Studio is ready. Premium speech will be available once activated.</Notice>}
    <div className="vs-layout"><section className="vs-card vs-script"><div className="sub-heading"><h2><Film size={23} /> Start your story</h2><span>01 / SCRIPT</span></div>
      <fieldset disabled={busy}><label>Project name<input value={title} maxLength={120} onChange={e => edit(() => setTitle(e.target.value))} /></label>
      {voiceError && <Notice>{voiceError} <button type="button" className="text-link" onClick={() => void loadVoices()}>Reload voices</button></Notice>}
      {!voicesLoaded && !voiceError && <p>Loading voices…</p>}
      {voicesLoaded && !voices.length && <Notice>There are no active video voices yet. An administrator can add one in Settings.</Notice>}
      <StudioVoicePicker voices={voices} selected={voice} onSelect={id => edit(() => setVoice(id))} />
      <label htmlFor="video-script">Your script</label><div className="vs-tags">{emotionTags.map(([tag, label]) => <button key={tag} onClick={() => insertTag(tag)} title={`[${tag}]`}>{label}</button>)}</div>
      <textarea ref={editor} id="video-script" value={script} maxLength={studioMaxChars} rows={10} placeholder="[curious]Sometimes all it takes is one voice to bring a story to life…" onChange={e => edit(() => setScript(e.target.value))} />
      <div className="vs-counter"><span>Tags in [brackets] guide the voice. Expression depends on the selected voice.</span><strong>{number(script.length)} / {number(studioMaxChars)}</strong></div>
      <div className="vs-assistant"><label>Mood<select value={tone} onChange={e => setTone(e.target.value)}><option value="ad">Confident ad</option><option value="story">Engaging story</option><option value="calm">Calm narration</option></select></label><Button className="btn" disabled={!!scriptError || !user?.verified} onClick={assist}><Sparkles size={17} /> Suggest emotions</Button></div><small>Up to 5 suggestions per day are included. The words stay yours.</small>
      {suggestion && <div className="vs-suggestion"><strong>Suggestion — review before applying</strong><p>{suggestion}</p><button className="btn dark" onClick={() => { setUndo(script); edit(() => setScript(suggestion)); }}>Apply</button><button className="btn" onClick={() => setSuggestion("")}>Discard</button></div>}
      {undo !== null && <button className="btn" onClick={() => { edit(() => setScript(undo)); setUndo(null); }}>Restore previous script</button>}
      </fieldset>
      <div className="vs-actions"><Button className="btn" busy={busy} disabled={!title.trim() || !voices.some(v => v.id === voice)} onClick={async () => { setBusy(true); try { await save(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><Save size={17} /> {dirty || !id ? "Save project" : "Saved"}</Button><Button className="btn primary" busy={busy} disabled={!enabled || !voices.some(v => v.id === voice) || active || !!scriptError || !title.trim() || cost > remaining || !user?.verified} onClick={generate}><Mic size={17} /> Generate voice · {number(cost)} credits</Button></div>
      {script.length > 0 && scriptError && <Notice>{scriptError}</Notice>}
      {cost > remaining && <p>You need another {number(cost - remaining)} credits. <Link to="/app/billing">View plans</Link></p>}
      <p className="vs-fine">3 credits per character, including tags. Each new voice generation is charged. Video is charged separately after approval. Aim for 5–60 seconds — usually around 50–120 words.</p>
    </section><aside className="vs-card vs-review"><span className="eyebrow">02 / LISTEN FIRST</span><h2>Hear it. Then bring it to life.</h2><p>Check the pronunciation and emotion before creating a video.</p>
      {audioJobs.length > 0 && <label>Voice version<select value={audio?.id || ""} onChange={e => { setSelectedAudio(e.target.value); setApproved(""); }}>{audioJobs.map(j => <option key={j.id} value={j.id}>{new Date(j.created_at * 1000).toLocaleString("en")} · {jobStatus(j)}</option>)}</select></label>}
      {!audio && <div className="vs-audio-empty"><Mic size={35} /><p>Your voice recording will appear here.</p></div>}
      {audio?.status === "failed" && <Notice>{audio.error}</Notice>}
      {audio && ["queued", "running"].includes(audio.status) && <Notice>Your voice is generating in the background. You can leave and return to this project.</Notice>}
      {audio?.status === "completed" && <><audio key={audio.id} controls src={`/api/jobs/${audio.id}/audio`} /><a href={`/api/jobs/${audio.id}/audio`} download className="btn">Download WAV</a><p>{audio.duration.toFixed(1)} seconds · {number(audio.chars)} credits for this version</p><Button className={approved === audio.id ? "btn dark" : "btn primary"} onClick={() => setApproved(audio.id)}><Check size={17} /> {approved === audio.id ? "Voice approved" : "Approve this voice"}</Button></>}
      <p className="vs-fine">Script changes do not alter previously generated recordings.</p>
    </aside></div>
    <details className="vs-card"><summary>Create an avatar with your product</summary><ProductAvatarPanel onSelect={id => {setProductAvatar(id); document.getElementById("video-avatar")?.scrollIntoView({behavior:"smooth"});}} /></details>
    <div id="video-avatar" />
    <VideoPanel selectedAsset={productAvatar} onClearAsset={() => setProductAvatar("")} key={videoFormKey} jobs={audio ? [audio] : []} approved={!!audio && audio.id === approved} activeJob={activeJob} submissionBlocked={busy} onCreated={j => { setLocalJobs(list => mergeJobs(list, [j])); setSelectedVideo(j.id); jobsChanged(); }} />
    {videoJobs.length > 0 && <section className="vs-card"><h2>Your videos</h2><select aria-label="Video version" value={video?.id || ""} onChange={e => setSelectedVideo(e.target.value)}>{videoJobs.map(j => <option key={j.id} value={j.id}>{new Date(j.created_at * 1000).toLocaleString("en")} · {jobStatus(j)}</option>)}</select>{video?.status === "failed" && <Notice>{video.error}</Notice>}{video && ["queued", "running"].includes(video.status) && <Notice>{jobStatus(video)}. Processing continues in the background. Your finished video will appear in this project.</Notice>}</section>}
    {sourceId && <CaptionEditor key={sourceId} audioId={sourceId} video={video?.status === "completed" ? video : null} />}
  </div>;
}
