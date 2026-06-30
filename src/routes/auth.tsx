import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, ShieldCheck, User as UserIcon, Sparkles, KeyRound, Loader2, RefreshCw, QrCode, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import logo from "@/assets/logo.svg";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { role?: string } => ({ role: (s.role as string) || undefined }),
  component: AuthPage,
});

const roles = [
  { id: "user" as const, label: "User", icon: UserIcon, desc: "Browse events and manage your tickets." },
  { id: "host" as const, label: "Host", icon: Sparkles, desc: "Create and manage your own events." },
  { id: "volunteer" as const, label: "Volunteer", icon: QrCode, desc: "Scan tickets and manage event entry." },
  { id: "admin" as const, label: "Admin", icon: ShieldCheck, desc: "Full platform access — restricted." },
];

function AuthPage() {
  const navigate = useNavigate();
  const { role: urlRole } = Route.useSearch();
  const { user, isAdmin, signIn, signUp, adminSignIn, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"user" | "host" | "admin" | "volunteer">(
    urlRole === "host" || urlRole === "admin" || urlRole === "user" || urlRole === "volunteer" ? (urlRole as any) : "user"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) navigate({ to: "/admin" });
      else if (user.role === "host") navigate({ to: "/host" });
      else if (user.role === "volunteer") navigate({ to: "/volunteer" });
      else navigate({ to: "/user" });
    }
  }, [user, isAdmin, loading, navigate]);

  const startCooldown = useCallback((s: number) => {
    setCooldown(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCooldown((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; }), 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleSendOtp = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; message: string; devMode?: boolean; devOtp?: string }>("/auth/send-otp", { email, role });
      toast.success(res.message);
      if (res.devMode && res.devOtp) toast.info(`[Dev] OTP: ${res.devOtp}`, { duration: 30000 });
      setStep("otp");
      setOtp("");
      startCooldown(60);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      await api.post("/auth/verify-otp", { email, otp });
      toast.success("Email verified!");
      const { error } = await signUp(email, password, name || email.split("@")[0], role === "admin" ? "user" : role);
      if (error) { toast.error(error); setVerifying(false); return; }
      toast.success("Account created successfully!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setVerifying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "admin") {
      setBusy(true);
      const { error } = await adminSignIn(email, password);
      setBusy(false);
      if (error) toast.error(error);
      else { toast.success("Welcome, Admin!"); navigate({ to: "/admin" }); }
      return;
    }
    if (mode === "signin" && role === "volunteer") {
      setBusy(true);
      try {
        const res = await api.post<{ token: string; event: any }>("/volunteer/login", { eventId, email, password });
        localStorage.setItem("volunteer_token", res.token);
        toast.success("Volunteer logged in!");
        navigate({ to: "/volunteer" });
      } catch (e: any) {
        toast.error(e.message || "Volunteer login failed");
      }
      setBusy(false);
      return;
    }
    if (mode === "signin") {
      setBusy(true);
      const { error } = await signIn(email, password, role);
      setBusy(false);
      if (error) toast.error(error);
      else toast.success("Welcome back!");
      return;
    }
    await handleSendOtp();
  };

  const current = roles.find((r) => r.id === role)!;
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-smooth group">
          <img src={logo} alt="PlanIt" className="h-6 w-auto transition-smooth group-hover:scale-110" />
          <span className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to PlanIt
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center container mx-auto px-6 pb-12">
        <div className="w-full max-w-md border border-border bg-card p-10 shadow-card">
          <div className="flex items-center justify-between mb-8">
            <img src={logo} alt="PlanIt" className="h-12 w-auto" />
            <div className="h-10 w-10 rounded-md bg-primary/15 text-primary flex items-center justify-center">
              {step === "otp" ? <KeyRound className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
          </div>

          {step === "otp" ? (
            <>
              <span className="text-xs uppercase tracking-[0.3em] text-primary block mb-3">Verify email</span>
              <h1 className="font-display text-4xl font-medium leading-tight mb-2">Enter code</h1>
              <p className="text-sm text-muted-foreground mb-6">We sent a 6-digit code to <strong className="text-foreground">{email}</strong></p>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp-input">Verification code</Label>
                  <Input id="otp-input" type="text" inputMode="numeric" maxLength={6} autoFocus placeholder="000000"
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-3xl tracking-[0.6em] font-mono h-14" />
                </div>
                <Button variant="hero" className="w-full" disabled={verifying || otp.length !== 6} onClick={handleVerifyAndRegister}>
                  {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Verify & create account"}
                </Button>
                <div className="flex items-center justify-between">
                  <button onClick={() => { setStep("form"); setOtp(""); }} className="text-xs text-muted-foreground hover:text-foreground">← Change email</button>
                  <button disabled={cooldown > 0 || sending} onClick={handleSendOtp}
                    className="text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center gap-1">
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Code expires in 5 minutes · Max 5 attempts</p>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs uppercase tracking-[0.3em] text-primary block mb-3">
                {role === "admin" ? "Admin login" : mode === "signin" ? "Sign in as" : "Sign up as"}
              </span>
              <h1 className="font-display text-4xl font-medium leading-tight mb-2">{current.label}</h1>
              <p className="text-sm text-muted-foreground mb-6">{current.desc}</p>
              <div className="grid grid-cols-4 gap-2 mb-6 p-1 bg-secondary/50 rounded-md">
                {roles.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`text-xs font-medium py-2 px-2 rounded transition-smooth ${role === r.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && role !== "admin" && (
                  <div className="space-y-2"><Label htmlFor="name">Display name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                {mode === "signin" && role === "volunteer" && (
                  <div className="space-y-2"><Label htmlFor="eventId">Event ID</Label>
                    <Input id="eventId" required value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="e.g. 64abc123..." />
                  </div>
                )}
                <div className="space-y-2"><Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{role === "admin" ? "Admin password" : role === "volunteer" && mode === "signin" ? "Event Password" : "Password"}</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy || sending} variant="hero" className="w-full">
                  {busy || sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Please wait…</> :
                    role === "admin" ? "Sign in as Admin" : mode === "signin" ? "Sign in" : "Continue →"}
                </Button>
              </form>
              {role !== "admin" && (
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
                </button>
              )}
              {role === "admin" && (
                <p className="text-xs text-muted-foreground mt-4 text-center">Restricted — authorized administrators only.</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
