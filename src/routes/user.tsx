import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  Ticket, Calendar, MapPin, Clock, Heart, Settings, Bell, Star, ArrowLeft, LogOut, Loader2, Edit3, Mail, CheckCircle2, XCircle, Search, Trash2, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api, type ApiBooking, type ApiEvent, type ApiNotification } from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/user")({ component: UserPage });

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Jack",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Milo",
];

const statusBadge = (s: string) => {
  if (s === "upcoming") return <Badge className="bg-success/15 text-success border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Upcoming</Badge>;
  if (s === "past") return <Badge className="bg-secondary text-muted-foreground border-0">Attended</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-0 gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
};

function UserPage() {
  const { user, loading, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Tabs: "tickets", "saved", "notifications", "settings"
  const [activeTab, setActiveTab] = useState<"tickets" | "saved" | "notifications" | "settings">("tickets");
  
  // Tickets Data
  const [ticketStatus, setTicketStatus] = useState<"upcoming" | "past" | "cancelled" | "all">("upcoming");
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Notifications Data
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Profile Edit Data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [socials, setSocials] = useState({ twitter: "", linkedin: "", website: "" });
  const [avatar, setAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { role: "user" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    
    // Load Bookings
    api.get<{ bookings: ApiBooking[] }>("/bookings/my")
      .then((d) => {
        const now = new Date();
        const rows = d.bookings.map((b) => ({
          ...b,
          status: b.status === "cancelled" ? "cancelled" as const
            : b.event && new Date(b.event.date) < now ? "past" as const : "upcoming" as const,
        }));
        setBookings(rows);
      })
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoadingBookings(false));

    // Profile Data Init
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setBio(user?.bio ?? "");
    setSocials(user?.socials ?? { twitter: "", linkedin: "", website: "" });
    setAvatar(user?.avatar ?? "");
  }, [user]);

  // Load notifications when tab is clicked
  useEffect(() => {
    if (activeTab === "notifications" && user) {
      setLoadingNotifications(true);
      api.get<{ notifications: ApiNotification[] }>("/auth/notifications")
        .then(d => setNotifications(d.notifications))
        .finally(() => setLoadingNotifications(false));
    }
  }, [activeTab, user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>;

  const initials = (user.name ?? user.email ?? "?").split(/\s|@/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put("/auth/profile", { name, phone, bio, avatar, socials });
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (e: any) { toast.error(e.message); }
    setSavingProfile(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const cancelBooking = async (id: string) => {
    try {
      await api.put(`/bookings/${id}/cancel`, {});
      setBookings((prev) => prev.map((b) => b._id === id ? { ...b, status: "cancelled" } : b));
      toast.success("Reservation cancelled");
    } catch (e: any) { toast.error(e.message); }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.put(`/auth/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleSave = async (e: ApiEvent) => {
    try {
      const res = await api.post<{ saved: boolean }>(`/auth/saved-events/${e._id}`);
      toast.success(res.saved ? "Event saved!" : "Event removed from saved");
      refreshUser();
    } catch (err: any) { toast.error(err.message || "Failed to save event"); }
  };

  const filteredTickets = ticketStatus === "all" ? bookings : bookings.filter((b) => b.status === ticketStatus);
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const savedEvents = (user.savedEvents || []) as ApiEvent[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border px-6 lg:px-10 py-4 flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="h-4 w-px bg-border mx-2" />
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt="PlanIt" className="h-8 w-auto transition-smooth group-hover:scale-105" />
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-display font-semibold tracking-tight">PlanIt</span>
              <span className="text-xl font-display text-primary">.</span>
            </div>
          </Link>
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }} className="gap-1.5">
          <LogOut className="h-4 w-4" />Sign out
        </Button>
      </header>

      {/* Profile hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-90" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative px-6 lg:px-10 py-10 lg:py-14">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-primary/30">
              <AvatarImage src={avatar || user.avatar} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-display">{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl md:text-4xl font-display tracking-tight">{user.name ?? user.email}</h1>
                <Badge className="bg-primary/15 text-primary border-0">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                {user.phone && <span>{user.phone}</span>}
              </div>
              {user.bio && <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{user.bio}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 px-6 lg:px-10 py-10">
        <aside className="space-y-6">
          <nav className="rounded-2xl border border-border bg-card p-2 flex flex-col gap-1">
            <button onClick={() => setActiveTab("tickets")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeTab === "tickets" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Ticket className="h-4 w-4" /><span className="flex-1 text-left">My Tickets</span>
            </button>
            <button onClick={() => setActiveTab("saved")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeTab === "saved" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Heart className="h-4 w-4" /><span className="flex-1 text-left">Saved Events</span>
              {savedEvents.length > 0 && <span className="text-xs bg-muted text-foreground px-1.5 rounded">{savedEvents.length}</span>}
            </button>
            <button onClick={() => setActiveTab("notifications")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeTab === "notifications" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Bell className="h-4 w-4" /><span className="flex-1 text-left">Notifications</span>
              {unreadNotifs > 0 && <span className="text-xs bg-primary text-primary-foreground px-1.5 rounded">{unreadNotifs}</span>}
            </button>
            <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeTab === "settings" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Settings className="h-4 w-4" /><span className="flex-1 text-left">Profile Settings</span>
            </button>
          </nav>
        </aside>

        <section className="min-w-0">
          {/* TICKETS TAB */}
          {activeTab === "tickets" && (
            <div>
              <div className="mb-6"><h2 className="text-2xl md:text-3xl font-display tracking-tight">My tickets</h2></div>
              <Tabs value={ticketStatus} onValueChange={(v) => setTicketStatus(v as any)}>
                <TabsList className="bg-secondary mb-6">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <TabsContent value={ticketStatus} className="space-y-4">
                  {loadingBookings ? (
                    <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                      <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium">No tickets here yet</p>
                      <Button variant="hero" className="mt-4" onClick={() => navigate({ to: "/" })}>Browse events</Button>
                    </div>
                  ) : (
                    filteredTickets.map((b) => (
                      <article key={b._id} className="rounded-2xl border border-border bg-card shadow-card p-6 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">{statusBadge(b.status)}<span className="text-xs text-muted-foreground font-mono">{b.bookingId}</span></div>
                              <h3 className="font-display text-xl md:text-2xl">{b.event?.title ?? "(event removed)"}</h3>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{b.event?.date}</p></div>
                            <div><p className="text-xs text-muted-foreground">Time</p><p className="font-medium">{b.event?.time}</p></div>
                            <div className="col-span-2"><p className="text-xs text-muted-foreground">Venue</p><p className="font-medium">{b.event?.location}, {b.event?.city}</p></div>
                          </div>
                          {b.status === "upcoming" && (
                            <Button size="sm" variant="outline" className="mt-4" onClick={() => cancelBooking(b._id)}>Cancel reservation</Button>
                          )}
                        </div>
                        {b.status === "upcoming" && (
                          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-border self-start shrink-0">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(b.bookingId)}`} 
                              alt="Ticket QR Code" 
                              className="h-24 w-24 mb-2"
                            />
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-center">Scan at door</span>
                            <span className="text-xs font-mono text-foreground font-semibold mt-1">{b.bookingId}</span>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* SAVED EVENTS TAB */}
          {activeTab === "saved" && (
            <div>
              <div className="mb-6"><h2 className="text-2xl md:text-3xl font-display tracking-tight">Saved Events</h2></div>
              {savedEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <Heart className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>You haven't saved any events yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {savedEvents.map((e) => (
                    <EventCard key={e._id} event={e} onRsvp={() => navigate({ to: "/" })} isSaved={true} onSaveToggle={toggleSave} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div>
              <div className="mb-6"><h2 className="text-2xl md:text-3xl font-display tracking-tight">Notifications</h2></div>
              {loadingNotifications ? (
                <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n._id} className={`p-4 rounded-xl border ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/20"} flex gap-4`}>
                      <div className="mt-1"><Bell className={`h-5 w-5 ${n.read ? "text-muted-foreground" : "text-primary"}`} /></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium ${!n.read && "text-foreground"}`}>{n.title}</h4>
                          <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{n.message}</p>
                        {n.event && <p className="text-xs text-muted-foreground bg-secondary inline-block px-2 py-1 rounded">Event: {n.event.title}</p>}
                        {!n.read && <Button variant="link" size="sm" className="h-auto p-0 ml-4 text-primary" onClick={() => markNotificationRead(n._id)}>Mark read</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="max-w-2xl">
              <div className="mb-6"><h2 className="text-2xl md:text-3xl font-display tracking-tight">Profile Settings</h2></div>
              <div className="space-y-6">
                
                 {/* Avatar Upload */}
                <div className="flex flex-col gap-6 p-6 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                      <AvatarImage src={avatar} className="object-cover" />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <Button variant="outline" size="sm" className="mb-2" onClick={() => fileInputRef.current?.click()}><Camera className="h-4 w-4 mr-2" /> Upload Custom Picture</Button>
                      <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 5MB max.</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-border pt-4">
                    <Label className="text-sm font-medium mb-3 block">Or choose a preset avatar</Label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAvatar(url)}
                          className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-1 bg-muted/30 hover:scale-105 ${avatar === url ? "border-primary ring-2 ring-primary/20 scale-105" : "border-transparent hover:border-muted-foreground/30"}`}
                        >
                          <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Phone number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                
                <div className="space-y-2"><Label>Bio</Label><Textarea rows={4} placeholder="A little about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} /></div>

                <div className="space-y-4 p-5 rounded-2xl border border-border bg-card/50">
                  <h4 className="font-medium">Social Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Twitter URL</Label><Input placeholder="https://twitter.com/..." value={socials.twitter} onChange={(e) => setSocials({...socials, twitter: e.target.value})} /></div>
                    <div className="space-y-2"><Label>LinkedIn URL</Label><Input placeholder="https://linkedin.com/in/..." value={socials.linkedin} onChange={(e) => setSocials({...socials, linkedin: e.target.value})} /></div>
                    <div className="space-y-2 col-span-1 md:col-span-2"><Label>Website</Label><Input placeholder="https://..." value={socials.website} onChange={(e) => setSocials({...socials, website: e.target.value})} /></div>
                  </div>
                </div>

                <Button variant="hero" className="w-full md:w-auto px-8" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Profile"}
                </Button>
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}
