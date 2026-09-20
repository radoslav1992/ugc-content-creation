import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { api, post, Logo, Wave, Button, Notice, useAuth } from "./lib";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: () => void;
    };
  }
}
function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false,
      id: string | undefined;
    const mount = () => {
      if (!cancelled && ref.current && window.turnstile)
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: onToken,
          "expired-callback": () => onToken(""),
          theme: "light",
        });
    };
    if (window.turnstile) mount();
    else {
      let script = document.querySelector<HTMLScriptElement>(
        "script[data-turnstile]",
      );
      if (!script) {
        script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.dataset.turnstile = "true";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount, { once: true });
    }
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey]);
  return <div ref={ref} className="turnstile" />;
}
export function AuthPage({ mode }: { mode: string }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [good, setGood] = useState(false);
  const [show, setShow] = useState(false);
  const [token, setToken] = useState("");
  const [config, setConfig] = useState<{
    turnstileSiteKey?: string;
    registrationEnabled?: boolean;
  }>({});
  useEffect(() => {
    setMessage("");
    api("/public/config")
      .then(setConfig)
      .catch(() => {});
  }, [mode]);
  const titles: Record<string, string> = {
    login: "Welcome back.",
    register: "Your next creation starts here.",
    forgot: "Let's get you back in.",
    reset: "Fresh start. New password.",
    verify: "Verify your email.",
  };
  const descriptions: Record<string, string> = {
    login: "Your ideas and creations are waiting.",
    register: "Create an account and try 1,000 free credits.",
    forgot: "We will send you a password reset link.",
    reset: "Choose a secure password of at least 10 characters.",
    verify: "One last step before your ideas come to life.",
  };
  return (
    <main className="auth-layout">
      <aside className="auth-art">
        <Logo />
        <div>
          <span className="eyebrow">DREAMED UP BY YOU.</span>
          <h2>
            Big ideas
            <br />
            deserve
            <br />
            a moment.
          </h2>
          <p>Make yours count.</p>
          <div className="auth-wave">
            <AudioLines size={34} />
            <Wave bars={36} />
          </div>
        </div>
        <span>Your words. Your world.</span>
      </aside>
      <section className="auth-main">
        <Link to="/" className="auth-back">
          <ArrowLeft size={17} />
          Back to home
        </Link>
        <div className="auth-form">
          <h1>{titles[mode]}</h1>
          <p>{descriptions[mode]}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              setGood(false);
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await post("/auth/" + mode, {
                  ...data,
                  acceptTerms: data.acceptTerms === "on",
                  token: params.get("token"),
                  turnstileToken: token,
                });
                setGood(true);
                if (mode === "login" || mode === "register") {
                  await refresh();
                  const plan = params.get("plan");
                  const next = params.get("next");
                  navigate(
                    plan && plan !== "free"
                      ? "/app/billing"
                      : next?.startsWith("/app") && !next.startsWith("//")
                        ? next
                        : "/app",
                  );
                } else if (mode === "verify") {
                  await refresh();
                  setMessage(
                    "Email verified. You can now create audio.",
                  );
                } else if (mode === "forgot")
                  setMessage(
                    "If an account exists with this email, you will receive a password reset link.",
                  );
                else
                  setMessage(
                    "Password changed. Sign in with your new password.",
                  );
              } catch (err) {
                setMessage((err as Error).message);
                window.turnstile?.reset();
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="What should we call you?"
                />
              </label>
            )}
            {["login", "register", "forgot"].includes(mode) && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
            )}
            {["login", "register", "reset"].includes(mode) && (
              <label>
                Password
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={10}
                    maxLength={128}
                    required
                    placeholder="At least 10 characters"
                  />
                  <button
                    type="button"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}
            {mode === "login" && (
              <Link className="forgot-link" to="/forgot">
                Forgot password?
              </Link>
            )}
            {mode === "register" && (
              <>
                <label className="check-label">
                  <input name="acceptTerms" type="checkbox" required />
                  <span>
                    I am 18 or older and accept the{" "}
                    <Link to="/terms">terms of service</Link>. I have read the{" "}
                    <Link to="/privacy">privacy policy</Link>.
                  </span>
                </label>
                {config.turnstileSiteKey && (
                  <Turnstile
                    siteKey={config.turnstileSiteKey}
                    onToken={setToken}
                  />
                )}
              </>
            )}
            {message && <Notice good={good}>{message}</Notice>}
            {!good || ["login", "register"].includes(mode) ? (
              <Button busy={busy} className="btn dark full" type="submit">
                {
                  (
                    {
                      login: "Sign in",
                      register: "Create free account",
                      forgot: "Send reset link",
                      reset: "Save new password",
                      verify: "Verify email",
                    } as Record<string, string>
                  )[mode]
                }
                <ArrowUpRight size={18} />
              </Button>
            ) : (
              <Link
                className="btn primary full"
                to={mode === "verify" ? "/app" : "/login"}
              >
                {mode === "verify" ? "Open studio" : "Back to login"}
              </Link>
            )}
          </form>
          {mode === "login" && (
            <p className="auth-switch">
              New here?{" "}
              <Link
                to={
                  "/register" +
                  (params.get("next")
                    ? "?next=" + encodeURIComponent(params.get("next")!)
                    : "")
                }
              >
                Create a free account
              </Link>
            </p>
          )}
          {mode === "register" && (
            <p className="auth-switch">
              Already have an account?{" "}
              <Link
                to={
                  "/login" +
                  (params.get("next")
                    ? "?next=" + encodeURIComponent(params.get("next")!)
                    : "")
                }
              >
                Sign in
              </Link>
            </p>
          )}
          <div className="auth-trust">
            <ShieldCheck size={15} />
            Your projects are only accessible to you.
          </div>
        </div>
        <div className="auth-footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Help</Link>
        </div>
      </section>
    </main>
  );
}
