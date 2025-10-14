"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { myBmActions } from "@/types/myBms";
import ContextMenu from "@/components/contextMenu";
import BrandmasterActionCard from "@/components/BmActionCard";
import DarkLoadingPage from "@/components/LoadingScreen";

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

// --- Helper functions ---
function formatDateLong(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}



export default function SvDashboard() {
  const [uiActions, setUiActions] = useState<UIAction[]>([]);
  const [filterBrandmaster, setFilterBrandmaster] = useState("All");
  const [filterDay, setFilterDay] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterEvent, setFilterEvent] = useState("All");
  const [loading, setLoading] = useState(true);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  

  // --- Fetch data safely ---
  useEffect(() => {
    let cancelled = false;

    const fetchActions = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<myBmActions[]>("/api/sv/myBmsActions", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!Array.isArray(res)) throw new Error("Invalid response format");


        const flattened: UIAction[] = res.flatMap((bm) =>
          bm.actions.map((a) => ({
            idAction: a.actionId,
            shopID: a.shopId,
            shopName: a.shopName,
            shopAddress: a.shopAddress,
            eventName: a.eventName,
            actionSince: new Date(a.since),
            actionUntil: new Date(a.until),
            actionStatus: a.status,
            brandmasterLogin: bm.brandmasterLogin,
            brandmasterImie: bm.brandmasterName,
            brandmasterNazwisko: bm.brandmasterLastName,
            createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
          }))
        );

        
        flattened.sort((a, b) => a.actionSince.getTime() - b.actionSince.getTime());


        if (!cancelled) setUiActions(flattened);
      } catch (error) {
        console.error(error);
        toast.error("Nie udało się pobrać danych akcji.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    

    fetchActions();

    return () => {
      cancelled = true;
    };
  }, []);

  

  // --- Derived options ---
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

    return [
      { login: "All", label: "Wszyscy" },
      ...Array.from(map.entries()).map(([login, v]) => ({
        login,
        label: `${login} - ${(v.name ?? "")} ${(v.last ?? "")}`.trim(),
      })),
    ];
  }, [uiActions]);

  const days = useMemo(() => {
    const uniqueDays = new Set(uiActions.map((a) => dayKey(a.actionSince)));
    return ["All", ...Array.from(uniqueDays).sort((a, b) => (a > b ? -1 : 1))];
  }, [uiActions]);

  const events = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.eventName || "Unknown"));
    return ["All", ...Array.from(unique)];
  }, [uiActions]);

  const statuses = useMemo(() => {
    const unique = new Set(uiActions.map((a) => a.actionStatus || "UNKNOWN"));
    return ["All", ...Array.from(unique)];
  }, [uiActions]);

  // --- Filtered actions ---
  const filtered = useMemo(() => {
    return uiActions.filter((a) => {
      const bmMatch =
        filterBrandmaster === "All" || a.brandmasterLogin === filterBrandmaster;
      const dayMatch =
        filterDay === "All" || dayKey(a.actionSince) === filterDay;
      const statusMatch =
        filterStatus === "All" || a.actionStatus === filterStatus;
      const eventMatch =
        filterEvent === "All" || a.eventName === filterEvent;
      return bmMatch && dayMatch && statusMatch && eventMatch;
    });
  }, [uiActions, filterBrandmaster, filterDay, filterStatus, filterEvent]);

  // --- Grouped by date ---

    const groupedByDate = useMemo(() => {
        const groups: Record<string, UIAction[]> = {};
        filtered.forEach((a) => {
            const key = dayKey(a.actionSince);
            (groups[key] ??= []).push(a);
        });

        // sort ascending (earliest first)
        return Object.entries(groups).sort(
            ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
        );
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
          aria-label="Toggle menu"
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none"
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
        {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type="SV" />}
      </div>

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-6 py-10 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Brandmaster */}
            <Select value={filterBrandmaster} onValueChange={setFilterBrandmaster}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
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

            {/* Day */}
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
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

            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
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

            {/* Event */}
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-gray-200 focus:ring-zinc-600">
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
