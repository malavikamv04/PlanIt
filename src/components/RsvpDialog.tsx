import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { api, type ApiEvent } from "@/lib/api";

export const RsvpDialog = ({
  event, open, onOpenChange, onBooked,
}: {
  event: ApiEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onBooked?: () => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setQty(1);
    }
  }, [open, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!user) {
      toast.error("Please sign in to reserve a spot.");
      onOpenChange(false);
      navigate({ to: "/auth", search: { role: "user" } });
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ booking: any; message: string }>("/bookings", {
        eventId: event._id,
        attendeeName: name,
        attendeeEmail: email,
        qty,
      });
      toast.success(res.message);
      onOpenChange(false);
      onBooked?.();
    } catch (err: any) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const spotsLeft = event ? event.spots - event.spotsBooked : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="text-xs uppercase tracking-[0.2em] text-primary">{event?.category}</span>
          <DialogTitle className="font-display text-3xl font-medium leading-tight">{event?.title}</DialogTitle>
          <DialogDescription>{event?.date} · {event?.location}, {event?.city}</DialogDescription>
        </DialogHeader>
        {!user ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">You need to sign in before reserving a spot.</p>
            <Button variant="hero" className="w-full" onClick={() => { onOpenChange(false); navigate({ to: "/auth", search: { role: "user" } }); }}>
              Sign in to reserve
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-2"><Label htmlFor="rsvp-name">Full name</Label>
              <Input id="rsvp-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2"><Label htmlFor="rsvp-email">Email</Label>
              <Input id="rsvp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2"><Label htmlFor="rsvp-qty">Tickets</Label>
              <Input id="rsvp-qty" type="number" min={1} max={Math.min(10, spotsLeft)} value={qty}
                onChange={(e) => setQty(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} available</p>
            </div>
            <Button type="submit" variant="hero" disabled={busy} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking…</> : "Confirm reservation"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
