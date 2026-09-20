import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Captions, Package, Upload, Download, Trash2 } from "lucide-react";
import { api, post, Button, Notice, number, useAuth } from "./lib";
import {
  mediaCredits,
  mediaPhase,
  MB,
  type MediaAsset,
  type MediaTask,
} from "../shared/media";
import type { CaptionDocument } from "../shared/captions";
import { CaptionEditor } from "./CaptionEditor";
import "./media-tools.css";
import "./video-studio.css";

type Library = {
  assets: MediaAsset[];
  tasks: MediaTask[];
  storage: { used: number; limit: number; days: number };
};
const fileUrl = (id: string) => `/api/media/assets/${id}/file`;
export function useMediaLibrary() {
  const [data, setData] = useState<Library | null>(null),
    [error, setError] = useState(""),
    [enabled, setEnabled] = useState<boolean | null>(null);
  const live = useRef(true),
    inflight = useRef(false);
  const reload = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const d = await api<Library>("/media");
      if (live.current) {
        setData(d);
        setError("");
      }
    } catch (e) {
      if (live.current) setError((e as Error).message);
    } finally {
      inflight.current = false;
    }
  }, []);
  useEffect(() => {
    live.current = true;
    api("/media/config")
      .then((c) => {
        if (live.current) {
          setEnabled(c.enabled);
          if (c.enabled) void reload();
        }
      })
      .catch((e) => {
        if (live.current) setError(e.message);
      });
    return () => {
      live.current = false;
    };
  }, [reload]);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => void reload(), 6000);
    return () => clearInterval(id);
  }, [enabled, reload]);
  return { data, error, enabled, reload };
}
export async function uploadMedia(
  file: File,
  kind: "upload" | "portrait" | "product",
  progress: (value: number) => void,
) {
  const mime =
    file.type ||
    (/\.mov$/i.test(file.name)
      ? "video/quicktime"
      : /\.webm$/i.test(file.name)
        ? "video/webm"
        : /\.mp4$/i.test(file.name)
          ? "video/mp4"
          : "");
  const start = await post("/media/uploads", {
    name: file.name,
    bytes: file.size,
    mime,
    kind,
  });
  for (
    let offset = 0, part = 1;
    offset < file.size;
    offset += start.chunkSize, part++
  ) {
    let success = false;
    for (let retry = 0; retry < 3 && !success; retry++) {
      try {
        await api(`/media/uploads/${start.id}/parts/${part}`, {
          method: "PUT",
          body: file.slice(offset, offset + start.chunkSize),
          headers: { "Content-Type": "application/octet-stream" },
        });
        success = true;
      } catch (e) {
        if (retry === 2) throw e;
      }
    }
    progress(
      Math.min(100, Math.round(((offset + start.chunkSize) / file.size) * 100)),
    );
  }
  await post(`/media/uploads/${start.id}/complete`, {});
  return start.id as string;
}
function TaskList({ tasks }: { tasks: MediaTask[] }) {
  return (
    <div className="media-task-list" aria-live="polite">
      {tasks.map((t) => (
        <div key={t.id} className="media-task">
          <span>
            {t.kind === "product"
              ? "Product avatar"
              : t.kind === "export"
                ? "Export"
                : t.kind === "inspect"
                  ? "Video check"
                  : "Captions"}
          </span>
          <strong>{mediaPhase[t.phase] || t.phase}</strong>
          <small>{new Date(t.created_at * 1000).toLocaleString("en")}</small>
          {t.error && <Notice>{t.error}</Notice>}
        </div>
      ))}
    </div>
  );
}
export function BackgroundExport({
  sourceId,
  document,
  onSave,
}: {
  sourceId: string;
  document: CaptionDocument;
  onSave: () => Promise<void>;
}) {
  const { data, enabled, error: loadError, reload } = useMediaLibrary(),
    { refresh } = useAuth();
  const [quote, setQuote] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    key = useRef(crypto.randomUUID());
  const tasks =
    data?.tasks.filter(
      (t) => t.source_id === sourceId && t.kind === "export",
    ) || [];
  const active = data?.tasks.some((t) =>
    ["running", "queued"].includes(t.status),
  );
  const loadQuote = useCallback(
    () =>
      api(`/media/exports/${sourceId}/quote`)
        .then((q) => setQuote(q.credits))
        .catch((e) => setError(e.message)),
    [sourceId],
  );
  useEffect(() => {
    if (enabled) void loadQuote();
  }, [enabled, loadQuote, tasks.map((t) => t.status).join(",")]);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await onSave();
      await post("/media/exports", {
        sourceId,
        document,
        credits: quote,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      await reload();
      await refresh();
      await loadQuote();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!enabled) return null;
  return (
    <div className="background-export">
      <div>
        <strong>Background export</strong>
        <p>
          You can close this page. Burned-in captions and audio remain in the
          finished MP4. Settings are saved as a separate version.
        </p>
      </div>
      {(error || loadError) && <Notice>{error || loadError}</Notice>}
      <Button
        className="btn primary"
        busy={busy}
        disabled={!!active || quote === null}
        onClick={submit}
      >
        <Download size={18} /> Create MP4 ·{" "}
        {quote === 0
          ? "included"
          : quote === null
            ? "…"
            : `${number(quote)} credits`}
      </Button>
      {active && (
        <p>
          A request is processing. You can export again when it finishes.
        </p>
      )}
      <TaskList tasks={tasks.slice(0, 3)} />
      {tasks
        .filter((t) => t.status === "completed")
        .slice(0, 5)
        .map((t) => {
          const ids = JSON.parse(t.result || "{}").assets || [];
          return ids.map((id: string) => {
            const a = data?.assets.find((a) => a.id === id);
            return a && a.status === "ready" ? (
              <a
                className="btn"
                key={id}
                href={fileUrl(id)}
                download={`scene-${id}.mp4`}
              >
                <Download size={16} /> MP4 ·{" "}
                {new Date(t.created_at * 1000).toLocaleString("en")} · up to{" "}
                {new Date(a.expires_at * 1000).toLocaleDateString("en")}
              </a>
            ) : null;
          });
        })}
      <small>
        The first export of a generated video is included. For uploaded video, it is
        included in the transcription price. Additional exports cost 500 credits per
        started minute. Downloading a finished file is free.
      </small>
    </div>
  );
}
export function ProductAvatarPanel({
  onSelect,
}: {
  onSelect?: (id: string) => void;
}) {
  const { data, error: loadError, enabled, reload } = useMediaLibrary(),
    { user, refresh } = useAuth();
  const [portrait, setPortrait] = useState(""),
    [product, setProduct] = useState(""),
    [count, setCount] = useState(2),
    [placement, setPlacement] = useState("hold"),
    [scene, setScene] = useState("original"),
    [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(""),
    key = useRef(crypto.randomUUID());
  const cost = mediaCredits("product", 0, count),
    active = data?.tasks.some((t) => ["queued", "running"].includes(t.status));
  const images = (data?.assets || []).filter(
      (a) => a.status === "ready" && a.expires_at > Date.now() / 1000,
    ),
    variants = images.filter((a) => a.kind === "variant");
  const upload = async (
    file: File | undefined,
    kind: "portrait" | "product",
  ) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const id = await uploadMedia(file, kind, setProgress);
      if (kind === "portrait") setPortrait(id);
      else setProduct(id);
      key.current = crypto.randomUUID();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      await post("/media/products", {
        portraitId: portrait,
        productId: product,
        count,
        placement,
        scene,
        consent,
        credits: cost,
        idempotencyKey: key.current,
      });
      key.current = crypto.randomUUID();
      await reload();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (enabled === false) return null;
  return (
    <section className="vs-card product-panel">
      <div className="sub-heading">
        <h2>
          <Package size={23} /> Your product. Your personality.
        </h2>
        <span>PRODUCT AVATAR</span>
      </div>
      <p>
        Upload a portrait and a product photo. Create several compositions and
        choose one for your talking video.
      </p>
      {(error || loadError) && <Notice>{error || loadError}</Notice>}
      <fieldset
        disabled={busy || !!active}
        onChange={() => {
          key.current = crypto.randomUUID();
        }}
      >
        <div className="media-two">
          <label>
            Portrait
            <select
              value={portrait}
              onChange={(e) => setPortrait(e.target.value)}
            >
              <option value="">Choose portrait</option>
              {images
                .filter((a) => ["portrait", "variant"].includes(a.kind))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ·{" "}
                    {new Date(a.created_at * 1000).toLocaleTimeString("en")}
                  </option>
                ))}
            </select>
            <input
              aria-label="Upload portrait"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => void upload(e.target.files?.[0], "portrait")}
            />
            {portrait && (
              <img
                className="media-input-preview"
                src={fileUrl(portrait)}
                alt="Selected portrait"
              />
            )}
          </label>
          <label>
            Product
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Choose product</option>
              {images
                .filter((a) => a.kind === "product")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <input
              aria-label="Upload product"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => void upload(e.target.files?.[0], "product")}
            />
            {product && (
              <img
                className="media-input-preview"
                src={fileUrl(product)}
                alt="Selected product"
              />
            )}
          </label>
        </div>
        <small>
          JPG or PNG up to 2 MB. Use a clear face photo and a readable
          product label.
        </small>
        <div className="media-three">
          <label>
            Placement
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
            >
              <option value="hold">In hand</option>
              <option value="table">On a table</option>
              <option value="beside">Beside the person</option>
            </select>
          </label>
          <label>
            Setting
            <select value={scene} onChange={(e) => setScene(e.target.value)}>
              <option value="original">Keep original</option>
              <option value="studio">Studio</option>
              <option value="home">At home</option>
              <option value="outdoor">Outdoors</option>
            </select>
          </label>
          <label>
            Variations
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={2}>2 variations · 5,000 credits</option>
              <option value={4}>4 variations · 10,000 credits</option>
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />{" "}
          I have the right to use these photos and the consent of the person depicted.
        </label>
        <Button
          className="btn primary"
          busy={busy}
          disabled={
            !portrait ||
            !product ||
            !consent ||
            !user?.verified ||
            cost > user.limit - user.used
          }
          onClick={generate}
        >
          Create {count} variations · {number(cost)} credits
        </Button>
      </fieldset>
      {progress !== null && (
        <p role="status">
          Uploading: {progress}% · Keep this page open until the
          upload finishes.
        </p>
      )}
      <p className="small-note">
        Generation continues after closing the page. Check
        the face, hands, and label before choosing a variation. Video
        generation is charged separately.
      </p>
      <TaskList
        tasks={(data?.tasks || [])
          .filter((t) => t.kind === "product")
          .slice(0, 2)}
      />
      {!!variants.length && (
        <div className="product-variants">
          {variants.map((a) => (
            <article key={a.id}>
              <img src={fileUrl(a.id)} alt="Product variation" />
              <small>
                Available until{" "}
                {new Date(a.expires_at * 1000).toLocaleDateString("en")}
              </small>
              {onSelect ? (
                <button className="btn primary" onClick={() => onSelect(a.id)}>
                  Use for video
                </button>
              ) : (
                <Link
                  className="btn primary"
                  to={`/app/video-studio?avatar=${a.id}`}
                >
                  Use for video
                </Link>
              )}
              {!a.saved && (
                <button
                  className="btn"
                  onClick={async () => {
                    try {
                      await post(`/media/assets/${a.id}/save`, {});
                      await reload();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Save to library
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
export function MediaTools() {
  const { data, error: loadError, enabled, reload } = useMediaLibrary(),
    { refresh, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [consent, setConsent] = useState(false);
  const selected = data?.assets.find((a) => a.id === params.get("asset")),
    active = data?.tasks.some((t) => ["queued", "running"].includes(t.status));
  const idempotency = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  const upload = async (file: File | undefined) => {
    if (!file || !consent) return;
    setBusy(true);
    setError("");
    try {
      const id = await uploadMedia(file, "upload", setProgress);
      setParams({ asset: id });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="video-studio media-page">
      <header className="vs-heading">
        <div>
          <span className="eyebrow">FROM FIRST FRAME TO FINAL CUT</span>
          <h1>Your creative toolkit.</h1>
          <p>
            Captions for your videos. Products in your stories. Everything in
            one place.
          </p>
        </div>
      </header>
      {(error || loadError) && <Notice>{error || loadError}</Notice>}
      {enabled === false && (
        <Notice>These tools are being prepared for activation.</Notice>
      )}
      {data && (
        <div className="media-storage">
          <strong>
            {(data.storage.used / MB).toFixed(0)} MB /{" "}
            {(data.storage.limit / MB).toFixed(0)} MB
          </strong>
          <progress max={data.storage.limit} value={data.storage.used} />
          <span>
            Finished recordings are kept for {data.storage.days} days. Download important
            files before the date shown. Saved images remain during an
            active subscription, with 30 days to download them after it ends.
          </span>
        </div>
      )}
      {enabled && (
        <>
          <section className="vs-card">
            <h2>
              <Captions /> Caption your video
            </h2>
            <p>
              Upload MP4, MOV, or WebM up to 500 MB, 10 minutes, and 4K. After
              validation, you will see the exact cost: 1,000 credits per started
              minute, including the first export.
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              I have the right to process this video and its content.
            </label>
            <label className="media-upload">
              <Upload /> Choose video
              <input
                disabled={busy || !!active || !consent}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            {busy && (
              <p role="status">
                Uploading {progress}% · Keep this page open while the file is
                uploading.
              </p>
            )}
            <TaskList
              tasks={(data?.tasks || [])
                .filter((t) => ["inspect", "transcribe"].includes(t.kind))
                .slice(0, 3)}
            />
            <label>
              Uploaded videos
              <select
                value={selected?.id || ""}
                onChange={(e) => {
                  setParams({ asset: e.target.value });
                  idempotency.current = crypto.randomUUID();
                }}
              >
                <option value="">Choose video</option>
                {data?.assets
                  .filter((a) => a.kind === "upload")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ·{" "}
                      {a.status === "ready"
                        ? `${Math.ceil(a.duration)} sec.`
                        : "checking"}
                    </option>
                  ))}
              </select>
            </label>
            {selected?.status === "ready" && !selected.hasCaptions && (
              <Button
                className="btn primary"
                busy={busy}
                disabled={
                  !!active ||
                  mediaCredits("transcribe", selected.duration) >
                    user!.limit - user!.used
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await post("/media/transcribe", {
                      assetId: selected.id,
                      idempotencyKey: idempotency.current,
                      credits: mediaCredits("transcribe", selected.duration),
                    });
                    idempotency.current = crypto.randomUUID();
                    await reload();
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create captions ·{" "}
                {number(mediaCredits("transcribe", selected.duration))} credits
              </Button>
            )}
          </section>
          {selected?.status === "ready" && !!selected.hasCaptions && (
            <CaptionEditor
              key={selected.id}
              audioId={selected.id}
              video={null}
              uploaded
            />
          )}
          <ProductAvatarPanel />
          <section className="vs-card">
            <h2>Your files</h2>
            <p>
              Downloading completed files does not use credits. Deletion
              frees space and cannot be undone.
            </p>
            <div className="media-file-list">
              {data?.assets.map((a) => (
                <div key={a.id}>
                  <div>
                    <strong>{a.name}</strong>
                    <small>
                      {(a.bytes / MB).toFixed(1)} MB ·{" "}
                      {a.status === "ready"
                        ? "up to " +
                          new Date(a.expires_at * 1000).toLocaleDateString("en")
                        : "processing"}
                    </small>
                  </div>
                  {a.status === "uploading" && a.kind === "upload" && (
                    <button
                      className="btn"
                      disabled={!!active || busy}
                      onClick={async () => {
                        try {
                          await post(`/media/uploads/${a.id}/complete`, {});
                          await reload();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Finish upload
                    </button>
                  )}
                  {a.status === "ready" && (
                    <a
                      className="btn"
                      href={fileUrl(a.id)}
                      download
                      aria-label={`Download ${a.name}`}
                    >
                      <Download size={16} />
                    </a>
                  )}
                  <button
                    className="btn"
                    disabled={!!active || busy}
                    aria-label={`Delete ${a.name}`}
                    onClick={async () => {
                      if (!confirm(`Delete “${a.name}”?`)) return;
                      try {
                        await api(`/media/assets/${a.id}`, {
                          method: "DELETE",
                        });
                        await reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
