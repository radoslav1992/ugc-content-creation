import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  AudioLines,
  Clock3,
  FileText,
  Folder,
  MoreHorizontal,
  Plus,
  Podcast,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { api, number, Notice, useAuth, type Project, type Job } from "./lib";
import { useJobs, jobLink, jobStatus } from "./JobActivity";
const icons = { tts: FileText, podcast: Podcast, voiceover: Video };
const statusNames: Record<string, string> = {
  completed: "Ready",
  running: "Creating",
  queued: "Queued",
  failed: "Failed",
};
export function Dashboard() {
  const { user, refresh } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const { jobs, error: jobsError } = useJobs();
  const [error, setError] = useState("");
  useEffect(() => {
    api("/projects")
      .then((p) => {
        setProjects(p.projects);
      })
      .catch((e) => setError(e.message));
    void refresh();
  }, []);
  const done = jobs.filter((j) => j.status === "completed");
  return (
    <div className="app-page">
      <div className="workspace-topline">
        <span>Your workspace</span>
        <span>
          {new Date().toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="page-heading with-action">
        <div>
          <h1>
            Hello, {user?.name.split(" ")[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p>What will you create today?</p>
        </div>
        <Link to="/app/studio" className="btn dark">
          <Plus size={18} />
          New recording
        </Link>
      </div>
      {error && <Notice>{error}</Notice>}
      <section id="activity" className="background-recordings">
        <div className="sub-heading"><h2>Your recordings</h2><span>Updates automatically</span></div>
        <p>You do not need to wait here. Recordings continue processing when you close the app.</p>
        {jobsError && <Notice>{jobsError}</Notice>}
        {jobs.length ? [...jobs.filter(j => ["queued", "running"].includes(j.status)), ...jobs.filter(j => !["queued", "running"].includes(j.status)).slice(0, 5)].map(j => <article className="background-recording" key={j.id}>
          <div><strong>{j.title}</strong><small>{j.kind === "video" ? "Video" : "Audio"} · {new Date(j.created_at * 1000).toLocaleString("en-US")}</small></div>
          <span className={"status " + j.status}>{jobStatus(j)}</span>
          <div className="recording-actions"><Link className="btn outline small-btn" to={jobLink(j)}>{j.status === "completed" ? "Open" : "Details"}</Link>
            {j.status === "completed" && <a className="btn dark small-btn" href={`/api/jobs/${j.id}/${j.kind === "video" ? "video" : "audio"}?download=1`}>Download {j.kind === "video" ? "MP4" : "WAV"}</a>}</div>
          {j.notify_email && <small className="recording-email">{j.email_status === "sent" ? "Email notification sent." : j.email_status === "failed" ? "Email delivery was not confirmed. Your result is still available here." : j.email_status === "sending" ? "Your email notification is being processed." : "We will email you when processing finishes."}</small>}
        </article>) : <p className="small-note">Your finished and in-progress recordings will appear here.</p>}
      </section>
      <div className="dashboard-banner">
        <div>
          <span className="eyebrow">FROM WORDS TO SOMETHING WONDERFUL</span>
          <h2>
            Your next big idea
            <br />
            starts right here.
          </h2>
          <p>Create an audio recording and bring it to life as a talking video.</p>
          <Link className="btn dark" to="/app/studio">
            Open studio <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="banner-disc">
          <AudioLines size={85} />
          <span>YOUR VOICE. YOUR STORY.</span>
        </div>
      </div>
      <div className="stat-grid">
        <div>
          <span>
            <AudioLines size={18} />
            Available credits
          </span>
          <strong>
            {number(Math.max(0, (user?.limit || 0) - (user?.used || 0)))}
          </strong>
          <small>of {number(user?.limit || 1000)} in this period</small>
        </div>
        <div>
          <span>
            <Folder size={18} />
            My projects
          </span>
          <strong>{projects.length}</strong>
          <small>Saved ideas and scripts</small>
        </div>
        <div>
          <span>
            <Clock3 size={18} />
            Audio and videos created
          </span>
          <strong>
            {Math.round(done.reduce((s, j) => s + j.duration, 0) / 60)}{" "}
            <em>min.</em>
          </strong>
          <small>{done.length} completed recordings in the latest 100</small>
        </div>
      </div>
      <div className="sub-heading">
        <h2>Start with a format</h2>
        <span>One studio. Plenty of possibilities.</span>
      </div>
      <div className="mode-grid">
        {[
          ["tts", "Text to speech", "Articles, stories, and learning materials."],
          ["podcast", "Podcast", "A conversation between two voices."],
          ["voiceover", "Voiceover", "For videos, ads, and presentations."],
          ["studio", "Video Studio", "Expressive voices, avatars, and captions."],
        ].map(([id, t, d]) => {
          const Icon = icons[id as keyof typeof icons] || FileText;
          return (
            <Link
              key={id}
              to={id === "studio" ? "/app/video-studio" : "/app/studio?mode=" + id}
              className={"mode-card " + id}
            >
              <Icon size={24} />
              <h3>{t}</h3>
              <p>{d}</p>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      <div className="sub-heading">
        <h2>Recent projects</h2>
        <Link to="/app/projects">
          View all <ArrowUpRight size={16} />
        </Link>
      </div>
      <ProjectList projects={projects.slice(0, 4).map(p => {
        const latest = jobs.find(j => j.project_id === p.id);
        return latest ? { ...p, status: latest.status, latest_job: latest.id } : p;
      })} />
    </div>
  );
}
export function ProjectList({
  projects,
  onDelete,
}: {
  projects: Project[];
  onDelete?: (id: string) => void;
}) {
  if (!projects.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <AudioLines size={28} />
        </span>
        <h3>Your first story starts here.</h3>
        <p>Create a recording and find it here.</p>
        <Link className="btn outline" to="/app/studio">
          <Plus size={17} />
          Create project
        </Link>
      </div>
    );
  return (
    <div className="project-list">
      {projects.map((p) => {
        const Icon = icons[p.mode as keyof typeof icons] || FileText;
        return (
          <div className="project-row" key={p.id}>
            <span className={"project-icon " + p.mode}>
              <Icon size={20} />
            </span>
            <Link to={"/app/" + (p.mode === "studio" ? "video-studio/" : "studio/") + p.id}>
              <strong>{p.title}</strong>
              <small>
                {new Date(p.updated_at * 1000).toLocaleDateString("en-US")} ·{" "}
                {p.mode === "studio" ? "Video Studio" : p.mode === "podcast"
                  ? "Podcast"
                  : p.mode === "voiceover"
                    ? "Voiceover"
                    : "Text to speech"}
              </small>
            </Link>
            <span className={"status " + p.status}>
              {statusNames[p.status || ""] || "Draft"}
            </span>
            {onDelete ? (
              <button
                className="round"
                onClick={() => onDelete(p.id)}
                aria-label={"Delete " + p.title}
              >
                <Trash2 size={17} />
              </button>
            ) : (
              <Link
                className="round"
                to={"/app/" + (p.mode === "studio" ? "video-studio/" : "studio/") + p.id}
                aria-label={"Open " + p.title}
              >
                <ArrowUpRight size={18} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const load = () =>
    api("/projects")
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="app-page">
      <div className="page-heading with-action">
        <div>
          <h1>My projects</h1>
          <p>All your ideas. Ready for their moment.</p>
        </div>
        <Link className="btn dark" to="/app/studio">
          <Plus size={18} />
          New project
        </Link>
      </div>
      {error && <Notice>{error}</Notice>}
      <div className="filter-bar">
        <div className="segmented">
          {[
            ["all", "All"],
            ["tts", "Text to speech"],
            ["podcast", "Podcasts"],
            ["voiceover", "Voiceover"],
            ["studio", "Video Studio"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          aria-label="Search projects"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
        />
      </div>
      <ProjectList
        projects={projects.filter(
          (p) =>
            (mode === "all" || p.mode === mode) &&
            p.title.toLowerCase().includes(query.toLowerCase()),
        )}
        onDelete={async (id) => {
          if (
            !confirm(
              "Delete this project and all its recordings? This action is permanent.",
            )
          )
            return;
          try {
            await api("/projects/" + id, { method: "DELETE" });
            await load();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      <p className="small-note">
        Up to 100 saved projects. Deleting a project also removes its
        recordings.
      </p>
    </div>
  );
}
