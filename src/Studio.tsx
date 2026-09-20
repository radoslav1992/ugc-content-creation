import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  Check,
  Download,
  FileText,
  Headphones,
  Plus,
  Podcast,
  Save,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";

import { jobsChanged, jobStatus } from "./JobActivity";
import { voiceList } from "../shared/catalog";
import { segments } from "../shared/text";
import {
  api,
  post,
  number,
  Notice,
  Button,
  VoiceCard,
  useAuth,
  type Voice,
  type Job,
} from "./lib";
const examples: Record<string, string> = {
  tts: "Every great story starts with an idea. Today we will give yours a voice — clear, confident, and unmistakably yours.",
  podcast:
    "1: Hello and welcome! Today we are talking about the power of great ideas.\n2: And how to give them a voice. Sometimes it all begins with a single sentence.\n1: Exactly. What story would you like to tell?",
  voiceover:
    "Imagine content that is not just seen, but remembered. Give your next idea a voice.",
};
export function Studio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const [title, setTitle] = useState("My new recording");
  const [mode, setMode] = useState(
    ["tts", "podcast", "voiceover"].includes(params.get("mode") || "")
      ? params.get("mode")!
      : "tts",
  );
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState(
    voiceList.some((v) => v.id === params.get("voice"))
      ? params.get("voice")!
      : "mila",
  );
  const [second, setSecond] = useState("boris");
  const [pause, setPause] = useState(400);
  const [voices, setVoices] = useState<Voice[]>(voiceList);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [dirty, setDirty] = useState(false);
  const projectId = useRef<string | undefined>(id);
  const requestKey = useRef<string>(crypto.randomUUID());
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api("/voices")
      .then((d) => setVoices(d.voices))
      .catch(() => {});
  }, []);
  useEffect(() => {
    projectId.current = id;
    setJob(null);
    setHistory([]);
    if (id) {
      setLoading(true);
      api("/projects/" + id)
        .then(({ project: p }) => {
          if (p.mode === "studio") { navigate("/app/video-studio/" + id + location.search, { replace: true }); return; }
          setTitle(p.title);
          setMode(p.mode);
          setScript(p.script);
          setVoice(p.voice);
          setSecond(p.second_voice);
          setPause(p.pause_ms);
          setDirty(false);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      api("/jobs")
        .then((d) => {
          const list = d.jobs.filter((j: Job) => j.project_id === id);
          setHistory(list);
          setJob(list.find((j: Job) => j.id === params.get("job")) || list[0] || null);
          const selectedId = params.get("job");
          if (selectedId && !list.some((j: Job) => j.id === selectedId)) {
            api("/jobs/" + encodeURIComponent(selectedId)).then(({ job: selected }) => {
              if (selected.project_id === projectId.current) setJob(selected);
            }).catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      setTitle("My new recording");
      setScript("");
      setMode(
        ["tts", "podcast", "voiceover"].includes(params.get("mode") || "")
          ? params.get("mode")!
          : "tts",
      );
      setVoice(
        voiceList.some((v) => v.id === params.get("voice"))
          ? params.get("voice")!
          : "mila",
      );
      setSecond("boris");
      setDirty(false);
    }
  }, [id, params.toString()]);
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    let stopped = false;
    const timer = setInterval(
      () =>
        api("/jobs/" + job.id)
          .then(({ job: j }) => {
            if (stopped) return;
            setJob(j);
            if (["completed", "failed"].includes(j.status)) {
              requestKey.current = crypto.randomUUID();
              void refresh();
              jobsChanged();
              api("/jobs")
                .then((d) =>
                  setHistory(
                    d.jobs.filter(
                      (x: Job) => x.project_id === projectId.current,
                    ),
                  ),
                )
                .catch(() => {});
            }
          })
          .catch((e) => setError(e.message)),
      3500,
    );
    return () => { stopped = true; clearInterval(timer); };
  }, [job?.id, job?.status]);
  useEffect(() => {
    if (!dirty) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onLink = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        anchor &&
        anchor.origin === location.origin &&
        anchor.pathname !== location.pathname &&
        !confirm("You have unsaved changes. Leave this project?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", f);
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("beforeunload", f);
      document.removeEventListener("click", onLink, true);
    };
  }, [dirty]);
  const edit = (fn: () => void) => {
    fn();
    setDirty(true);
    setNotice("");
    requestKey.current = crypto.randomUUID();
  };
  const save = async () => {
    const payload = {
      title,
      mode,
      script,
      voice,
      second_voice: second,
      pause_ms: pause,
    };
    if (projectId.current)
      await api("/projects/" + projectId.current, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    else {
      const r = await post("/projects", payload);
      projectId.current = r.id;
      navigate("/app/studio/" + r.id, { replace: true });
    }
    setDirty(false);
    return projectId.current!;
  };
  const generate = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const pid = await save();
      const r = await post("/generate", {
        projectId: pid,
        idempotencyKey: requestKey.current,
      });
      const d = await api("/jobs/" + r.id);
      setJob(d.job);
      jobsChanged();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  let chars = script.trim().length;
  try {
    chars = segments(script, mode, voice, second).reduce(
      (sum, s) => sum + s.text.length,
      0,
    );
  } catch {
    /* Invalid dialogue is rejected by the server on generation. */
  }
  const active = !!job && ["queued", "running"].includes(job.status);
  const selected = voices.find((v) => v.id === voice)!;
  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div>
          <Link to="/app/projects" className="breadcrumb">
            <ArrowLeft size={15} />
            My projects
          </Link>
          <input
            className="project-title-input"
            aria-label="Project name"
            value={title}
            maxLength={120}
            onChange={(e) => edit(() => setTitle(e.target.value))}
          />
          <span className="save-state">
            {dirty
              ? "Unsaved changes"
              : projectId.current
                ? "All changes saved"
                : "New project"}
          </span>
        </div>
        <Button
          className="btn outline"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await save();
              setNotice("Project saved.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={17} />
          Save
        </Button>
      </div>
      {error && <Notice>{error}</Notice>}
      {notice && <Notice good>{notice}</Notice>}
      {loading ? (
        <div className="empty-state">Loading project…</div>
      ) : (
        <>
          <div className="studio-layout">
            <section className="editor-panel">
              <div className="studio-mode-tabs">
                {[
                  ["tts", "Text to speech", FileText],
                  ["podcast", "Podcast", Podcast],
                  ["voiceover", "Voiceover", Video],
                ].map(([m, label, I]) => {
                  const Icon = I as typeof FileText;
                  return (
                    <button
                      key={m as string}
                      className={mode === m ? "active" : ""}
                      onClick={() => edit(() => setMode(m as string))}
                    >
                      <Icon size={17} />
                      {label as string}
                    </button>
                  );
                })}
              </div>
              <div className="editor-toolbar">
                <span>
                  {mode === "podcast" ? "PODCAST SCRIPT" : "YOUR SCRIPT"}
                </span>
                <div>
                  <button onClick={() => fileRef.current?.click()}>
                    <Upload size={15} />
                    Upload .txt
                  </button>
                  <input
                    hidden
                    ref={fileRef}
                    type="file"
                    accept=".txt,text/plain"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 60000) {
                        setError("The text file must be 60 KB or smaller.");
                        return;
                      }
                      const t = await f.text();
                      if (t.length > 14000) {
                        setError(
                          "The script is too long. Drafts support up to 14,000 characters.",
                        );
                        return;
                      }
                      edit(() => setScript(t));
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              {mode === "podcast" && (
                <div className="podcast-help">
                  <Podcast size={19} />
                  <p>
                    Start each turn with <strong>1:</strong> or{" "}
                    <strong>2:</strong>. Each host uses their selected voice.
                  </p>
                </div>
              )}
              <textarea
                className="script-editor"
                aria-label="Voiceover script"
                value={script}
                maxLength={14000}
                onChange={(e) => edit(() => setScript(e.target.value))}
                placeholder={
                  mode === "podcast"
                    ? "1: Hello and welcome…\n2: Happy to be here."
                    : mode === "voiceover"
                      ? "Your next ad, lesson, or video starts with these words…"
                      : "Paste your script here.\nOr start with a single sentence…"
                }
              />
              {!script && (
                <button
                  className="example-button"
                  onClick={() => edit(() => setScript(examples[mode]))}
                >
                  <Sparkles size={15} />
                  Try an example script
                </button>
              )}
              <div className="editor-footer">
                <span>{number(chars)} / 10 000 characters</span>
                <span>
                  ≈ {Math.max(1, Math.round(chars / 850))} min · estimated
                </span>
              </div>
              {mode === "podcast" && (
                <div className="podcast-actions">
                  <button
                    className="btn outline small-btn"
                    onClick={() => edit(() => setScript(script + "\n1: "))}
                  >
                    <Plus size={15} />
                    Host 1
                  </button>
                  <button
                    className="btn outline small-btn"
                    onClick={() => edit(() => setScript(script + "\n2: "))}
                  >
                    <Plus size={15} />
                    Host 2
                  </button>
                </div>
              )}
              <div className="generate-bar">
                <div>
                  <span className="generation-cost">
                    <AudioLines size={17} />
                    {number(chars)} credits
                  </span>
                  <small>
                    Available:{" "}
                    {number(
                      Math.max(0, (user?.limit || 0) - (user?.used || 0)),
                    )}
                  </small>
                </div>
                <Button
                  className="btn primary"
                  busy={busy || active}
                  disabled={
                    !script.trim() ||
                    !user?.verified ||
                    chars > 10000 ||
                    loading
                  }
                  onClick={generate}
                >
                  <Sparkles size={18} />
                  {active ? "Creating…" : "Generate audio"}
                </Button>
              </div>
            </section>
            <aside className="voice-panel">
              <div className="panel-heading">
                <h2>
                  <Headphones size={19} />
                  Voice & delivery
                </h2>
                <span>30 voices</span>
              </div>
              {mode === "podcast" && (
                <label className="speaker-label">
                  Host 2
                  <select
                    value={second}
                    onChange={(e) => edit(() => setSecond(e.target.value))}
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.tone}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="speaker-label">
                {mode === "podcast" ? "Host 1" : "Selected voice"}
              </label>
              <VoiceCard voice={selected} selected />
              <label className="voice-search-label">
                <span>Change voice</span>
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search voices…"
                  aria-label="Search voices"
                />
              </label>
              <div className="voice-options">
                {voices
                  .filter((v) =>
                    (v.name + " " + v.tone)
                      .toLowerCase()
                      .includes(filter.toLowerCase()),
                  )
                  .map((v) => (
                    <button
                      key={v.id}
                      className={v.id === voice ? "active" : ""}
                      onClick={() => edit(() => setVoice(v.id))}
                    >
                      <span className={"voice-avatar " + v.color}>
                        {v.name[0]}
                      </span>
                      <span>
                        <strong>{v.name}</strong>
                        <small>{v.tone}</small>
                      </span>
                      {voice === v.id && <Check size={16} />}
                    </button>
                  ))}
              </div>
              <label className="pause-control">
                Pause between segments{" "}
                <strong>{(pause / 1000).toFixed(1)} sec.</strong>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="100"
                  value={pause}
                  onChange={(e) => edit(() => setPause(Number(e.target.value)))}
                />
              </label>
              <p className="small-note">
                Check names, abbreviations, and pronunciation before
                publishing.
              </p>
            </aside>
          </div>
          <section className="output-panel">
            <div className="sub-heading">
              <h2>
                <AudioLines size={20} />
                Your recording
              </h2>
              <button
                className="text-link"
                disabled={!script}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(
                    new Blob([script], { type: "text/plain;charset=utf-8" }),
                  );
                  a.download = "scenario.txt";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                }}
              >
                <Download size={15} />
                Script
              </button>
            </div>
            {!job ? (
              <div className="output-empty">
                <Headphones size={24} />
                <p>Your finished audio will appear here.</p>
              </div>
            ) : job.status === "completed" ? (
              <div className="audio-result">
                <div>
                  <strong>{job.title}</strong>
                  <span>
                    {Math.floor(job.duration / 60)}:
                    {String(Math.round(job.duration % 60)).padStart(2, "0")} ·
                    {job.kind === "video" ? "MP4" : "WAV"}
                  </span>
                </div>
                {job.kind === "video" ? <video className="avatar-result" key={job.id} controls preload="metadata" src={"/api/jobs/" + job.id + "/video"} /> : <audio
                  key={job.id}
                  controls
                  preload="metadata"
                  src={"/api/jobs/" + job.id + "/audio"}
                />}
                <a
                  className="btn dark"
                  href={"/api/jobs/" + job.id + (job.kind === "video" ? "/video" : "/audio") + "?download=1"}
                >
                  <Download size={17} />
                  {job.kind === "video" ? "Download MP4" : "Download WAV"}
                </a>
              </div>
            ) : job.status === "failed" ? (
              <Notice>{job.error}</Notice>
            ) : (
              <div className="output-empty">
                <AudioLines className="pulse" size={32} />
                <p>
                  {jobStatus(job)}. You can close this page — your recording will be waiting here.
                </p>
              </div>
            )}
            {history.length > 1 && (
              <details className="version-history">
                <summary>Previous recordings ({history.length})</summary>
                {history.map((j) => (
                  <div key={j.id}>
                    <span>
                      {new Date(j.created_at * 1000).toLocaleString("en")}
                    </span>
                    <span>
                      {j.status === "completed"
                        ? "Ready"
                        : j.status === "failed"
                          ? "Failed"
                          : "Creating"}
                    </span>
                    {j.status === "completed" && (
                      <button className="text-link" disabled={active} onClick={() => setJob(j)}>
                        {j.kind === "video" ? "Watch video" : "Listen"}
                      </button>
                    )}
                  </div>
                ))}
              </details>
            )}
          </section>
          <section className="output-panel"><h2>Give your story a face.</h2><p>Create a video in the dedicated studio — with an expressive voice, emotion, and captions.</p><Link className="btn primary" to="/app/video-studio">Open Video Studio</Link></section>
        </>
      )}
    </div>
  );
}
