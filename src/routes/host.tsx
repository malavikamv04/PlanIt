import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, MapPin, Sparkles, Users, Loader2, Bell, Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api, type ApiEvent, type ApiBooking } from "@/lib/api";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/host")({ component: HostPage });

const emptyForm = { title: "", category: "", description: "", date: "", time: "", location: "", city: "", price: "Free", priceAmount: 0, spots: 20, image: "", volunteerPassword: "", assignedVolunteers: [] as {name: string, email: string}[] };

function HostPage() {
  const { user, isHost, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, activeEvents: 0, totalBookings: 0, totalAttendees: 0 });
  const [form, setForm] = useState(emptyForm);
  const [editTarget, setEditTarget] = useState<ApiEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [participants, setParticipants] = useState<ApiBooking[]>([]);
  const [notifyType, setNotifyType] = useState<"update" | "cancelled" | "reminder">("update");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVolPassword, setShowVolPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth", search: { role: "host" } }); return; }
    if (!loading && !isHost) { navigate({ to: "/auth", search: { role: "host" } }); }
  }, [loading, user, isHost, navigate]);

  const loadData = () => {
    api.get<{ events: ApiEvent[] }>("/host/events").then((d) => setEvents(d.events)).catch(() => {});
    api.get<typeof stats>("/host/stats").then(setStats).catch(() => {});
  };

  useEffect(() => { if (user && isHost) loadData(); }, [user, isHost]);

  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (ev: ApiEvent) => {
    setEditTarget(ev);
    setForm({ title: ev.title, category: ev.category, description: ev.description, date: ev.date, time: ev.time, location: ev.location, city: ev.city, price: ev.price, priceAmount: ev.priceAmount, spots: ev.spots, image: ev.image, volunteerPassword: ev.volunteerPassword || "", assignedVolunteers: ev.assignedVolunteers || [] });
    setFormOpen(true);
  };

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        assignedVolunteers: form.assignedVolunteers.filter(v => v.name.trim() && v.email.trim())
      };
      if (editTarget) {
        await api.put(`/events/${editTarget._id}`, payload);
        toast.success("Event updated!");
      } else {
        await api.post("/events", payload);
        toast.success("Event published!");
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success("Event deleted");
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const viewParticipants = async (ev: ApiEvent) => {
    setSelectedEvent(ev);
    try {
      const d = await api.get<{ bookings: ApiBooking[] }>(`/host/events/${ev._id}/participants`);
      setParticipants(d.bookings);
    } catch { setParticipants([]); }
    setParticipantsOpen(true);
  };

  const sendNotification = async () => {
    if (!selectedEvent || !notifyMsg) return;
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/host/events/${selectedEvent._id}/notify`, { type: notifyType, message: notifyMsg });
      toast.success(res.message);
      setNotifyOpen(false);
      setNotifyMsg("");
      if (notifyType === "cancelled") loadData();
    } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-4 w-px bg-border mx-2" />
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo} alt="PlanIt" className="h-8 w-auto transition-smooth group-hover:scale-105" />
              <span className="font-display text-xl font-semibold">PlanIt<span className="text-primary">.</span> Host</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium hidden sm:inline">{user.name ?? user.email}</span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="container mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: stats.totalEvents, icon: Calendar },
          { label: "Active Events", value: stats.activeEvents, icon: Sparkles },
          { label: "Total Bookings", value: stats.totalBookings, icon: Users },
          { label: "Attendees", value: stats.totalAttendees, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-border bg-card p-5 rounded-lg">
            <div className="h-9 w-9 rounded-md bg-primary/15 text-primary flex items-center justify-center mb-3"><Icon className="h-4 w-4" /></div>
            <p className="text-2xl font-display font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      {/* Events table */}
      <section className="container mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-medium">My Events</h1>
          <Button variant="hero" onClick={openCreate}>+ New Event</Button>
        </div>

        {events.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-lg">No events yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first event to start collecting RSVPs.</p>
            <Button variant="hero" onClick={openCreate}>Create event</Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
              <div className="col-span-4">Title</div><div className="col-span-2">Category</div>
              <div className="col-span-2">Date</div><div className="col-span-2">Spots</div><div className="col-span-2 text-right">Actions</div>
            </div>
            {events.map((ev) => (
              <div key={ev._id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-b-0 items-center text-sm">
                <div className="col-span-4 font-display text-base truncate">
                  {ev.title}
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {ev._id}</div>
                </div>
                <div className="col-span-2 text-muted-foreground">{ev.category}</div>
                <div className="col-span-2 text-muted-foreground">{ev.date}</div>
                <div className="col-span-2 text-muted-foreground">{ev.spots - ev.spotsBooked} / {ev.spots}</div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title="View participants" onClick={() => viewParticipants(ev)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Notify participants" onClick={() => { setSelectedEvent(ev); setNotifyOpen(true); }}><Bell className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteEvent(ev._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create/Edit Event Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editTarget ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <form onSubmit={submitEvent} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={f("title")} required /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input placeholder="Music, Workshop…" value={form.category} onChange={f("category")} required /></div>
              <div className="space-y-2"><Label>Spots</Label><Input type="number" min={1} value={form.spots} onChange={f("spots")} required /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={f("description")} required /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={f("date")} required /></div>
              <div className="space-y-2"><Label>Time</Label><Input placeholder="7:00 PM" value={form.time} onChange={f("time")} required /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Venue</Label><Input value={form.location} onChange={f("location")} required /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={f("city")} required /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price (e.g. Free, $25)</Label><Input value={form.price} onChange={f("price")} required /></div>
              <div className="space-y-2"><Label>Image URL (optional)</Label><Input placeholder="https://…" value={form.image} onChange={f("image")} /></div>
            </div>
            <div className="space-y-2">
              <Label>Volunteer Password</Label>
              <div className="relative">
                <Input 
                  type={showVolPassword ? "text" : "password"} 
                  placeholder="Set a password for volunteers" 
                  value={form.volunteerPassword} 
                  onChange={f("volunteerPassword")} 
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowVolPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                >
                  {showVolPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-4 pt-2 border-t border-border mt-4">
              <div className="flex items-center justify-between">
                <Label>Assigned Volunteers (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, assignedVolunteers: [...p.assignedVolunteers, { name: "", email: "" }] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Add Volunteer
                </Button>
              </div>
              <div className="space-y-2">
                {form.assignedVolunteers.map((vol, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Name" value={vol.name} onChange={e => { const v = [...form.assignedVolunteers]; v[i] = { ...v[i], name: e.target.value }; setForm({ ...form, assignedVolunteers: v }) }} className="flex-1" />
                    <Input placeholder="Email" type="email" value={vol.email} onChange={e => { const v = [...form.assignedVolunteers]; v[i] = { ...v[i], email: e.target.value }; setForm({ ...form, assignedVolunteers: v }) }} className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => { const v = [...form.assignedVolunteers]; v.splice(i, 1); setForm({ ...form, assignedVolunteers: v }) }}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button>
                  </div>
                ))}
                {form.assignedVolunteers.length === 0 && <p className="text-xs text-muted-foreground">No volunteers assigned. Click 'Add Volunteer' to authorize them.</p>}
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editTarget ? "Save changes" : "Publish event"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">Participants — {selectedEvent?.title}</DialogTitle></DialogHeader>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{participants.length} booking{participants.length !== 1 ? "s" : ""}</p>
              {participants.map((b) => (
                <div key={b._id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.attendeeName}</p>
                    <p className="text-sm text-muted-foreground">{b.attendeeEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-primary">{b.bookingId}</p>
                    <p className="text-xs text-muted-foreground">{b.qty} ticket{b.qty !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">Notify Participants</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Send an email to all active participants of <strong>{selectedEvent?.title}</strong>.</p>
            <div className="space-y-2"><Label>Notification type</Label>
              <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" value={notifyType} onChange={(e) => setNotifyType(e.target.value as any)}>
                <option value="update">Event Update</option>
                <option value="reminder">Reminder</option>
                <option value="announcement">Custom Announcement</option>
                <option value="cancelled">Event Cancelled</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} placeholder="Enter your message to participants…" /></div>
            <Button variant="hero" className="w-full" disabled={busy || !notifyMsg} onClick={sendNotification}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : "Send notification"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
