import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { QrCode, LogOut, CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/volunteer")({
  component: VolunteerPage,
});

function VolunteerPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("volunteer_token"));
  const [eventDetails, setEventDetails] = useState<{ title: string; date: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, scanned: 0 });
  
  // Scan states
  const [bookingId, setBookingId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string; attendee?: string; qty?: number } | null>(null);
  
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!token) {
      navigate({ to: "/auth", search: { role: "volunteer" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      loadEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && !(window as any).Html5QrcodeScanner) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      script.onload = () => initScanner();
      document.body.appendChild(script);
    } else if (token && (window as any).Html5QrcodeScanner) {
      // Small delay to ensure DOM is ready
      setTimeout(initScanner, 100);
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadEventData = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/volunteer/event", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEventDetails(data.event);
      setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Session expired");
      handleLogout();
    }
  };

  const initScanner = () => {
    if (!(window as any).Html5QrcodeScanner) return;
    
    const readerElement = document.getElementById("reader");
    if (!readerElement) return;
    
    // If it's already rendered, don't render again
    if (readerElement.innerHTML.includes("qr-shaded-region")) return;

    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }

    const scanner = new (window as any).Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scannerRef.current = scanner;

    scanner.render(
      (decodedText: string) => {
        // use function to get latest state
        setScanning((isScanning) => {
          if (!isScanning) {
            handleScan(decodedText);
            return true;
          }
          return isScanning;
        });
      },
      (error: any) => {}
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("volunteer_token");
    setToken(null);
    setEventDetails(null);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    navigate({ to: "/auth", search: { role: "volunteer" } });
  };

  const handleScan = async (scannedId: string) => {
    setBookingId(scannedId);
    
    try {
      const res = await fetch("http://localhost:5000/api/volunteer/scan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ bookingId: scannedId }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setLastScanResult({ success: false, message: data.error });
        toast.error(data.error);
      } else {
        setLastScanResult({ success: true, message: data.message, attendee: data.attendee, qty: data.qty });
        toast.success(data.message);
        loadEventData(); // Refresh stats
      }
    } catch (err: any) {
      setLastScanResult({ success: false, message: "Network error occurred." });
    }
    
    setScanning(false);
    setBookingId("");
  };

  const submitManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;
    handleScan(bookingId);
  };

  if (!token) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <QrCode className="h-5 w-5" />
            <span className="font-display font-semibold tracking-tight text-foreground">Scanner Portal</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Exit
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col gap-6">
        {eventDetails && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <h2 className="font-display text-xl font-medium text-foreground">{eventDetails.title}</h2>
              <p className="text-sm text-primary/80">{eventDetails.date}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-display font-semibold">{stats.scanned}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Checked In</p>
              </div>
              <div className="w-px bg-primary/20" />
              <div className="text-center">
                <p className="text-2xl font-display font-semibold text-muted-foreground">{stats.total - stats.scanned}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4 flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" /> Scan QR Code</h3>
          <div id="reader" className="w-full rounded-lg overflow-hidden border border-border bg-black/5 min-h-[300px]"></div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4">Manual Entry</h3>
          <form onSubmit={submitManualScan} className="flex gap-2">
            <Input 
              placeholder="Enter Booking ID (e.g. PLT-ABCD-1234)" 
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 font-mono"
            />
            <Button type="submit" variant="default" disabled={scanning || !bookingId}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </form>
        </div>

        {lastScanResult && (
          <div className={`p-6 rounded-xl border ${lastScanResult.success ? "bg-success/10 border-success/30 text-success-foreground" : "bg-destructive/10 border-destructive/30 text-destructive-foreground"} animate-in slide-in-from-bottom-4 fade-in`}>
            <div className="flex items-start gap-4">
              {lastScanResult.success ? <CheckCircle2 className="h-6 w-6 shrink-0 text-success" /> : <XCircle className="h-6 w-6 shrink-0 text-destructive" />}
              <div>
                <h4 className="font-semibold text-lg">{lastScanResult.success ? "Access Granted" : "Access Denied"}</h4>
                <p className="mt-1 opacity-90">{lastScanResult.message}</p>
                {lastScanResult.success && lastScanResult.attendee && (
                  <div className="mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-lg text-sm flex justify-between items-center">
                    <div>
                      <span className="block text-xs opacity-70 uppercase tracking-wider">Attendee</span>
                      <span className="font-medium">{lastScanResult.attendee}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs opacity-70 uppercase tracking-wider">Admit</span>
                      <span className="font-medium text-lg">{lastScanResult.qty}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
