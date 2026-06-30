import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Pencil, Plus, Trash2, Users, Calendar, Ticket, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api, type ApiEvent, type ApiBooking, type ApiUser } from "@/lib/api";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const emptyForm = { title: "", category: "", description: "", date: "", time: "", location: "", city: "", price: "Free", priceAmount: 0, spots: 50, image: "" };

function AdminPage() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [hosts, setHosts] = useState<ApiUser[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [stats, setStats] = useState({ users: 0, hosts: 0, events: 0, bookings: 0, revenue: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth", search: { role: "admin" } }); return; }
    if (!loading && !isAdmin) { toast.error("Admins only"); navigate({ to: "/" }); }
  }, [loading, user, isAdmin, navigate]);

  const loadAll = () => {
    api.get<{ events: ApiEvent[] }>("/admin/events").then((d) => setEvents(d.events)).catch(() => {});
    api.get<{ users: ApiUser[] }>("/admin/users").then((d) => setUsers(d.users)).catch(() => {});    api.get<{ hosts: ApiUser[] }>('/admin/hosts').then((d) => setHosts(d.hosts)).catch(() => {});    api.get<{ bookings: ApiBooking[] }>("/admin/bookings").then((d) => setBookings(d.bookings)).catch(() => {});
    api.get<typeof stats>("/admin/stats").then(setStats).catch(() => {});
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const f = (k: string) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openNew = () => { setEditTarget(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (ev: ApiEvent) => {
    setEditTarget(ev);
    setForm({ title: ev.title, category: ev.category, description: ev.description, date: ev.date, time: ev.time, location: ev.location, city: ev.city, price: ev.price, priceAmount: ev.priceAmount, spots: ev.spots, image: ev.image });
    setFormOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editTarget) { await api.put(`/admin/events/${editTarget._id}`, form); toast.success("Event updated!"); }
      else { await api.post("/admin/events", form); toast.success("Event created!"); }
      setFormOpen(false); loadAll();
    } catch (err: any) { toast.error(err.message); }
    setBusy(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try { await api.delete(`/admin/events/${id}`); toast.success("Deleted"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user and all their bookings?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("User deleted"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  const changeRole = async (id: string, role: string) => {
    try { await api.put(`/admin/users/${id}/role`, { role }); toast.success("Role updated"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading || !user || !isAdmin) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-smooth">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Site</span>
            </Link>
            <div className="h-4 w-px bg-border mx-2" />
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo} alt="PlanIt" className="h-8 w-auto transition-smooth group-hover:scale-105" />
              <span className="font-display text-xl font-semibold">PlanIt<span className="text-primary">.</span> Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4 mr-1" />Sign out</Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="container mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Users", value: stats.users, icon: Users },
          { label: "Hosts", value: stats.hosts, icon: Users },
          { label: "Events", value: stats.events, icon: Calendar },
          { label: "Bookings", value: stats.bookings, icon: Ticket },
          { label: "Revenue", value: `$${stats.revenue}`, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-border bg-card p-4 rounded-lg">
            <Icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-display font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <main className="container mx-auto px-6 pb-12">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="hosts">Hosts ({hosts.length})</TabsTrigger>
          </TabsList>
          {/* EVENTS TAB */}
          <TabsContent value="events">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl">All Events</h2>
              <Button onClick={openNew} variant="hero"><Plus className="h-4 w-4 mr-1" />New event</Button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                <div className="col-span-4">Title</div><div className="col-span-2">Category</div>
                <div className="col-span-2">Date</div><div className="col-span-2">Spots</div><div className="col-span-2 text-right">Actions</div>
              </div>
              {events.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground">No events yet.</div>}
              {events.map((ev) => (
                <div key={ev._id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-b-0 items-center text-sm">
                  <div className="col-span-4 font-display text-base truncate">{ev.title}</div>
                  <div className="col-span-2 text-muted-foreground">{ev.category}</div>
                  <div className="col-span-2 text-muted-foreground">{ev.date}</div>
                  <div className="col-span-2 text-muted-foreground">{ev.spots - ev.spotsBooked} / {ev.spots}</div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteEvent(ev._id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <h2 className="font-display text-2xl mb-4">All Users</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                <div className="col-span-4">Name</div><div className="col-span-4">Email</div>
                <div className="col-span-2">Role</div><div className="col-span-2 text-right">Actions</div>
              </div>
              {users.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground">No users yet.</div>}
              {users.map((u) => (
                <div key={u._id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-b-0 items-center text-sm">
                  <div className="col-span-4 font-medium">{u.name}</div>
                  <div className="col-span-4 text-muted-foreground truncate">{u.email}</div>
                  <div className="col-span-2">
                    <select value={u.role} onChange={(e) => changeRole(u._id as string, e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1 text-xs">
                      <option value="user">User</option>
                      <option value="host">Host</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => deleteUser(u._id as string)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* HOSTS TAB */}
          <TabsContent value="hosts">
            <h2 className="font-display text-2xl mb-4">All Hosts</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                <div className="col-span-4">Name</div><div className="col-span-4">Email</div>
                <div className="col-span-2">Role</div><div className="col-span-2 text-right">Actions</div>
              </div>
              {hosts.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground">No hosts yet.</div>}
              {hosts.map((h) => (
                <div key={h._id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-b-0 items-center text-sm">
                  <div className="col-span-4 font-medium">{h.name}</div>
                  <div className="col-span-4 text-muted-foreground truncate">{h.email}</div>
                  <div className="col-span-2 text-muted-foreground">{h.role}</div>
                  <div className="col-span-2 flex justify-end">
                    <Button size="icon" variant="ghost" disabled><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings">
            <h2 className="font-display text-2xl mb-4">All Bookings</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                <div className="col-span-2">ID</div><div className="col-span-3">User</div>
                <div className="col-span-4">Event</div><div className="col-span-2">Status</div><div className="col-span-1">Qty</div>
              </div>
              {bookings.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground">No bookings yet.</div>}
              {bookings.map((b) => (
                <div key={b._id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-b-0 items-center text-sm">
                  <div className="col-span-2 font-mono text-xs text-primary">{b.bookingId}</div>
                  <div className="col-span-3">
                    <p className="font-medium truncate">{(b.user as any)?.name || b.attendeeName}</p>
                    <p className="text-xs text-muted-foreground truncate">{(b.user as any)?.email || b.attendeeEmail}</p>
                  </div>
                  <div className="col-span-4 truncate">{(b.event as any)?.title}</div>
                  <div className="col-span-2">
                    <Badge className={b.status === "upcoming" ? "bg-success/15 text-success border-0" : b.status === "cancelled" ? "bg-destructive/15 text-destructive border-0" : "bg-secondary border-0"}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="col-span-1">{b.qty}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Event Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editTarget ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <form onSubmit={saveEvent} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={f("title")} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={f("category")} required /></div>
              <div className="space-y-2"><Label>Price</Label><Input value={form.price} onChange={f("price")} required /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={f("description")} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={f("date")} required /></div>
              <div className="space-y-2"><Label>Time</Label><Input placeholder="7:00 PM" value={form.time} onChange={f("time")} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Venue</Label><Input value={form.location} onChange={f("location")} required /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={f("city")} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Spots</Label><Input type="number" min={0} value={form.spots} onChange={f("spots")} required /></div>
              <div className="space-y-2"><Label>Image URL</Label><Input placeholder="https://…" value={form.image} onChange={f("image")} /></div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : editTarget ? "Save changes" : "Create event"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
