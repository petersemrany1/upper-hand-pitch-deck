import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import htgLogo from "@/assets/hair-transplant-group-logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, loading, userType, ready } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect once auth is ready and user type is resolved.
  useEffect(() => {
    if (loading || !ready || !session) return;
    if (userType === "unknown") return; // wait for type resolution
    const search = new URLSearchParams(location.search);
    const next = search.get("redirect");
    if (userType === "clinic") {
      navigate({ to: "/clinic-portal", replace: true });
    } else if (userType === "caller") {
      navigate({ to: "/clinics", replace: true });
    } else {
      navigate({ to: next && next !== "/login" ? next : "/", replace: true });
    }
  }, [loading, ready, session, userType, navigate, location.search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(usernameOrEmail.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    // Redirect handled by the effect once userType resolves.
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#f7f7f5" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={htgLogo}
            alt="Hair Transplant Group"
            className="mb-3 h-14 w-14 rounded-full object-cover"
          />
          <h1 className="text-xl font-bold text-[#111111]">Hair Transplant Group Portal</h1>
          <p className="mt-1 text-sm text-[#111111]">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#111111]">
              Username or email
            </label>
            <input
              type="text"
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-md px-3 py-2 text-sm text-[#111111] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: "#f9f9f9", border: "1px solid #ebebeb" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#111111]">
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
          <a href="/reset-password" className="text-[#111111] hover:text-[#111111]">
            Forgot password?
          </a>
        </p>
        <p className="mt-4 text-center text-xs text-[#111111]">
          Access is invite-only. Contact your administrator if you need an account.
        </p>
      </div>
    </div>
  );
}
