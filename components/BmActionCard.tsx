"use client";
import React, { act, memo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradientForShop } from "@/utils/colors";
import { FromDateExtractDateString, FromDateExtractHourString } from "@/utils/datestuff";
import { Pencil, CirclePlus, User, Trash, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { cn } from "@/lib/utils";

// UIAction matches the exported UIAction from dashboard
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

interface Props {
  action: UIAction;
}

const BrandmasterActionCard: React.FC<Props> = ({ action }) => {

    function formatDateTime(someDate: Date): string {
        const options: Intl.DateTimeFormatOptions = {
            timeZone: "Europe/Warsaw",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        };

        return new Intl.DateTimeFormat("pl-PL", options).format(someDate);
    }

    function formatTime(someDate: Date): string {
        const timeOptions: Intl.DateTimeFormatOptions = {
            timeZone: "Europe/Warsaw",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        };

        return new Intl.DateTimeFormat("pl-PL",timeOptions).format(someDate);
    }

    async function submitUpdateStatus(actionIdFromCard: number, status: string) {
        try {
            const res = await apiFetch<{ message?: string }>("/api/sv/editActionStatus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    actionId: actionIdFromCard,
                    actionStatus: status }),
            });
            toast.success(res.message ?? `Status zmieniony na ${status}`);
        } catch (error) {
            toast.error("" + error);
        }
    }

  const statusPillClass =
    action.actionStatus === "ACCEPTED"
      ? "bg-emerald-900/40 text-emerald-300"
      : action.actionStatus === "DECLINED"
      ? "bg-red-900/30 text-red-300"
      : "bg-yellow-900/40 text-yellow-300";

  return (
<Card
  className={cn(
    "group relative rounded-xl border border-zinc-800/60 bg-gradient-to-br",
    "from-neutral-900/70 to-neutral-800/50 backdrop-blur-md shadow-sm",
    "hover:shadow-lg hover:scale-[1.01] transition-all duration-200",
    gradientForShop(action.eventName) || ""
  )}
>
  <CardContent className="px-3.5 py-1 flex flex-col gap-3">
    {/* Header */}
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-[140px]">
        <h2 className="text-[15px] font-semibold text-white leading-tight truncate">
          {action.shopName}
        </h2>
        <p className="text-[12px] text-zinc-400 truncate">
          {action.shopAddress}
        </p>
        <p className="text-[12px] text-zinc-300 mt-0.5">
          <span className="text-zinc-400 font-medium">Event:</span>{" "}
          {action.eventName}
        </p>
      </div>

      <span
        className={cn(
          "px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0",
          statusPillClass
        )}
      >
        {action.actionStatus}
      </span>
    </div>

    {/* Time Info */}
    <div className="flex flex-wrap items-center justify-between text-[12px] text-zinc-300 gap-2">
      <p className="truncate">
        <span className="font-semibold text-zinc-100">
          {formatTime(action.actionSince)}
        </span>{" "}
        –{" "}
        <span className="font-semibold text-zinc-100">
          {formatTime(action.actionUntil)}
        </span>
      </p>
      <p className="text-right text-[11px] text-zinc-500">
        Utworzono:{" "}
        <span className="text-zinc-300">
          {action.createdAt ? formatDateTime(action.createdAt) : "-"}
        </span>
      </p>
    </div>

    {/* Buttons */}
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
      <Button
        variant="secondary"
        size="sm"
        className="h-6 px-2 text-[12px] border bg-zinc-900 hover:bg-neutral-700/80 border-zinc-950 text-zinc-200"
      >
        <User className="h-3.5 w-3.5 mr-1" />
        {action.brandmasterImie} {action.brandmasterNazwisko}
      </Button>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          onClick={() => submitUpdateStatus(action.idAction, "ACCEPTED")}
          size="sm"
          className="h-7 px-2.5 text-[12px] bg-zinc-900 hover:bg-green-600/80 text-green-50 border border-green-800"
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Akceptuj
        </Button>
        <Button
          onClick={() => submitUpdateStatus(action.idAction, "EDITABLE")}
          size="sm"
          className="h-7 px-2.5 text-[12px] bg-zinc-900 hover:bg-orange-600/80 hover:border-orange-600/80 text-amber-50 border border-orange-800"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editable
        </Button>
        <Button
          onClick={() => submitUpdateStatus(action.idAction, "DECLINED")}
          size="sm"
          className="h-7 px-2.5 text-[12px] bg-zinc-900 border-red-800 hover:bg-red-700/70 hover:border-red-700/70 text-red-200 border"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Odrzuć
        </Button>
      </div>
    </div>
  </CardContent>
</Card>


  );
};

export default memo(BrandmasterActionCard);
