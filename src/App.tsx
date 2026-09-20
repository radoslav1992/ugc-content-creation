import { lazy, Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  House,
  Film,
  AudioLines,
  Folder,
  Users,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  CreditCard,
} from "lucide-react";
import {
  api,
  post,
  AuthContext,
  useAuth,
  Logo,
  number,
  type User,
} from "./lib";
import {
  PublicLayout,
  Landing,
  Pricing,
  Voices,
  About,
  Contact,
  Legal,
  NotFound,
} from "./Public";
import { AuthPage } from "./Auth";
import { Dashboard, Projects } from "./Dashboard";
import { Studio } from "./Studio";
import { SettingsPage } from "./Settings";
import { JobActivity } from "./JobActivity";
const MediaTools = lazy(() => import("./MediaTools").then(m => ({default:m.MediaTools})));
const VideoStudio = lazy(() => import("./VideoStudio").then(m => ({ default: m.VideoStudio })));
function Scroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function Shell() {
  const { user, loading, refresh } = useAuth();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  if (loading)
    return (
      <div className="loading-page">Loading your workspace…</div>
    );
  if (!user)
    return (
      <Navigate
        to={
          "/login?next=" +
          encodeURIComponent(location.pathname + location.search)
        }
        replace
      />
    );
  const nav = [
    ["/app", "Home", House],
    ["/app/studio", "Audio", AudioLines],
    ["/app/video-studio", "Video Studio", Film],
    ["/app/media", "Media tools", Film],
    ["/app/projects", "My projects", Folder],
    ["/app/voices", "Voices", Users],
    ["/app/billing", "Billing", CreditCard],
    ["/app/settings", "Settings", Settings],
  ] as const;
  return (
    <div className="app-shell">
      <header className="mobile-app">
        <Logo />
        <button
          className="round"
          aria-label="Menu"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Logo />
        <Link className="btn primary new-project" to="/app/studio">
          <Plus size={18} />
          New recording
        </Link>
        <span className="nav-label">YOUR WORKSPACE</span>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink end={to === "/app"} key={to} to={to}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quota">
            <div>
              <strong>{number(Math.max(0, user.limit - user.used))}</strong>
              <span>credits left</span>
            </div>
            <progress max={user.limit} value={user.used} />
            <Link to="/app/billing">
              View plans <span>↗</span>
            </Link>
          </div>
          <Link className="user-profile" to="/app/settings">
            <span className="user-avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </Link>
          <button
            className="logout"
            onClick={async () => {
              await post("/auth/logout");
              await refresh();
              navigate("/");
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
      <main className="workspace">
        {!user.verified && (
          <div className="verify-banner">
            Verify your email to create audio.{" "}
            <Link to="/app/settings">Resend email</Link>
          </div>
        )}
        <JobActivity key={user.id}><Outlet /></JobActivity>
      </main>
    </div>
  );
}
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const d = await api<{ user: User | null }>("/auth/me");
      setUser(d.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      <Scroll />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={user ? <Navigate to="/app" replace /> : <Landing />}
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/voices" element={<Voices />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          {["terms", "privacy", "cookies", "refunds"].map((page) => (
            <Route
              key={page}
              path={"/" + page}
              element={<Legal page={page} />}
            />
          ))}
        </Route>
        {["login", "register", "forgot", "reset", "verify"].map((mode) => (
          <Route
            key={mode}
            path={"/" + mode}
            element={<AuthPage mode={mode} />}
          />
        ))}
        <Route path="/app" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="studio" element={<Studio />} />
          <Route path="studio/:id" element={<Studio />} />
          <Route path="video-studio" element={<Suspense fallback={<p>Loading…</p>}><VideoStudio /></Suspense>} />
          <Route path="video-studio/:id" element={<Suspense fallback={<p>Loading…</p>}><VideoStudio /></Suspense>} />
          <Route path="media" element={<Suspense fallback={<p>Loading…</p>}><MediaTools /></Suspense>} />
          <Route path="projects" element={<Projects />} />
          <Route path="voices" element={<Voices inApp />} />
          <Route path="billing" element={<Pricing inApp />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthContext.Provider>
  );
}
