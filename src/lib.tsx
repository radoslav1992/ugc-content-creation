import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AudioLines,
  Play,
  Pause,
  ArrowUpRight,
  Check,
  LoaderCircle,
} from "lucide-react";
import { voiceList } from "../shared/catalog";
export type User = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  admin: boolean;
  plan: string;
  used: number;
  limit: number;
  periodEnd: number | null;
  hasSubscription: boolean;
};
export type Voice = (typeof voiceList)[number] & { sampleUrl?: string };
export type Project = {
  id: string;
  title: string;
  mode: string;
  script: string;
  voice: string;
  second_voice: string;
  updated_at: number;
  latest_job?: string;
  status?: string;
  duration?: number;
};
export type Job = {
  video_phase?: "queued" | "processing" | "saving" | null;
  notify_email?: boolean;
  email_status?: "sending" | "sent" | "failed" | null;
  kind?: "audio" | "video";
  mode?: string;
  video_tier?: "low" | "medium" | "high" | "standard" | "quality";
  source_job_id?: string;
  id: string;
  project_id: string;
  title: string;
  status: string;
  chars: number;
  duration: number;
  created_at: number;
  error?: string;
};
export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => {} });
export const useAuth = () => useContext(AuthContext);
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data: any = await r
    .json()
    .catch(() => ({ error: "Unexpected response. Please try again." }));
  if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
export const post = <T = any,>(path: string, data: unknown = {}) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const number = (n: number) => new Intl.NumberFormat("en-US").format(n);
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Scene — home">
      <span className="logo-mark">
        <AudioLines size={25} />
      </span>
      <span>
        Scene<span className="logo-bg">studio</span>
      </span>
    </Link>
  );
}
export function Wave({
  bars = 54,
  small = false,
}: {
  bars?: number;
  small?: boolean;
}) {
  return (
    <div className={"wave " + (small ? "small" : "")} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <i
          key={i}
          style={{
            height: `${16 + Math.abs(Math.sin(i * 1.73) * Math.cos(i * 0.37)) * 84}%`,
            animationDelay: `${i * 19}ms`,
          }}
        />
      ))}
    </div>
  );
}
export function Arrow() {
  return <ArrowUpRight size={18} />;
}
export function Button({
  children,
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || busy}>
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Notice({
  children,
  good = false,
}: {
  children: ReactNode;
  good?: boolean;
}) {
  return (
    <div className={"notice " + (good ? "good" : "")} role="status">
      {good ? <Check size={18} /> : null}
      {children}
    </div>
  );
}
let currentAudio: HTMLAudioElement | null = null;
export function VoiceCard({
  voice,
  selected,
  onSelect,
}: {
  voice: Voice;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const play = () => {
    setError("");
    if (playing && currentAudio) {
      currentAudio.pause();
      return;
    }
    currentAudio?.pause();
    if (!voice.sampleUrl) return;
    const a = new Audio(voice.sampleUrl);
    currentAudio = a;
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    a.onerror = () => {
      setPlaying(false);
      setError("The sample could not load.");
    };
    a.play()
      .then(() => setPlaying(true))
      .catch(() => setError("The sample could not load."));
  };
  return (
    <article className={"voice-card " + (selected ? "selected" : "")}>
      <div className={"voice-avatar " + voice.color}>{voice.name[0]}</div>
      <div className="voice-info">
        <strong>{voice.name}</strong>
        <span>{voice.tone}</span>
        <small>{voice.gender}</small>
      </div>
      <button
        className="round"
        onClick={play}
        disabled={!voice.sampleUrl}
        title={voice.sampleUrl ? "Play sample" : "Sample coming soon"}
        aria-label={(playing ? "Pause" : "Listen") + " — " + voice.name}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      {onSelect && (
        <button
          className="voice-select"
          aria-pressed={!!selected}
          onClick={onSelect}
        >
          {selected ? "Selected" : "Select"}
        </button>
      )}
      {!voice.sampleUrl && (
        <small className="sample-pending">Audio sample — coming soon</small>
      )}
      {error && <small role="alert">{error}</small>}
    </article>
  );
}
