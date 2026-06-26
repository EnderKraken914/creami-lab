"use client";

import Link from "next/link";
import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";

const UNITS = ["tsp", "tbsp", "cups", "mL", "oz", "grams"] as const;

const CUP_GRAMS: Record<string, number> = {
  "whole milk": 240,
  "heavy cream": 238,
  sugar: 200,
  "brown sugar": 213,
  "cocoa powder": 100,
  "mango puree": 250,
  "strawberry puree": 240,
  banana: 225,
};

function convert(value: number, from: string, to: string, ingredient: string) {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (from === to) {
    return value;
  }

  if (from === "tbsp" && to === "cups") return value / 16;
  if (from === "cups" && to === "tbsp") return value * 16;
  if (from === "tsp" && to === "tbsp") return value / 3;
  if (from === "tbsp" && to === "tsp") return value * 3;
  if (from === "cups" && to === "mL") return value * 236.588;
  if (from === "mL" && to === "cups") return value / 236.588;
  if (from === "oz" && to === "grams") return value * 28.3495;
  if (from === "grams" && to === "oz") return value / 28.3495;

  const density = CUP_GRAMS[ingredient.trim().toLowerCase()];
  if (density && from === "cups" && to === "grams") return value * density;
  if (density && from === "grams" && to === "cups") return value / density;

  return null;
}

function formatResult(value: number | null) {
  if (value === null) {
    return "No direct conversion for that pair yet.";
  }

  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export default function ConverterPage() {
  const [amount, setAmount] = useState("1");
  const [fromUnit, setFromUnit] = useState("cups");
  const [toUnit, setToUnit] = useState("tbsp");
  const [ingredient, setIngredient] = useState("whole milk");
  const result = useMemo(
    () => convert(Number(amount), fromUnit, toUnit, ingredient),
    [amount, fromUnit, toUnit, ingredient],
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--line)] bg-[#101411]">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[var(--mint)]">
              <Calculator size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-[var(--muted)]">Creami utility</p>
              <h1 className="break-words text-2xl font-semibold">
                Kitchen Converter
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

      <section className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
        <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm text-[var(--muted)]">Amount</span>
              <input
                className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                value={amount}
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm text-[var(--muted)]">
                Ingredient for cups to grams
              </span>
              <input
                className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setIngredient(event.target.value)}
                value={ingredient}
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm text-[var(--muted)]">From</span>
              <select
                className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setFromUnit(event.target.value)}
                value={fromUnit}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm text-[var(--muted)]">To</span>
              <select
                className="h-11 w-full rounded-md border border-[var(--line)] bg-[#0f1311] px-3 text-sm"
                onChange={(event) => setToUnit(event.target.value)}
                value={toUnit}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-md border border-[#28322d] bg-[#101411] p-4">
            <p className="text-sm text-[var(--muted)]">Result</p>
            <p className="mt-2 break-words text-2xl font-semibold">
              {formatResult(result)}
              {result !== null && ` ${toUnit}`}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
