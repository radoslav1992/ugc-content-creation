import { StudioVoiceAdmin } from "./StudioVoiceAdmin";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  Download,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { voiceList, sampleSentence } from "../shared/catalog";
import { api, post, Button, Notice, useAuth, type Voice } from "./lib";
export function SettingsPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [good, setGood] = useState(false);
  const action = async (
    key: string,
    fn: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    setMessage("");
    try {
      await fn();
      setMessage(success);
      setGood(true);
    } catch (e) {
      setMessage((e as Error).message);
      setGood(false);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="app-page settings-page">
      <div className="page-heading">
        <h1>Settings</h1>
        <p>Your profile, security, and personal data.</p>
      </div>
      {message && <Notice good={good}>{message}</Notice>}
      <section className="settings-card">
        <h2>
          <UserRound size={21} />
          Personal details
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            void action(
              "profile",
              async () => {
                await api("/settings", {
                  method: "PUT",
                  body: JSON.stringify(d),
                });
                await refresh();
              },
              "Profile updated.",
            );
          }}
        >
          <label>
            Name
            <input
              name="name"
              defaultValue={user?.name}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Email
            <input value={user?.email || ""} readOnly />
          </label>
          <div className="email-status">
            {user?.verified ? (
              <span>
                <Check size={15} />
                Verified email
              </span>
            ) : (
              <Button
                busy={busy === "verify"}
                onClick={() =>
                  action(
                    "verify",
                    () => post("/auth/resend"),
                    "We sent another verification email.",
                  )
                }
                type="button"
                className="text-link"
              >
                Send verification email
              </Button>
            )}
          </div>
          <Button busy={busy === "profile"} type="submit" className="btn dark">
            Save changes
          </Button>
        </form>
      </section>
      <section className="settings-card">
        <h2>
          <ShieldCheck size={21} />
          Security
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            void action(
              "password",
              async () => {
                await post("/settings/password", data);
                form.reset();
              },
              "Password changed. Other sessions have been signed out.",
            );
          }}
        >
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </label>
          <p className="small-note">
            At least 10 characters. Changing your password signs out your other
            devices.
          </p>
          <Button
            type="submit"
            busy={busy === "password"}
            className="btn outline"
          >
            Change password
          </Button>
        </form>
      </section>
      <section className="settings-card">
        <h2>
          <Download size={21} />
          Your data
        </h2>
        <p>
          Download your profile, projects, and history as JSON. Audio
          files can be downloaded from each project.
        </p>
        <a className="btn outline" href="/api/settings/export">
          <Download size={17} />
          Download your data
        </a>
      </section>
      {user?.admin && <><StudioVoiceAdmin /><AdminSettings /></>}
      <section className="settings-card danger-zone">
        <h2>
          <Trash2 size={21} />
          Delete account
        </h2>
        <p>
          This removes your account, all projects, and recordings. This action is
          permanent. Cancel any active subscription first and wait until
          the paid period has ended.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const password = new FormData(e.currentTarget).get("password");
            if (
              !confirm(
                "Are you sure? All projects and recordings will be permanently deleted.",
              )
            )
              return;
            void action(
              "delete",
              async () => {
                await api("/settings/account", {
                  method: "DELETE",
                  body: JSON.stringify({ password }),
                });
                await refresh();
                navigate("/");
              },
              "",
            );
          }}
        >
          <label>
            Confirm with your password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={128}
            />
          </label>
          <Button className="btn danger" type="submit" busy={busy === "delete"}>
            Delete account
          </Button>
        </form>
      </section>
    </div>
  );
}
function AdminSettings() {
  const [voices, setVoices] = useState<Voice[]>(voiceList);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState("mila");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<{ voice: string; audio: Blob } | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!draft) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(draft.audio);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);
  const generateSample = async () => {
    setBusy(true);
    setStatus("Creating the sample. This may take about a minute.");
    try {
      const response = await fetch(`/api/admin/voices/${selected}/sample/generate`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "The sample could not be created. Try again.");
      }
      setDraft({ voice: selected, audio: await response.blob() });
      setStatus("The sample is ready. Listen and publish it when you are happy.");
    } catch (err) {
      setStatus((err as Error).message);
    } finally { setBusy(false); }
  };
  const publishSample = async () => {
    if (!draft || draft.voice !== selected) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", draft.audio, `${draft.voice}.wav`);
      await api(`/admin/voices/${draft.voice}/sample`, { method: "POST", body });
      setDraft(null);
      setStatus("Audio sample published.");
      load();
    } catch (err) {
      setStatus((err as Error).message);
    } finally { setBusy(false); }
  };
  const load = () => {
    api("/voices")
      .then((d) => setVoices(d.voices))
      .catch(() => {});
    api("/admin/messages")
      .then((d) => setMessages(d.messages))
      .catch((e) => setStatus(e.message));
  };
  useEffect(load, []);
  return (
    <>
      <section className="settings-card">
        <h2>
          <Upload size={21} />
          Voice samples
        </h2>
        <p>
          Choose a voice and create a sample with the text below. Listen to it,
          then publish it to the catalogue and studio. Generation uses
          paid provider usage without deducting credits from your personal plan.
        </p>
        <blockquote>{sampleSentence}</blockquote>
        {status && <Notice>{status}</Notice>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            try {
              await api("/admin/voices/" + selected + "/sample", {
                method: "POST",
                body: new FormData(form),
              });
              setStatus("Audio sample published.");
              setDraft(null);
              load();
              form.reset();
            } catch (err) {
              setStatus((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Voice
            <select
              value={selected}
              disabled={busy}
              onChange={(e) => { setSelected(e.target.value); setDraft(null); setStatus(""); }}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.sampleUrl ? " — sample available" : " — no sample"}
                </option>
              ))}
            </select>
          </label>
          <Button busy={busy} className="btn dark" type="button" onClick={generateSample}>
            <Sparkles size={17} />
            Generate sample
          </Button>
          {draft?.voice === selected && previewUrl && (
            <div className="sample-admin-player">
              <span>New sample — not published yet</span>
              <audio controls src={previewUrl} />
              <Button busy={busy} className="btn dark" type="button" onClick={publishSample}>
                {voices.find((v) => v.id === selected)?.sampleUrl ? "Replace published sample" : "Publish sample"}
              </Button>
            </div>
          )}
          <label>
            Or upload your own WAV / MP3, up to 2 MB
            <input
              name="file"
              type="file"
              required
              disabled={busy}
              accept="audio/wav,audio/mpeg,.wav,.mp3"
            />
          </label>
          <Button busy={busy} className="btn dark" type="submit">
            <Upload size={17} />
            Upload sample
          </Button>
        </form>
        {voices.find((v) => v.id === selected)?.sampleUrl && (
          <div className="sample-admin-player">
            <audio
              controls
              src={voices.find((v) => v.id === selected)?.sampleUrl}
            />
            <button
              className="text-link"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Remove this sample?")) return;
                try {
                  await api("/admin/voices/" + selected + "/sample", {
                    method: "DELETE",
                  });
                  load();
                  setStatus("Sample removed.");
                } catch (e) {
                  setStatus((e as Error).message);
                }
              }}
            >
              Remove sample
            </button>
          </div>
        )}
      </section>
      <section className="settings-card">
        <h2>
          <Mail size={21} />
          Website enquiries
        </h2>
        {messages.length ? (
          messages.map((m) => (
            <article className="contact-message" key={m.id}>
              <strong>{m.name}</strong>
              <a href={"mailto:" + m.email}>{m.email}</a>
              <small>
                {new Date(m.created_at * 1000).toLocaleString("en")}
              </small>
              <p>{m.message}</p>
            </article>
          ))
        ) : (
          <p>No enquiries yet.</p>
        )}
      </section>
    </>
  );
}
