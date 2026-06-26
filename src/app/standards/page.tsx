"use client";

import Link from "next/link";
import { Check, ListChecks, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_STANDARDS } from "@/lib/recipes";
import { PINT_RULES } from "@/lib/rules";
import { getSupabaseClient } from "@/lib/supabase";

const LOCAL_STORAGE_STANDARDS_KEY = "creami-lab-standards-v1";

export default function StandardsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [rules, setRules] = useState<string[]>([...DEFAULT_STANDARDS]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStandards() {
      if (!supabase) {
        const stored = window.localStorage.getItem(LOCAL_STORAGE_STANDARDS_KEY);
        if (stored) {
          setRules(JSON.parse(stored) as string[]);
        }
        return;
      }

      const { data, error: loadError } = await supabase
        .from("lab_standards")
        .select("rules")
        .eq("id", "default")
        .maybeSingle();

      if (loadError) {
        setError(loadError.message);
        return;
      }

      if (Array.isArray(data?.rules)) {
        setRules(data.rules as string[]);
      }
    }

    loadStandards();
  }, [supabase]);

  async function saveRules(nextRules: string[]) {
    setBusy(true);
    setError("");
    setNotice("");

    if (!supabase) {
      window.localStorage.setItem(
        LOCAL_STORAGE_STANDARDS_KEY,
        JSON.stringify(nextRules),
      );
      setRules(nextRules);
      setNotice("Standards saved in this browser.");
      setBusy(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("lab_standards")
      .upsert({ id: "default", rules: nextRules }, { onConflict: "id" });

    if (saveError) {
      setError(saveError.message);
      setBusy(false);
      return;
    }

    setRules(nextRules);
    setNotice("Standards saved.");
    setBusy(false);
  }

  async function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rule = draft.trim();

    if (!rule) {
      return;
    }

    await saveRules([...rules, rule]);
    setDraft("");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--mint)]">
              <ListChecks size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">Reusable house rules</p>
              <h1 className="break-words text-2xl font-semibold">
                Creami Lab Standards
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
              href="/"
            >
              Home
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--mint)]"
              href="/recipes"
            >
              Recipes
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {(notice || error) && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                error
                  ? "border-[var(--berry)] bg-[#251619] text-[#ffd6db]"
                  : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
              }`}
            >
              {error || notice}
            </div>
          )}

          <form
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4"
            onSubmit={addRule}
          >
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--muted)]">
                Add standard
              </span>
              <textarea
                className="min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-[#0f1311] p-3 text-sm leading-6"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Fruit bases should taste slightly stronger before freezing."
                value={draft}
              />
            </label>
            <button
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110 disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              <Plus size={16} aria-hidden="true" />
              Add
            </button>
          </form>

          <div className="space-y-3">
            {rules.map((rule, index) => (
              <article
                className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4"
                key={`${rule}-${index}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#4b5136] text-xs text-[var(--amber)]">
                    {index + 1}
                  </span>
                  <textarea
                    className="min-h-16 min-w-0 flex-1 resize-y rounded-md border border-[#28322d] bg-[#101411] p-3 text-sm leading-6"
                    onBlur={(event) => {
                      const nextRules = [...rules];
                      nextRules[index] = event.target.value.trim();
                      saveRules(nextRules.filter(Boolean));
                    }}
                    defaultValue={rule}
                  />
                  <button
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--berry)] hover:text-[#ffd5dc]"
                    onClick={() =>
                      saveRules(rules.filter((_, ruleIndex) => ruleIndex !== index))
                    }
                    title="Remove rule"
                    type="button"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
            <h2 className="text-sm font-semibold text-[var(--mint)]">
              Constant pint rules
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              {PINT_RULES.map((rule) => (
                <li className="flex gap-2" key={rule}>
                  <Check size={15} className="mt-1 shrink-0 text-[var(--mint)]" />
                  <span className="break-words">{rule}</span>
                </li>
              ))}
            </ul>
          </section>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm transition hover:border-[var(--berry)]"
            onClick={() => saveRules([...DEFAULT_STANDARDS])}
            type="button"
          >
            <X size={15} aria-hidden="true" />
            Reset to defaults
          </button>
        </aside>
      </section>
    </main>
  );
}
