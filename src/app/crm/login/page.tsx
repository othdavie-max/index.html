"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, inputCls } from "@/components/crm/ui";

const NOTICES: Record<string, string> = {
  "not-configured": "Supabase isn't configured for this deployment.",
  "no-access": "This account has no Lead Engine access. Ask the owner to add you.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(NOTICES[params.get("error") ?? ""] ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return setError(NOTICES["not-configured"]);
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setLoading(false);
      return setError(authError.message);
    }
    router.push("/crm/leads");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8">
      <div className="flex items-center gap-2 text-ink-900">
        <Lock size={16} className="text-gold-500" />
        <h1 className="font-display text-lg">Lead Engine sign in</h1>
      </div>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input required type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <input required type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        {error && <p className="text-xs text-danger-500">{error}</p>}
        <button type="submit" disabled={loading} className={btnCls}>
          {loading && <Loader2 size={16} className="animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}

export default function CrmLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
