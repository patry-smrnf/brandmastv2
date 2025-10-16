// app/sv/SvDashboard.tsx   (or wherever you keep it)
// keep "use client" if this is a client component
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContextMenu from "@/components/contextMenu";
import BrandmasterActionCard from "@/components/BmActionCard";
import DarkLoadingPage from "@/components/LoadingScreen";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { myBmActions } from "@/types/myBms";

// re-declare the UIAction so this file is self contained for typing
export interface UIAction {
  idAction: number;
  shopID?: number;
  shopName: string;
  shopAddress: string;
  eventName: string;
  actionSince: Date;
  actionUntil: Date;
  actionStatus: string;
  brandmasterLogin?: string;
  brandmasterImie?: string;
  brandmasterNazwisko?: string;
  createdAt?: Date;
}

// Helper: parse into a valid Date or return undefined
function parseDateSafe(input?: string | Date | null): Date | undefined {
  if (input === undefined || input === null) return undefined;
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function formatDateLong(date?: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayKey(date?: Date) {
  if (!date || Number.isNaN(date.getTime())) return "invalid";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dayLabel(date?: Date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SvDashboard() {
  const [uiActions, setUiActions] = useState<UIAction[]>([]);
  const [filterBrandmaster, setFilterBrandmaster] = useState<string>("All");
  const [filterDay, setFilterDay] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterEvent, setFilterEvent] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // close menu on outside click / ESC
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Fetch actions with AbortController and defensive checks
  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await apiFetch<myBmActions[]>("/api/sv/myBmsActions", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!Array.isArray(res)) {
          throw new Error("Invalid server response: expected array");
        }

        const flattened: UIAction[] = res.flatMap((bm) =>
          (Array.isArray(bm.actions) ? bm.actions : []).map((a) => ({
            idAction: Number.isFinite(a?.actionId) ? a.actionId : -1,
            shopID: Number.isFinite(a?.shopId) ? a.shopId : undefined,
            shopName: a?.shopName ?? "—",
            shopAddress: a?.shopAddress ?? "—",
            eventName: a?.eventName ?? "—",
            actionSince: parseDateSafe(a?.since) ?? new Date(0),
            actionUntil: parseDateSafe(a?.until) ?? new Date(0),
            actionStatus: a?.status ?? "UNKNOWN",
            brandmasterLogin: bm?.brandmasterLogin ?? undefined,
            brandmasterImie: bm?.brandmasterName ?? undefined,
            brandmasterNazwisko: bm?.brandmasterLastName ?? undefined,
            createdAt: parseDateSafe(a?.createdAt),
          }))
        );

        // sort earliest first
        flattened.sort((a, b) => a.actionSince.getTime() - b.actionSince.getTime());

        if (!abortController.signal.aborted) setUiActions(flattened);
      } catch (error: unknown) {
        if ((error as any)?.name === "AbortError") {
          // ignore abort
          return;
        }
        console.error("Failed to load actions", error);
        toast.error("Nie udało się pobrać danych akcji.");
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    })();

    return () => abortController.abort();
  }, []);

  // Derived options
  const brandmasters = useMemo(() => {
    const map = new Map<string, { name?: string; last?: string }>();
    uiActions.forEach((a) => {
      if (a.brandmasterLogin && !map.has(a.brandmasterLogin)) {
        map.set(a.brandmasterLogin, {
          name: a.brandmasterImie,
          last: a.brandmasterNazwisko,
        });
      }
    });

    const result = [
      { login: "All", label: "Wszyscy" },
      ...Array.from(map.entries()).map(([login, v]) => ({
        login,
        label: `${login}${v.name || v.last ? " - " : ""}${(v.name ?? "")} ${(v.last ?? "")}`.trim(),
      })),
    ];
    return result;
  }, [uiActions]);

  const days = useMemo(() => {
    const uniqueDays = new Set(uiActions.map((a) => dayKey(a.actionSince)));
    // remove invalid keys
    const validDays = Array.from(uniqueDays).filter((d) => d && d !== "invalid");
    // sort descending (most recent first)
    validDays.sort((a, b) => (a > b ? -1 : 1));
    return ["All", ...validDays];
  }, [uiActions]);

  const events = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.eventName ?? "Unknown"));
    return ["All", ...Array.from(unique).sort()];
  }, [uiActions]);

  const statuses = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.actionStatus ?? "UNKNOWN"));
    return ["All", ...Array.from(unique).sort()];
  }, [uiActions]);

  // Filtered actions
  const filtered = useMemo(() => {
    return uiActions.filter((a) => {
      const bmMatch = filterBrandmaster === "All" || a.brandmasterLogin === filterBrandmaster;
      const dayMatch = filterDay === "All" || dayKey(a.actionSince) === filterDay;
      const statusMatch = filterStatus === "All" || a.actionStatus === filterStatus;
      const eventMatch = filterEvent === "All" || a.eventName === filterEvent;
      return bmMatch && dayMatch && statusMatch && eventMatch;
    });
  }, [uiActions, filterBrandmaster, filterDay, filterStatus, filterEvent]);

  // Group by date (sorted ascending by date — earliest first)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, UIAction[]> = {};
    filtered.forEach((a) => {
      const key = dayKey(a.actionSince);
      (groups[key] ??= []).push(a);
    });

    return Object.entries(groups)
      .filter(([k]) => k !== "invalid") // drop invalid
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [filtered]);

  if (loading) return <DarkLoadingPage />;

  return (
    <>
      {/* Floating Context Menu */}
      <div
        ref={menuRef}
        className="fixed top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          aria-controls="sv-context-menu"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500"
          type="button"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
        {menuOpen && (
          <div id="sv-context-menu" role="menu" aria-label="Panel akcji">
            <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" role="region" aria-label="Filtry">
            <label className="sr-only" htmlFor="filter-brandmaster">Filtruj po brandmasterze</label>
            <Select
              value={filterBrandmaster}
              onValueChange={(v) => setFilterBrandmaster(v)}
             
            >
              <SelectTrigger  id="filter-brandmaster" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po brandmasterze" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {brandmasters.map((b) => (
                  <SelectItem key={b.login} value={b.login}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-day">Filtruj po dniu</label>
            <Select value={filterDay} onValueChange={setFilterDay} >
              <SelectTrigger id="filter-day" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po dniu" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100 max-h-60 overflow-auto">
                {days.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === "All" ? "Wszystkie dni" : dayLabel(new Date(d))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-status">Filtruj po statusie</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger  id="filter-status" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po statusie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "All" ? "Wszystkie" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="sr-only" htmlFor="filter-event">Filtruj po evencie</label>
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger  id="filter-event" className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
                <SelectValue placeholder="Filtruj po evencie" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-gray-100">
                {events.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e === "All" ? "Wszystkie eventy" : e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Cards */}
          <div className="space-y-8">
            {groupedByDate.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-10 border border-zinc-800 rounded-xl bg-zinc-900">
                Brak eventów pasujących do filtrów.
              </div>
            ) : (
              groupedByDate.map(([dateKey, actions]) => (
                <div
                  key={dateKey}
                  className="border border-zinc-800 rounded-xl bg-zinc-900/50 p-5 space-y-4"
                >
                  <h3 className="text-gray-300 text-sm font-medium border-b border-zinc-800 pb-2">
                    {formatDateLong(new Date(dateKey))}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {actions.map((a) => (
                      <BrandmasterActionCard
                        key={`${a.idAction}-${a.brandmasterLogin ?? "bm"}`}
                        action={a}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
