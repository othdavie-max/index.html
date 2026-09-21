import { AlertTriangle } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite px-4">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-white p-8 text-center">
          <AlertTriangle className="mx-auto text-red-500" size={28} />
          <h1 className="mt-4 font-display text-lg font-bold text-navy-900">Supabase isn&apos;t configured</h1>
          <p className="mt-2 text-sm text-muted">
            The admin dashboard needs <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> set before it can authenticate or load data. See <code>.env.example</code>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
