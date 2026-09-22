"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase isn't configured for this deployment yet. Add the Supabase env vars to enable admin login.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setStatus("error");
      setError(authError.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8">
        <Logo />
        <div className="mt-6 flex items-center gap-2 text-ink-900">
          <Lock size={16} className="text-gold-500" />
          <h1 className="font-display text-lg ">Admin Sign In</h1>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-ink-900/12 px-4 py-3 text-sm outline-none focus:border-gold-500"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-ink-900/12 px-4 py-3 text-sm outline-none focus:border-gold-500"
          />
          {error && <p className="text-xs text-gold-500">{error}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-60"
          >
            {status === "loading" && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
