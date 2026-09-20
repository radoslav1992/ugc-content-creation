import { useEffect, useState } from "react";
import { Mic, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { sampleSentence } from "../shared/catalog";
import type { StudioVoice } from "../shared/studio";
import { api, Button, Notice } from "./lib";

type AdminVoice = StudioVoice & { providerVoiceId: string; revision: string; source: "admin" | "environment" | "default" };
export function StudioVoiceAdmin() {
  const [voices, setVoices] = useState<AdminVoice[]>([]), [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [fields, setFields] = useState({ name: "", description: "", providerVoiceId: "" });
  const [enabled, setEnabled] = useState(false), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [draft, setDraft] = useState<{ audio: Blob; revision: string; voice: string } | null>(null), [preview, setPreview] = useState("");
  const voice = voices.find(v => v.id === selected);
  const dirty = creating ? !!(fields.name || fields.description || fields.providerVoiceId) : !!voice && (fields.name !== voice.name || fields.description !== voice.description || fields.providerVoiceId !== voice.providerVoiceId);
  const populate = (v?: AdminVoice) => setFields({ name: v?.name || "", description: v?.description || "", providerVoiceId: v?.providerVoiceId || "" });
  const load = async (preferred = selected) => {
    const d = await api<{ enabled: boolean; voices: AdminVoice[] }>("/admin/studio-voices");
    const target = d.voices.find(v => v.id === preferred) || d.voices[0];
    setEnabled(d.enabled); setVoices(d.voices); setSelected(target?.id || ""); populate(target); setCreating(!target); setLoaded(true);
  };
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const choose = (id: string | null) => {
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
    setCreating(id === null); setSelected(id || ""); populate(voices.find(v => v.id === id)); setDraft(null); setMessage("");
  };
  const changed = () => window.dispatchEvent(new Event("scene:studio-voices-changed"));
  useEffect(() => { if (!draft) { setPreview(""); return; } const url = URL.createObjectURL(draft.audio); setPreview(url); return () => URL.revokeObjectURL(url); }, [draft]);
  const act = async (fn: () => Promise<void>) => { setBusy(true); setMessage(""); try { await fn(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  const update = (v: AdminVoice) => { setVoices(list => list.some(old => old.id === v.id) ? list.map(old => old.id === v.id ? v : old) : [...list, v]); setSelected(v.id); setCreating(false); populate(v); setDraft(null); changed(); };
  const publish = async (audio: Blob, revision: string) => {
    const form = new FormData(); form.set("file", audio, audio.type === "audio/mpeg" ? "sample.mp3" : "sample.wav"); form.set("voiceRevision", revision);
    await api(`/admin/voices/${selected}/sample`, { method: "POST", body: form });
    setDraft(null); await load(); changed(); setMessage("Sample published in Video Studio.");
  };
  return <section className="settings-card studio-voice-admin">
    <h2><Mic size={21} /> Video Studio voices</h2>
    <p>Add voices using ElevenLabs Voice IDs and manage them in this shared library. The name and description are shown to users; Voice IDs are only visible here. Settings in this panel take priority over ELEVENLABS_VOICES.</p>
    {message && <Notice>{message}</Notice>}
    {!loaded ? <Button className="btn" busy={busy} onClick={() => act(() => load())}>Load settings</Button> : <>
      {!enabled && <Notice>Add ELEVENLABS_API_KEY in Cloudflare to generate samples and studio audio.</Notice>}
      <fieldset disabled={busy}>
        <div className="studio-admin-toolbar">
          <label>Studio voice<select value={selected} onChange={e => choose(e.target.value)}>
            {creating && <option value="">New voice</option>}
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}{v.sampleUrl ? " — sample available" : " — no sample"}</option>)}
          </select></label>
          <Button className="btn dark" type="button" onClick={() => choose(null)}><Plus size={16} /> Add voice</Button>
        </div>
        <p>{voices.length} {voices.length === 1 ? "active voice" : "active voices"} in Video Studio.</p>
        {creating && <h3>New voice</h3>}
        <form onSubmit={e => { e.preventDefault(); void act(async () => { const d = await api<{ voice: AdminVoice }>(creating ? "/admin/studio-voices" : `/admin/studio-voices/${selected}`, { method: creating ? "POST" : "PUT", body: JSON.stringify(fields) }); update(d.voice); setMessage("Voice saved. Generate a sample to check its sound."); }); }}>
          <label>Studio display name<input value={fields.name} maxLength={40} required onChange={e => setFields(f => ({ ...f, name: e.target.value }))} /></label>
          <label>Voice description<input value={fields.description} maxLength={120} required onChange={e => setFields(f => ({ ...f, description: e.target.value }))} /></label>
          <label>ElevenLabs Voice ID<input value={fields.providerVoiceId} maxLength={128} required pattern="[a-zA-Z0-9_-]+" autoComplete="off" spellCheck={false} onChange={e => { setFields(f => ({ ...f, providerVoiceId: e.target.value })); setDraft(null); }} /></label>
          <p>Copy the Voice ID from your chosen voice in ElevenLabs. Changing the ID hides the old sample until a new one is published.</p>
          <Button className="btn dark" type="submit" disabled={!dirty}><Save size={16} /> {creating ? "Add and save voice" : "Save voice"}</Button>
          {voice && !creating && <Button className="btn danger" type="button" onClick={() => {
            if (!confirm(`Remove “${voice.name}” from the list? Existing recordings will remain accessible.`)) return;
            void act(async () => { await api(`/admin/studio-voices/${selected}`, { method: "DELETE" }); setDraft(null); await load(""); changed(); setMessage("Voice removed from Video Studio."); });
          }}><Trash2 size={16} /> Remove voice</Button>}
          {creating && voices.length > 0 && <Button className="btn" type="button" onClick={() => choose(voices[0].id)}>Cancel</Button>}
        </form>
        {voice && !creating && <div className="studio-sample-admin">
          <h3>Audio sample</h3><blockquote>{sampleSentence}</blockquote>
          <p>Generation uses paid ElevenLabs usage without deducting credits from your personal plan. Listen to the sample before publishing.</p>
          {dirty && <Notice>Save the voice changes first.</Notice>}
          <Button className="btn dark" disabled={!enabled || dirty} onClick={() => act(async () => {
            setMessage("Creating the sample. This may take about a minute.");
            const response = await fetch(`/api/admin/voices/${selected}/sample/generate`, { method: "POST" });
            if (!response.ok) { const d = await response.json().catch(() => ({})) as { error?: string }; throw new Error(d.error || "The sample could not be created."); }
            const revision = response.headers.get("X-Voice-Revision");
            if (!revision) throw new Error("Refresh the page and try again.");
            setDraft({ voice: selected, revision, audio: await response.blob() }); setMessage("The sample is ready to preview. It is not published yet.");
          })}><Sparkles size={16} /> Generate studio sample</Button>
          {draft?.voice === selected && preview && <div className="sample-admin-player"><span>New sample — not published yet</span><audio controls src={preview} /><Button className="btn dark" disabled={dirty} onClick={() => act(() => publish(draft.audio, draft.revision))}>{voice.sampleUrl ? "Replace studio sample" : "Publish studio sample"}</Button></div>}
          <form onSubmit={e => { e.preventDefault(); const form = e.currentTarget, file = new FormData(form).get("file"); if (!(file instanceof File)) return; void act(async () => { await publish(file, voice.revision); form.reset(); }); }}>
            <label>Or upload WAV / MP3 up to 2 MB<input type="file" name="file" accept="audio/wav,audio/mpeg,.wav,.mp3" required disabled={dirty} /></label>
            <Button className="btn" type="submit" disabled={dirty}><Upload size={16} /> Upload studio sample</Button>
          </form>
          {voice.sampleUrl && <div className="sample-admin-player"><span>Published sample</span><audio controls src={voice.sampleUrl} /><Button className="text-link" onClick={() => act(async () => { await api(`/admin/voices/${selected}/sample`, { method: "DELETE" }); await load(); changed(); setMessage("Studio sample removed."); })}>Remove studio sample</Button></div>}
        </div>}
      </fieldset>
    </>}
  </section>;
}
