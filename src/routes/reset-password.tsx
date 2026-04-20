import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If we arrive via a recovery link, Supabase will set a session and the URL
  // hash contains type=recovery. Switch into "set new password" mode.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery")) {
      setMode("update");
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (err) setError(err.message);
    else setInfo("Check your email for a password reset link.");
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setInfo("Password updated. Redirecting…");
    setTimeout(() => navigate({ to: "/", replace: true }), 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#09090b" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ background: "#0f0f12", border: "1px solid #1f1f23" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "#1a1a1e", color: "#2D6BE4" }}
          >
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {mode === "request" ? "Reset password" : "Set new password"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "request"
              ? "Enter your email and we'll send a recovery link."
              : "Enter a new password for your account."}
          </p>
        </div>

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: "#1a1a1e", border: "1px solid #1f1f23" }}
              />
            </div>

            {error && (
              <div className="rounded-md px-3 py-2 text-sm text-red-300" style={{ background: "#3f1a1a", border: "1px solid #5a1f1f" }}>
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-md px-3 py-2 text-sm text-emerald-300" style={{ background: "#0f2a1f", border: "1px solid #1f4a36" }}>
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
              style={{ background: "#2D6BE4" }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send recovery link
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                New password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: "#1a1a1e", border: "1px solid #1f1f23" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: "#1a1a1e", border: "1px solid #1f1f23" }}
              />
            </div>

            {error && (
              <div className="rounded-md px-3 py-2 text-sm text-red-300" style={{ background: "#3f1a1a", border: "1px solid #5a1f1f" }}>
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-md px-3 py-2 text-sm text-emerald-300" style={{ background: "#0f2a1f", border: "1px solid #1f4a36" }}>
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
              style={{ background: "#2D6BE4" }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-600">
          <a href="/login" className="hover:text-zinc-400">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
