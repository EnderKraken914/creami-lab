import Link from "next/link";
import { BookOpen, ChefHat, ListChecks, Shuffle, Star } from "lucide-react";
import { PINT_RULES } from "@/lib/rules";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--mint)]">
              <ChefHat size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold">Creami Lab</span>
              <span className="block text-xs text-[var(--muted)]">
                Ninja Creami recipe notebook
              </span>
            </span>
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
            href="/recipes"
          >
            <BookOpen size={16} aria-hidden="true" />
            Recipes
          </Link>
        </div>
      </section>

      <section className="mx-auto grid min-h-[calc(100vh-82px)] max-w-6xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#4b5136] bg-[#171912] px-3 py-2 text-sm text-[var(--amber)]">
            <Shuffle size={16} aria-hidden="true" />
            Daily pick, version tracking, and family reviews
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
              Creami Lab
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
              A dim, calm place to save Ninja Creami experiments, compare recipe
              versions, collect visitor reviews, and keep the family’s favorite
              pints easy to find.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--mint)] px-4 text-sm font-semibold text-[#10201a] transition hover:brightness-110"
              href="/recipes"
            >
              <BookOpen size={17} aria-hidden="true" />
              Open Recipes
            </Link>
            <a
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm text-[var(--foreground)] transition hover:border-[var(--mint)]"
              href="https://github.com/EnderKraken914/creami-lab"
            >
              GitHub Repo
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          <FeatureCard
            icon={<BookOpen size={20} aria-hidden="true" />}
            title="Recipe Workspace"
            text="Ingredients, ordered steps, settings, mix-ins, tags, photos, notes, and last-made dates."
          />
          <FeatureCard
            icon={<Shuffle size={20} aria-hidden="true" />}
            title="Recipe Versions"
            text="Track v1, v2, more fudge editions, gelato variants, and family experiments side by side."
          />
          <FeatureCard
            icon={<Star size={20} aria-hidden="true" />}
            title="Visitor Reviews"
            text="Visitors can leave their name, stars, and notes; recipes show the average and full review list."
          />
        </div>
      </section>

      <section
        className="border-t border-[var(--line)] bg-[#0f1311]"
        id="our-rules"
      >
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-11">
          <div className="mb-5 flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--mint)]">
              <ListChecks size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">
                Constant rules for every pint
              </p>
              <h2 className="text-2xl font-semibold">Our Rules</h2>
            </div>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PINT_RULES.map((rule, index) => (
              <li
                className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4"
                key={rule}
              >
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-[#4b5136] text-xs font-semibold text-[var(--amber)]">
                  {index + 1}
                </span>
                <p className="break-words text-sm leading-6 text-[#ddd9cf]">
                  {rule}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  text,
  title,
}: {
  icon: React.ReactNode;
  text: string;
  title: string;
}) {
  return (
    <article className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] text-[var(--mint)]">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
    </article>
  );
}
