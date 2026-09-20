import { BackgroundExport } from "./MediaTools";
import { useEffect, useRef, useState } from "react";
import { Captions, Download } from "lucide-react";
import { api, Button, Notice, type Job } from "./lib";
import { defaultCaptions, subtitleFile, type CaptionDocument } from "../shared/captions";
import { downloadBlob, renderCaptionedVideo } from "./caption-render";
import { CaptionStyles } from "./CaptionStyles";
import { CaptionPreview } from "./CaptionPreview";
import "./captions.css";
export function CaptionEditor({ audioId, video, uploaded = false }: { audioId: string; video: Job | null; uploaded?: boolean }) {
  const [document, setDocument] = useState<CaptionDocument>(defaultCaptions);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false), [progress, setProgress] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const endpoint = uploaded ? `/media/assets/${audioId}/captions` : `/video-studio/captions/${audioId}`;
  const url = uploaded ? `/api/media/assets/${audioId}/file` : video ? `/api/jobs/${video.id}/video` : "";
  useEffect(() => { let live = true; setLoaded(false); setError(""); api<CaptionDocument>(endpoint).then(d => { if (live) { setDocument({ ...defaultCaptions, ...d }); setLoaded(true); } }).catch(e => live && setError(e.message)); return () => { live = false; abort.current?.abort(); }; }, [audioId, endpoint]);
  useEffect(() => { if (!exporting) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [exporting]);
  const edit = (change: Partial<CaptionDocument>) => { setDocument(d => ({ ...d, ...change })); setSaved(false); };
  const save = async () => { setError(""); await api(endpoint, { method: "PUT", body: JSON.stringify(document) }); setSaved(true); };
  const render = async () => {
    setError(""); setExporting(true); setProgress(0); abort.current = new AbortController();
    try { await save(); const blob = await renderCaptionedVideo(url, document, setProgress, abort.current.signal); downloadBlob(blob, `scene-${(video?.id || audioId)}-${document.format.replace(":", "x")}.mp4`); }
    catch (e) { if (!abort.current.signal.aborted) setError((e as Error).message); }
    finally { setExporting(false); }
  };
  return <section className="vs-card caption-editor"><div className="sub-heading"><h2><Captions size={22} /> Give your words a little screen time.</h2><span>03 / EXPORT</span></div>
    <p className="caption-intro">Choose a look. Make it yours. Download a video ready to share.</p>
    {error && <Notice>{error}</Notice>}
    {!loaded ? <p>Loading captions…</p> : <>
      {!document.words.length && <Notice>No automatic timings are available for this recording. You can add words and timings manually. Your audio is still ready.</Notice>}
      <div className="caption-workbench">
        <CaptionPreview document={document} url={url} />
        <div className="caption-options">
          <CaptionStyles document={document} edit={edit} disabled={exporting} />
          <fieldset disabled={exporting} className="caption-output-controls">
            <label>Format<select value={document.format} onChange={e => edit({ format: e.target.value as CaptionDocument["format"] })}><option value="9:16">9:16 · Reels and TikTok</option><option value="4:5">4:5 · Post</option><option value="1:1">1:1 · Square</option><option value="16:9">16:9 · YouTube</option></select></label>
            <label>Position<select value={document.position} disabled={!document.enabled} onChange={e => edit({ position: e.target.value as CaptionDocument["position"] })}><option value="bottom">Bottom · above controls</option><option value="middle">Center</option><option value="top">Top</option></select></label>
            <label>Resolution<select value={document.resolution || "720p"} onChange={e => edit({ resolution: e.target.value as CaptionDocument["resolution"] })}><option>720p</option><option>1080p</option></select></label>
            <label>Framing<select value={document.fit || "contain"} onChange={e => edit({ fit: e.target.value as CaptionDocument["fit"] })}><option value="contain">Full frame · letterbox</option><option value="cover">Fill · crop</option></select></label>
          </fieldset>
          <p className="caption-output-note">1080p sets the export size. Detail depends on the original video.</p>
        </div>
      </div>
      <details className="vs-word-editor"><summary>Edit words and timings ({document.words.length})</summary><p>Times are in seconds from the start of the recording.</p><fieldset disabled={exporting}>
        {document.words.map((word, i) => <div className="vs-word" key={i}><input aria-label={`Word ${i + 1}`} value={word.text} maxLength={80} onChange={e => edit({ words: document.words.map((w, n) => n === i ? { ...w, text: e.target.value } : w) })} /><input aria-label={`Start ${i + 1}`} type="number" min="0" step="0.01" value={word.start} onChange={e => edit({ words: document.words.map((w, n) => n === i ? { ...w, start: Number(e.target.value) } : w) })} /><input aria-label={`End ${i + 1}`} type="number" min="0" step="0.01" value={word.end} onChange={e => edit({ words: document.words.map((w, n) => n === i ? { ...w, end: Number(e.target.value) } : w) })} /><button className="btn" aria-label={`Delete word ${i + 1}`} onClick={() => edit({ words: document.words.filter((_, n) => n !== i) })}>×</button></div>)}
        <button className="btn" onClick={() => { const start = document.words.at(-1)?.end || 0; edit({ words: [...document.words, { text: "Word", start, end: start + 0.3 }] }); }}>Add word</button>
      </fieldset></details>
      {(video || uploaded) && <BackgroundExport sourceId={uploaded ? audioId : video!.id} document={document} onSave={save} />}
      <div className="vs-actions caption-export-actions"><Button className="btn" disabled={exporting} onClick={() => void save().catch(e => setError(e.message))}>{saved ? "Saved ✓" : "Save captions"}</Button>{(["srt", "vtt"] as const).map(type => <Button key={type} className="btn" disabled={!document.words.length || exporting} onClick={async () => { try { await save(); downloadBlob(new Blob([subtitleFile(document.words, type)], { type: "text/plain;charset=utf-8" }), `scene.${type}`); } catch (e) { setError((e as Error).message); } }}><Download size={16} /> {type.toUpperCase()}</Button>)}
      {(video || uploaded) && <><a className="btn" href={url} download>Original MP4</a><Button className="btn" busy={exporting} onClick={render}><Download size={16} /> {exporting ? `Export · ${Math.round(progress * 100)}%` : document.enabled ? "Local export with captions" : "Local export without captions"}</Button></>}</div>
      {exporting && <div className="caption-export-progress" role="status"><progress value={progress} max={1} aria-label="Export video" /><span>{Math.round(progress * 100)}% · Burning your style into the video</span><Button className="btn" onClick={() => abort.current?.abort()}>Stop export</Button></div>}
      <p className="vs-fine">Local browser exports are free. Check the text before publishing. Keep the page open until a local MP4 finishes; we recommend Chrome or Edge on a computer.</p>
    </>}
  </section>;
}
