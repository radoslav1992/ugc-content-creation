import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, FileText, Headphones, Menu, Mic2, Play, Podcast, ShieldCheck, Sparkles, Video, X } from "lucide-react";
import { plans, voiceList, modes } from "../shared/catalog";
import { Logo, Wave, VoiceCard, api, post, useAuth, Button, Notice, type Voice } from "./lib";
export { Landing } from './Showcase';
export function PublicLayout() {
 const [open,setOpen]=useState(false); const {user}=useAuth();
 return <><header className="public-header"><div className="container header-inner"><Logo/><nav className={open?'open':''} aria-label="Main navigation">{[['/','Overview'],['/voices','Voices'],['/pricing','Pricing'],['/about','Our story']].map(([to,label])=><NavLink key={to} to={to} onClick={()=>setOpen(false)}>{label}</NavLink>)}</nav><div className="header-actions"><Link className="login-link" to={user?'/app':'/login'}>{user?'Workspace':'Log in'}</Link><Link className="btn dark small-btn" to={user?'/app/video-studio':'/register'}>{user?'Open studio':'Create for free'}<ArrowUpRight size={16}/></Link><button className="mobile-menu round" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div></div></header><Outlet/><footer className="footer"><div className="container"><div className="footer-top"><div><Logo/><p>Your ideas deserve<br/>a little screen time.</p></div><div><strong>Make something</strong><Link to="/app/studio">Audio & podcasts</Link><Link to="/app/video-studio">Avatar videos</Link><Link to="/app/media">Images & editing</Link><Link to="/voices">Voice library</Link></div><div><strong>Meet Scene</strong><Link to="/pricing">Pricing</Link><Link to="/about">Our story</Link><Link to="/contact">Get in touch</Link></div><div><strong>The details</strong><Link to="/terms">Terms of service</Link><Link to="/privacy">Privacy policy</Link><Link to="/cookies">Cookies</Link><Link to="/refunds">Refunds</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Scene. A little studio. A lot of possibility.</span><span>Made for your imagination. ✳</span></div></div></footer></>;
}
export function Pricing({ inApp = false }: { inApp?: boolean }) {
  const { user, refresh } = useAuth();
  const [params] = useSearchParams();
  useEffect(() => {
    if (!inApp || !params.has("success")) return;
    let attempts = 0;
    void refresh();
    const timer = setInterval(() => {
      void refresh();
      if (++attempts >= 12) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [inApp, params.toString()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const choose = async (id: string) => {
    if (!user) {
      location.href = "/register?plan=" + id;
      return;
    }
    if (id === "free") {
      location.href = "/app/studio";
      return;
    }
    setBusy(id);
    setError("");
    try {
      const d = await post(
        user.hasSubscription ? "/billing/portal" : "/billing/checkout",
        { plan: id },
      );
      location.href = d.url;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <main className={inApp ? "app-page" : "container section pricing-page"}>
      <div className={inApp ? "page-heading" : "center-heading"}>
        <span className="eyebrow">ROOM FOR EVERY IDEA</span>
        <h1>{inApp ? "Your subscription" : "Big ideas. Clear pricing."}</h1>
        <p>Choose your creative space. Change your plan when you are ready.</p>
      </div>
      {error && <Notice>{error}</Notice>}
      {inApp && params.has("success") && (
        <Notice good={user?.hasSubscription}>
          Your payment is being verified. Your plan updates automatically after
          confirmation. If it has not updated yet, refresh in a moment.
        </Notice>
      )}
      {inApp && user && (
        <div className="billing-summary">
          <span>
            Used{" "}
            <strong>
              {user.used.toLocaleString("en")} /{" "}
              {user.limit.toLocaleString("en")}
            </strong>{" "}
            credits
          </span>
          {user.periodEnd && (
            <span>
              Period ends{" "}
              {new Date(user.periodEnd * 1000).toLocaleDateString("en")}
            </span>
          )}
          {user.hasSubscription && (
            <Button
              onClick={() => choose("portal")}
              busy={busy === "portal"}
              className="btn outline"
            >
              Manage plan & invoices
            </Button>
          )}
        </div>
      )}
      <div className="pricing-grid">
        {plans.map((p) => (
          <article
            key={p.id}
            className={"price-card " + (p.id === "creator" ? "featured" : "")}
          >
            {p.id === "creator" && (
              <div className="recommended">FOR EVERYDAY CREATORS</div>
            )}
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <div className="price">
              €{p.price}
              <span>{p.price ? "/ month" : "/ one time"}</span>
            </div>
            <Button
              onClick={() => choose(p.id)}
              busy={busy === p.id}
              className={"btn " + (p.id === "creator" ? "primary" : "outline")}
            >
              {user?.hasSubscription
                ? "Manage your plan"
                : p.id === "free"
                  ? "Try it free"
                  : "Choose " + p.name}
              <ArrowUpRight size={16} />
            </Button>
            <ul>
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={16} />
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="pricing-notes">
        <p><strong>One balance for audio and video.</strong> Audio: 1 character = 1 credit. Premium voice in Video Studio: 3 credits per character, including tags. Video: Low quality — 300 credits/sec.; Medium — 900; High — 1,800. Video uses a completed single-voice recording of 5–60 seconds. Each started second is rounded up; audio is charged separately.</p>
        <p>
          <ShieldCheck size={18} />
          Secure checkout. Cancel anytime.
        </p>
        <p>
          Prices are in euros. Applicable taxes are included in the final price at
          checkout. Monthly credits do not roll over. The free trial requires a
          verified email.
        </p>
        <p>
          Each recording supports up to 10,000 characters. There are no overage charges when you reach your
          limit — generation pauses until your plan renews or changes.
        </p>
      </div>
    </main>
  );
}
export function Voices({ inApp = false }: { inApp?: boolean }) {
  const [voices, setVoices] = useState<Voice[]>(voiceList);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  useEffect(() => {
    api<{ voices: Voice[] }>("/voices")
      .then((d) => setVoices(d.voices))
      .catch(() => {});
  }, []);
  const list = voices.filter(
    (v) =>
      (filter === "All" || v.gender === filter) &&
      (v.name + " " + v.tone).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className={inApp ? "app-page" : "container section"}>
      <div className="page-heading">
        <span className="eyebrow">30 VOICES. ENDLESS STORIES.</span>
        <h1>Find your signature sound.</h1>
        <p>
          From a calm narration to a high-energy ad. Choose the personality for
          your next recording.
        </p>
      </div>
      <div className="filter-bar">
        <div className="segmented">
          {["All", "Female", "Male"].map((f) => (
            <button
              className={f === filter ? "active" : ""}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search voices"
          placeholder="Search by name or tone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="voice-grid">
        {list.map((v) => (
          <VoiceCard
            key={v.id}
            voice={v}
            onSelect={() => {
              location.href = "/app/studio?voice=" + v.id;
            }}
          />
        ))}
      </div>
      {!list.length && (
        <div className="empty-state">
          No voices match your search. Try another name.
        </div>
      )}
      <p className="small-note">
        Names identify synthetic voices. Descriptions are a guide;
        try your own text to hear the result. Samples appear when available.
      </p>
    </main>
  );
}
export function About() {
  return (
    <main className="container section about">
      <span className="eyebrow">MEET SCENE</span>
      <h1>
        Good ideas
        <br />
        deserve to be heard.
        <br />And seen.
      </h1>
      <div className="about-visual">
        <AudioLines size={72} />
        <Wave bars={60} />
        <span>Scene</span>
      </div>
      <div className="prose">
        <h2>Created by Radoslav Dodnikov.</h2>
        <p>
          Scene is a project by Radoslav Dodnikov, a software and AI engineer from Sofia
          and the founder of{" "}
          <a href="https://kova.bg" rel="noopener">
            Kova Studio
          </a>{" "}
          — the creator of Zapiski BG.
        </p>
        <h2>More time for what you want to say.</h2>
        <p>
          Scene is a creative studio for people who make content:
          — teachers, authors, marketers, and small businesses. We bring scripts,
          voices, and finished creations into one focused workspace.
        </p>
        <p>
          The idea is simple: production should not stand between a great
          story and its audience. Start with a sentence,
          prepare a lesson, or record a conversation between two hosts.
        </p>
        <h2>Your words stay yours.</h2>
        <p>
          We do not publish your projects in a shared catalogue. Your recordings are available through
          your account. You decide what to download and where to use it.
        </p>
        <h2>Made with attention to expression.</h2>
        <p>
          An English interface, clear pricing, and voices with different personalities.
          Synthetic speech can mispronounce names, abbreviations, or certain words —
          so listening back is an essential part of the process.
        </p>
        <Link className="btn primary" to="/contact">
          Let's talk <ArrowUpRight size={18} />
        </Link>
      </div>
    </main>
  );
}
export function Contact() {
  const [contact, setContact] = useState<{ email?: string; phone?: string }>(
    {},
  );
  useEffect(() => {
    api("/public/config")
      .then((d) => setContact(d.company))
      .catch(() => {});
  }, []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [good, setGood] = useState(false);
  return (
    <main className="container section contact-page">
      <div>
        <span className="eyebrow">WE ARE LISTENING</span>
        <h1>Let's talk.</h1>
        <p>
          A question about a recording, an idea for a feature,
          <br />
          or something we could make better?
        </p>
        <div className="contact-direct">
          {contact.email && (
            <p>
              <a href={"mailto:" + contact.email}>{contact.email}</a>
            </p>
          )}
          {contact.phone && (
            <p>
              Phone:{" "}
              <a href={"tel:" + contact.phone}>
                {contact.phone === "+35924920201"
                  ? "02 492 0201"
                  : contact.phone}
              </a>
            </p>
          )}
        </div>
        <div className="contact-note">
          <Mic2 size={30} />
          <h3>Tell us what you have in mind.</h3>
          <p>
            Describe what you want to achieve. If something is not working, include the name
            of your project.
          </p>
        </div>
      </div>
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const form = e.currentTarget;
          const d = Object.fromEntries(new FormData(form));
          try {
            await post("/contact", d);
            setGood(true);
            setMessage(
              "We received your message and will reply to your email.",
            );
            form.reset();
          } catch (err) {
            setGood(false);
            setMessage((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Your name
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
        <label>
          Reply email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          How can we help?
          <textarea
            name="message"
            rows={6}
            required
            minLength={10}
            maxLength={5000}
          />
        </label>
        <input
          className="honeypot"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <p className="small-note">
          We use these details only to respond to your enquiry.{" "}
          <Link to="/privacy">Privacy</Link>
        </p>
        {message && <Notice good={good}>{message}</Notice>}
        <Button busy={busy} className="btn dark" type="submit">
          Send message <ArrowUpRight size={17} />
        </Button>
      </form>
    </main>
  );
}
const legalContent: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  terms: {
    title: "Terms of service",
    sections: [
      [
        "1. About the service",
        "Scene provides online tools for converting text into synthetic speech, creating audio conversations, and generating talking avatar videos. The service is for people aged 18 or over. Registration requires a valid email, a password, and acceptance of these terms.",
      ],
      [
        "2. Your account",
        "You are responsible for access to your account and the accuracy of your details. Do not share your password. If you suspect unauthorized access, change your password and contact us.",
      ],
      [
        "3. Scripts and recordings",
        "You retain your rights to submitted scripts. You grant us limited permission to process and store them to provide the service. You are responsible for obtaining the necessary rights and permissions, including rights to uploaded portraits and consent from the person depicted. You may use downloaded recordings in personal and commercial projects subject to applicable rights and law. We do not guarantee exclusive synthetic voices or copyright protection for every output.",
      ],
      [
        "4. Acceptable use",
        "Fraud, impersonating a real person without permission, copyright infringement, illegal content, and evading limits through multiple accounts are prohibited. If a violation is established, we may restrict access and notify the user where the law permits.",
      ],
      [
        "5. Pricing and subscriptions",
        "Paid plans renew monthly until cancelled. The amount, currency, and applicable taxes are shown before payment. Credits form one balance for audio and video. Standard audio costs 1 credit per character. Video Studio speech costs 3 credits per character, including emotion tags. Video costs 300 credits per started second for Low quality, 900 for Medium, and 1,800 for High. Video is charged in addition to its source audio and the cost is confirmed before submission. A failed video refunds only the video credits. Unused monthly credits do not roll over. Failed generation refunds reserved credits. Payments and invoices can be managed from your account.",
      ],
      [
        "6. Quality and availability",
        "Results are generated automatically and may contain pronunciation, stress, or intonation errors. Listen to and review outputs before publishing. Videos may contain visual inaccuracies or imperfect lip synchronization. We do not promise uninterrupted availability or a specific generation time. This does not limit your statutory consumer rights.",
      ],
      [
        "7. Cancellation and changes",
        "You can cancel renewal from the subscription page. Paid access continues until the end of the paid period. Material pricing and terms changes are communicated in advance and do not retroactively change a paid period.",
      ],
      [
        "8. Governing law and disputes",
        "Bulgarian law applies without limiting mandatory consumer rights. Please contact us first using the contact form. You may lodge a complaint with the Bulgarian Commission for Consumer Protection or the competent court. See also the cancellation and refund policy.",
      ],
    ],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      [
        "1. Data we process",
        "Name and email, a secure password hash, project scripts, uploaded portraits, generated audio and videos, credit usage, subscription identifiers, and support correspondence. To prevent abuse, we retain limited technical records and short-lived hashed identifiers. We do not store full payment card details.",
      ],
      [
        "2. Why we use it",
        "Contract performance: accounts, audio and video generation, storage, and payments. Legal obligations: accounting and tax records where applicable. Legitimate interests: security, abuse prevention, and responding to enquiries. We do not send marketing emails without a separate lawful basis.",
      ],
      [
        "3. Providers and recipients",
        "We use Cloudflare for hosting, storage, audio processing, and transactional email, and Stripe for payments. For premium Video Studio speech, we send the script and selected voice to ElevenLabs. Emotion suggestions process the script through Cloudflare AI. Uploaded video transcription sends the video to ElevenLabs. Word timings are stored with the recording. Background exports run in Cloudflare; local exports run in your browser. Product avatar creation sends the portrait and product photo to fal.ai and its image provider. Requested avatar videos send the selected audio and portrait to WaveSpeedAI for Low quality or fal.ai for Medium and High quality, and the relevant video provider. These providers and their subprocessors may process data outside the EEA under applicable contractual safeguards. We do not sell personal data or use projects to train our own models.",
      ],
      [
        "4. Retention",
        "Scripts and settings for up to 100 projects remain until deletion or account closure. Once media tools are enabled, recordings and finished exports remain for 7 days on Free, 30 days on Starter, 90 days on Creator, and 180 days on Studio. Your files show the exact expiry date. Unsaved product variants remain for 7 days; explicitly saved images remain during an active subscription and for 30 days after it ends. Incomplete uploads are cleaned up after 24 hours. Active processing temporarily delays cleanup. Older recordings receive a full new retention period when first added to the media library. Storage is 100 MB / 2 GB / 10 GB / 20 GB by plan, with up to 300 files. New operations are restricted when storage is full; saved files are not automatically deleted to free space. Provider request data is removed after 30 days; brief credit and result records remain for accountability. Unverified registrations are removed after 7 days. Sessions expire within 30 days. Verification links last 24 hours and reset links 1 hour. Enquiries are deleted after 12 months. Required accounting records remain with the payment provider for statutory periods. Backups and limited technical logs may have separate provider retention periods.",
      ],
      [
        "5. Your rights",
        "You have rights of access, rectification, erasure, restriction, portability, and objection subject to GDPR conditions. Download your data and delete your account in Settings. Use the contact form for additional requests. You may complain to the Bulgarian Commission for Personal Data Protection at cpdp.bg.",
      ],
      [
        "6. Security",
        "We use secure connections, hashed passwords and sessions, and ownership checks when accessing recordings. Account deletion requires re-entering your password and cancelling any active subscription first. Do not include other people's sensitive information in scripts without an appropriate basis.",
      ],
    ],
  },
  cookies: {
    title: "Cookie policy",
    sections: [
      [
        "Only what is necessary",
        "Scene uses the necessary scene_session cookie to authenticate your session. It is HttpOnly, SameSite=Lax, and Secure over HTTPS, with a maximum lifetime of 30 days. The application has no advertising or analytics cookies.",
      ],
      [
        "Registration protection",
        "When registration protection is enabled, Cloudflare Turnstile checks the browser. Stripe checkout pages may use their own necessary security technologies.",
      ],
      [
        "Your control",
        "You can delete cookies through browser settings or log out. Blocking the session cookie prevents login. If optional technologies are added, we will provide a separate choice before enabling them.",
      ],
    ],
  },
  refunds: {
    title: "Cancellation and refunds",
    sections: [
      [
        "Cancelling renewal",
        "Open Billing in your account and choose Manage plan. You can stop the next renewal at any time. This does not remove your already paid period; access continues until it ends.",
      ],
      [
        "Right of withdrawal",
        "If you are a consumer, you generally have 14 days from entering the contract to exercise a right of withdrawal. Use the contact form and provide your account email, payment date, and a statement that you wish to withdraw. No reason is required.",
      ],
      [
        "Starting the service",
        "Activating the service or using credits does not itself remove your statutory withdrawal right. The current process does not require you to waive that right. Requests are assessed under the applicable rules for services and digital content.",
      ],
      [
        "Generation problems",
        "If a recording fails, reserved credits are returned automatically. If a recording is corrupted or a refund has not appeared, send the project name through the contact form.",
      ],
      [
        "Payment refunds",
        "For valid requests, we refund the original payment method within the statutory period. Your bank may take additional time to show the refund. This policy does not limit rights relating to non-conformity or other mandatory consumer rights.",
      ],
    ],
  },
};
export function Legal({ page }: { page: string }) {
  const [company, setCompany] = useState<{
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    id?: string;
    email?: string;
  }>({});
  useEffect(() => {
    api("/public/config")
      .then((d) => setCompany(d.company))
      .catch(() => {});
  }, []);
  const c = legalContent[page];
  return (
    <main className="container section legal-page">
      <span className="eyebrow">CLEAR TERMS</span>
      <h1>{c.title}</h1>
      <p className="small-note">Last updated: September 20, 2026</p>
      {company.name ? (
        <div className="legal-operator">
          <strong>Provider: {company.name}</strong>
          {company.id && <p>Company ID: {company.id}</p>}
          {company.address ? (
            <p>Address: {company.address}</p>
          ) : company.city ? (
            <p>City: {company.city}</p>
          ) : null}
          {company.email && (
            <p>
              Contact: <a href={"mailto:" + company.email}>{company.email}</a>
            </p>
          )}
          {company.phone && (
            <p>
              Phone:{" "}
              <a href={"tel:" + company.phone}>
                {company.phone === "+35924920201"
                  ? "02 492 0201"
                  : company.phone}
              </a>
            </p>
          )}
        </div>
      ) : (
        <Notice>
          The service is being prepared for launch. Provider details will be
          published before registration and payments are enabled.
        </Notice>
      )}
      <div className="prose">
        {c.sections.map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
        <p>
          For questions and rights requests:{" "}
          <Link to="/contact">contact us</Link>.
        </p>
      </div>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="not-found">
      <Logo />
      <span>404</span>
      <h1>Nothing here just yet.</h1>
      <p>This page does not exist or has moved.</p>
      <Link className="btn primary" to="/">
        Back to home <ArrowUpRight />
      </Link>
    </main>
  );
}
