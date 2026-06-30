import { Calendar, MapPin, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiEvent } from "@/lib/api";

// Re-export for backwards compat
export type EventItem = ApiEvent;

export const EventCard = ({ 
  event, 
  onRsvp, 
  isSaved, 
  onSaveToggle 
}: { 
  event: ApiEvent; 
  onRsvp: (e: ApiEvent) => void;
  isSaved?: boolean;
  onSaveToggle?: (e: ApiEvent) => void;
}) => {
  const spotsLeft = Math.max(0, event.spots - event.spotsBooked);
  return (
    <article className="group relative flex flex-col border border-border bg-card p-6 shadow-card transition-smooth hover:border-primary/50 hover:-translate-y-1">
      {onSaveToggle && (
        <button 
          onClick={(e) => { e.stopPropagation(); onSaveToggle(event); }}
          className={`absolute z-10 p-2 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-primary/20 transition-smooth ${event.image ? "top-4 right-4" : "top-4 right-4"}`}
        >
          <Heart className={`h-4 w-4 transition-colors ${isSaved ? "fill-primary text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
        </button>
      )}
      {event.image && (
        <div className="mb-4 -mx-6 -mt-6 h-40 overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">{event.category}</span>
        <span className={`font-display text-lg text-accent ${(!event.image && onSaveToggle) ? "pr-10" : ""}`}>{event.price}</span>
      </div>
      <h3 className="font-display text-3xl font-medium leading-tight mb-4">{event.title}</h3>
      <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-3">{event.description}</p>
      <div className="space-y-2 text-sm text-muted-foreground mb-6 border-t border-border pt-4">
        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary/80" /><span>{event.date} · {event.time}</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary/80" /><span>{event.location}, {event.city}</span></div>
        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary/80" /><span>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span></div>
      </div>
      <Button
        variant="outline"
        className="w-full border-foreground/20 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        onClick={() => onRsvp(event)}
        disabled={spotsLeft <= 0}
      >
        {spotsLeft <= 0 ? "Sold out" : "Reserve a spot"}
      </Button>
    </article>
  );
};
