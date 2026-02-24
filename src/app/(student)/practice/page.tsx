"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function PracticeLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [bodySystemFilter, setBodySystemFilter] = useState("");
  const [practiceMode, setPracticeMode] = useState<"differential" | "full" | "simulation">("differential");

  // Load mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("practice-mode");
    if (saved === "full" || saved === "simulation") setPracticeMode(saved);
  }, []);

  function toggleMode(mode: "differential" | "full" | "simulation") {
    setPracticeMode(mode);
    localStorage.setItem("practice-mode", mode);
  }
  const [page, setPage] = useState(0);

  // Derive unique body systems from data
  const bodySystems = useMemo(() => {
    const systems = new Set<string>();
    for (const c of PRACTICE_CASES) {
      if (c.body_system) systems.add(c.body_system);
    }
    return Array.from(systems).sort();
  }, []);

  // Filter cases
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PRACTICE_CASES.filter((c) => {
      if (bodySystemFilter && c.body_system !== bodySystemFilter) return false;
      if (q) {
        const searchable = [
          c.title,
          c.chief_complaint,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [search, bodySystemFilter]);

  // Paginate
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  function updateSearch(val: string) {
    setSearch(val);
    setPage(0);
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Try a Case</h1>
        <p className="text-sm text-muted-foreground">
          Pick a chief complaint and build your differential
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border p-0.5">
        {([
          { key: "differential", label: "Essential" },
          { key: "full", label: "Full Case" },
          { key: "simulation", label: "Simulation" },
        ] as const).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggleMode(opt.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              practiceMode === opt.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Random Case */}
      <Button
        variant="outline"
        className="w-full h-11"
        onClick={() => {
          const randomCase = PRACTICE_CASES[Math.floor(Math.random() * PRACTICE_CASES.length)];
          router.push(`/practice/${randomCase.id}`);
        }}
      >
        <Shuffle className="h-4 w-4" />
        Try a Random Case
      </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search by diagnosis, complaint, or title..."
          className="pl-9 h-11"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={bodySystemFilter}
          onChange={(e) => {
            setBodySystemFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by body system"
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Body Systems</option>
          {bodySystems.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Case list */}
      <div className="space-y-2">
        {paginated.map((c) => (
          <Link key={c.id} href={`/practice/${c.id}`}>
            <Card className="hover:bg-accent/50 transition-colors py-3">
              <CardContent className="px-4 py-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {c.chief_complaint}
                    </p>
                    {c.patient_age && c.patient_gender && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.patient_age}yo {c.patient_gender}
                      </p>
                    )}
                  </div>
                  {practiceMode !== "differential" && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.body_system && (
                        <Badge variant="secondary" className="text-xs">
                          {c.body_system}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {c.difficulty}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No cases match your search.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
