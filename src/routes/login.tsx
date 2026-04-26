import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && session) {
      const search = new URLSearchParams(location.search);
      const next = search.get("redirect") || "/";
      navigate({ to: next, replace: true });
    }
  }, [loading, session, navigate, location.search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    const search = new URLSearchParams(location.search);
    const next = search.get("redirect") || "/";
    navigate({ to: next, replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f7f7f5" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "#f9f9f9", color: "#f4522d" }}
          >
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-[#111111]">Upper Hand Portal</h1>
          <p className="mt-1 text-sm text-[#999]">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#999]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md px-3 py-2 text-sm text-[#111111] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#999]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md px-3 py-2 text-sm text-[#111111] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
            />
          </div>

          {error && (
            <div
              className="rounded-md px-3 py-2 text-sm text-red-300"
              style={{ background: "#fef2f2", border: "1px solid #fef2f2" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-[#111111] transition active:scale-[0.99] disabled:opacity-50"
            style={{ background: "#f4522d" }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-xs">
          <a href="/reset-password" className="text-[#999] hover:text-[#666]">
            Forgot password?
          </a>
        </p>
        <p className="mt-4 text-center text-xs text-[#666]">
          Access is invite-only. Contact your administrator if you need an account.
        </p>
      </div>
    </div>
  );
}
