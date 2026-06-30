import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { ArrowRight, LogOut, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api, type ApiEvent, type ApiNotification } from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import { RsvpDialog } from "@/components/RsvpDialog";
import heroImage from "@/assets/hero-event.jpg";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut, refreshUser } = useAuth();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selected, setSelected] = useState<ApiEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ events: ApiEvent[] }>("/events")
      .then((d) => setEvents(d.events))
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoadingEvents(false));
  }, []);

  const toggleNotif = async () => {
    if (!notifOpen) {
      setNotifOpen(true);
      setLoadingNotifs(true);
      try {
        const d = await api.get<{ notifications: ApiNotification[] }>("/auth/notifications");
        setNotifs(d.notifications);
      } catch {}
      setLoadingNotifs(false);
    } else {
      setNotifOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const categories = ["All", ...Array.from(new Set(events.map((e) => e.category)))];
  const visible = filter === "All" ? events : events.filter((e) => e.category === filter);

  const toggleSave = async (e: ApiEvent) => {
    if (!user) {
      toast.error("Sign in to save events");
      navigate({ to: "/auth", search: { role: "user" } });
      return;
    }
    try {
      const res = await api.post<{ saved: boolean }>(`/auth/saved-events/${e._id}`);
      toast.success(res.saved ? "Event saved!" : "Event removed from saved");
      refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to save event");
    }
  };

  const isSaved = (e: ApiEvent) => {
    if (!user || !user.savedEvents) return false;
    return user.savedEvents.some(s => (typeof s === 'string' ? s : s._id) === e._id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 z-20">
        <nav className="container mx-auto px-6 flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt="PlanIt" className="h-10 w-auto transition-smooth group-hover:scale-105" />
            <span className="font-display text-2xl font-semibold tracking-tight">PlanIt<span className="text-primary">.</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#events" className="hover:text-primary transition-smooth">Events</a>
            {user?.role === "host" && <Link to="/host" className="hover:text-primary transition-smooth text-primary font-medium">My Events</Link>}
            {isAdmin && <Link to="/admin" className="hover:text-primary transition-smooth">Admin</Link>}
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/user" className="text-sm hidden sm:inline">Hi, {user.name ?? user.email?.split("@")[0]}</Link>
              {/* Bell with dropdown */}
              <div className="relative" ref={notifRef}>
                <button onClick={toggleNotif} className="relative p-1 hover:text-primary transition-smooth" title="Notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-8 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-semibold">Notifications</span>
                      {unread > 0 && <span className="text-xs text-primary">{unread} new</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifs ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : notifs.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">You're all caught up!</div>
                      ) : (
                        notifs.map(n => (
                          <div key={n._id} className={`px-4 py-3 border-b border-border last:border-b-0 ${!n.read ? "bg-primary/5" : ""}`}>
                            <div className="flex items-start gap-2">
                              <Bell className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                {n.event && <span className="inline-block mt-1 text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{n.event.title}</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-border">
                      <Link to="/user" onClick={() => setNotifOpen(false)} className="text-xs text-primary hover:underline">View all in dashboard →</Link>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => { signOut(); toast.success("Signed out"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/auth", search: { role: "user" } })}>Sign in</Button>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-[#0A0A0A]">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(212, 196, 168, 0.15) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="container mx-auto px-6 relative z-10 pb-20 pt-40">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary mb-6">Featured · This week</span>
          <h1 className="font-display text-6xl md:text-8xl font-medium leading-[0.95] max-w-5xl mb-8">
            Plan it. <em className="text-gradient-warm not-italic">Live it.</em> Remember it.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground mb-10">
            A curated calendar of intimate concerts, workshops, dinners and conferences — hand-picked by people who actually go.
          </p>
          <div className="flex flex-wrap gap-4">
            {user ? (
              <Button size="lg" variant="hero" className="px-8" onClick={() => navigate({ to: "/user" })}>My tickets</Button>
            ) : (
              <Button size="lg" variant="hero" className="px-8" onClick={() => navigate({ to: "/auth", search: { role: "user" } })}>Sign in</Button>
            )}
          </div>
        </div>

        {/* Animated scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <a
            href="#events"
            onClick={(e) => { e.preventDefault(); document.getElementById("events")?.scrollIntoView({ behavior: "smooth" }); }}
            className="group flex flex-col items-center gap-2 cursor-pointer"
          >
            <div
              className="h-10 w-10 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center transition-all group-hover:border-primary group-hover:bg-primary/20"
              style={{ animation: undefined }}
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 group-hover:[animation:scroll-down_1.5s_ease-in-out_infinite]"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <path d="M11.9997 13.1716L7.04996 8.22186L5.63574 9.63607L11.9997 16L18.3637 9.63607L16.9495 8.22186L11.9997 13.1716Z" fill="currentColor" className="text-primary" />
              </svg>
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground group-hover:text-primary transition-colors">Scroll</span>
          </a>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="container mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary mb-3 block">Upcoming</span>
            <h2 className="font-display text-5xl md:text-6xl font-medium leading-tight max-w-2xl">What's on the calendar.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`text-xs uppercase tracking-wider px-4 py-2 border transition-smooth ${filter === cat ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No events found.</p>
            {isAdmin && <Button className="mt-4" onClick={() => navigate({ to: "/admin" })}>Create one in Admin</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((e) => (
              <EventCard 
                key={e._id} 
                event={e} 
                onRsvp={() => { setSelected(e); setOpen(true); }} 
                isSaved={isSaved(e)}
                onSaveToggle={toggleSave}
              />
            ))}
          </div>
        )}
      </section>

      {/* Host CTA — only visible to visitors and regular users */}
      {(!user || user.role === "user") && (
      <section className="container mx-auto px-6 pb-24">
        <div className="relative overflow-hidden border border-border p-12 md:p-20">
          <div className="absolute inset-0 gradient-warm opacity-10" />
          <div className="relative max-w-3xl">
            <span className="text-xs uppercase tracking-[0.3em] text-primary mb-4 block">For hosts</span>
            <h2 className="font-display text-4xl md:text-6xl font-medium leading-tight mb-6">
              Have something <em className="text-gradient-warm not-italic">worth gathering</em> for?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Publish your event in minutes. Manage RSVPs, send updates and check guests in — all from one quiet dashboard.
            </p>
            <Button size="lg" variant="hero" className="px-8" onClick={() => navigate({ to: "/auth", search: { role: "host" } })}>
              Become a host <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      )}

      <footer className="border-t border-border">
        <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} alt="PlanIt" className="h-6 w-auto" />
            <p className="font-display text-lg text-foreground">PlanIt<span className="text-primary">.</span></p>
          </div>
          <div className="flex items-center gap-6">
            <p>© 2026 PlanIt. Made for people who show up.</p>
          </div>
        </div>
      </footer>

      <RsvpDialog event={selected} open={open} onOpenChange={setOpen} onBooked={() => {
        // Refresh spots
        api.get<{ events: ApiEvent[] }>("/events").then((d) => setEvents(d.events)).catch(() => {});
      }} />
    </div>
  );
}
