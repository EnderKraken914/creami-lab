"use client";

import { LogIn, ShieldCheck, ShieldX } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export type AdminSessionState = {
  email: string;
  isAdmin: boolean;
  isSignedIn: boolean;
  status: "checking" | "ready";
};

const emptySessionState: AdminSessionState = {
  email: "",
  isAdmin: false,
  isSignedIn: false,
  status: "checking",
};

const localSessionState: AdminSessionState = {
  ...emptySessionState,
  status: "ready",
};

function hasAdminPower(appMetadata: Record<string, unknown> | null | undefined) {
  if (!appMetadata) {
    return false;
  }

  const roles = appMetadata.roles;

  return (
    appMetadata.role === "admin" ||
    appMetadata.is_admin === true ||
    (Array.isArray(roles) && roles.includes("admin"))
  );
}

export default function AdminLogin({
  onSessionChange,
}: {
  onSessionChange?: (state: AdminSessionState) => void;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [sessionState, setSessionState] =
    useState<AdminSessionState>(() =>
      supabase ? emptySessionState : localSessionState,
    );
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      onSessionChange?.(localSessionState);
      return;
    }

    let isMounted = true;

    function updateSessionState(session: Session | null) {
      const user = session?.user;
      const nextState: AdminSessionState = {
        email: user?.email ?? "",
        isAdmin: hasAdminPower(user?.app_metadata),
        isSignedIn: Boolean(user),
        status: "ready",
      };

      if (isMounted) {
        setSessionState(nextState);
        onSessionChange?.(nextState);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      updateSessionState(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSessionState(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [onSessionChange, supabase]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not connected in this environment.");
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage("Enter the admin email address.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });

    setBusy(false);

    if (error) {
      setMessage(
        `${error.message} Make sure this email exists in Supabase Auth first.`,
      );
      return;
    }

    setMessage("Check your email for the admin login link.");
  }

  async function refreshSession() {
    if (!supabase) {
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.refreshSession();
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Admin status refreshed.");
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setMessage("Signed out.");
  }

  const statusText = !supabase
    ? "Local mode"
    : sessionState.status === "checking"
      ? "Checking"
      : sessionState.isAdmin
        ? "Admin"
        : sessionState.isSignedIn
          ? "Signed in"
          : "Admin Login";

  return (
    <div className="relative min-w-0">
      <button
        className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition ${
          sessionState.isAdmin
            ? "border-[#4b5136] text-[var(--amber)] hover:border-[var(--amber)]"
            : "border-[var(--line)] text-[var(--foreground)] hover:border-[var(--mint)]"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {sessionState.isAdmin ? (
          <ShieldCheck size={15} aria-hidden="true" />
        ) : (
          <LogIn size={15} aria-hidden="true" />
        )}
        {statusText}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3 text-sm shadow-2xl">
          {!supabase ? (
            <p className="text-[var(--muted)]">
              Supabase is not connected here. Local editing stays available for
              development.
            </p>
          ) : sessionState.isSignedIn ? (
            <div className="space-y-3">
              <div className="flex min-w-0 items-start gap-2">
                {sessionState.isAdmin ? (
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-[var(--amber)]"
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldX
                    className="mt-0.5 shrink-0 text-[var(--berry)]"
                    size={16}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {sessionState.email}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {sessionState.isAdmin
                      ? "Admin recipe controls are unlocked."
                      : "Signed in, but admin power has not been granted yet."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-[var(--line)] px-3 transition hover:border-[var(--mint)] disabled:opacity-60"
                  disabled={busy}
                  onClick={refreshSession}
                  type="button"
                >
                  Refresh
                </button>
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-[var(--line)] px-3 transition hover:border-[var(--berry)] disabled:opacity-60"
                  disabled={busy}
                  onClick={signOut}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={sendMagicLink}>
              <label className="space-y-2">
                <span className="block text-xs font-medium text-[var(--muted)]">
                  Admin email
                </span>
                <input
                  className="h-10 w-full min-w-0 rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm text-[var(--foreground)]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </label>
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--mint)] px-3 font-semibold text-[#10201a] transition hover:brightness-110 disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                <LogIn size={15} aria-hidden="true" />
                {busy ? "Sending..." : "Send login link"}
              </button>
            </form>
          )}
          {message && (
            <p className="mt-3 rounded-md border border-[#28322d] bg-[#101411] p-2 text-xs text-[var(--muted)]">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
