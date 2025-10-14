import React, { memo } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradientForShop } from "@/utils/colors";
import { FromDateExtractDateString, FromDateExtractHourString } from "@/utils/datestuff";

import { Pencil, CirclePlus, User, Trash } from "lucide-react";

import { toast } from "sonner"; 

import { Action } from "@/types/ActionRelated";
import { apiFetch } from "@/utils/apiFetch";
import { messageRes } from "@/types/MessageRes";


interface Props {
  action: Action;
}

const MyActionCard: React.FC<Props> = ({ action }) => {
  async function submitDeleteAction(actionIdFromCard: number) {
    try{
      const res = await apiFetch<messageRes>(`/api/bm/delAction`, {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify({
          idAction: actionIdFromCard
        })
      });
      toast.success(res.message);
      window.location.reload(); 
    }catch(error) {
      toast.error("" + error);
    }
  }

  console.log(action.eventName);
  return (
    <Card
      className={`rounded-2xl border border-zinc-800 shadow-md hover:shadow-lg transition-transform hover:scale-[1.01] bg-gradient-to-br ${gradientForShop(
        action.eventName
      )}`}
    >
      <CardContent className="px-4 py-3 flex flex-col justify-between min-h-[110px] backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white leading-tight">
              {action.shopName}
            </h2>
            <p className="text-xs text-gray-400">{action.shopAddress}</p>
          </div>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
              action.actionStatus === "ACCEPTED"
                ? "bg-emerald-900/40 text-emerald-300"
                : action.actionStatus === "DECLINED"
                ? "bg-red-900/30 text-red-300"
                : "bg-yellow-900/40 text-yellow-300"
            }`}>
            {action.actionStatus}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
          <p>
            <strong className="text-gray-100">{FromDateExtractHourString(action.actionSince)}</strong> –{" "}
            <strong className="text-gray-100">{FromDateExtractHourString(action.actionUntil)}</strong>
          </p>
          {action.actionStatus != "ACCEPTED" && (
            <Button variant="outline" size="sm" className="h-8 px-4 py-0 text-[11px] flex items-center gap-1 border-zinc-700 hover:bg-zinc-800 text-gray-200">
              <Link className="flex items-center gap-1" href={`/Brandmaster/actionDetails?actionId=${action.idAction}`}>
                <Pencil className="h-3 w-3" /> Edytuj
              </Link>
            </Button>
          )}
        </div>  
        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
          {action.brandmasterLogin != null && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 py-0 text-[11px] flex items-center gap-1 bg-neutral-800 border-zinc-700 hover:bg-zinc-800 text-gray-200"
            >
              <User className="h-3 w-3" />{ action.brandmasterImie + 'df ' + action.brandmasterNazwisko}
            </Button>
          )}
          {action.brandmasterLogin != null || action.actionStatus != "ACCEPTED" && (
            <Button onClick={() => submitDeleteAction(action.idAction)} variant="outline" size="sm" className="h-6 px-2 py-0 text-[11px] flex items-center gap-1 bg-red-900/20 border-zinc-700 hover:bg-red-800 hover:text-red-300 text-gray-200">
              <Trash className="h-3 w-3" /> Usun
            </Button>
                    )}

        </div>
        
        {action.brandmasterLogin != null && (
        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 py-0 text-[11px] flex items-center gap-1 bg-green-800 border-zinc-700 hover:bg-green-800 hover:text-green-300 text-gray-200"
            >
              <CirclePlus className="h-3 w-3" />Dodaj
            </Button>
        </div>
        )}

      </CardContent>
    </Card>
  );
};

export default memo(MyActionCard);
