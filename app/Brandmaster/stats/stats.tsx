"use client";
import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils"

import { motion } from "framer-motion"

import { toast } from "sonner";
import { apiFetch } from "@/utils/apiFetch";
import { tpSampleStats, Item } from "@/types/tpStatsSample";
import { messageRes } from "@/types/MessageRes";
import ContextMenu from "@/components/contextMenu";

import { Package, Layers2, CircleOff } from "lucide-react";


const StatCard = ({ title, actual, target,}: {title: string; actual: number; target: number;}) => {

    const efficiency = ((actual / target) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn(
          "flex-1 bg-zinc-900/60 backdrop-blur border-zinc-800 hover:border-zinc-700",
          "transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md"
        )}
      >
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 tracking-wide">
            <Package/>{title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Numbers Row */}
          <div className="flex justify-between items-center text-sm font-medium text-gray-300">
            <span className="text-zinc-400">{actual.toString()}</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-md font-semibold",
                parseInt(efficiency) >= 80
                  ? "bg-emerald-500/10 text-emerald-400"
                  : parseInt(efficiency) >= 50
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-rose-500/10 text-rose-400"
              )}
            >
              {efficiency}%
            </span>
            <span className="text-zinc-400">{target}</span>
          </div>

          {/* Progress Bar */}
          <Progress
            value={Number(efficiency)}
            className={cn(
              "h-2 overflow-hidden rounded-full bg-zinc-800",
              "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400",
              "transition-all duration-500"
            )}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatsPage: React.FC = () => {
      const[sampleStats, setSampleStats] = useState<tpSampleStats | null>(null);
      const[targets, setTargets] = useState<targetType | undefined>();
      const[iloscHilo, setIloscHilo] = useState<number >(0);
      const[iloscHiloPlus, setIloscHiloPlus] = useState(0);
      const[iloscVelo, setIloscVelo] = useState(0);

      const[targetVelo, setTargetVelo] = useState(0);
      const[tagetHilo, setTargetHilo] = useState(0);
      const[targetHiloPlus, setTargetHiloPlus] = useState(0);

      const [editingKey, setEditingKey] = useState<keyof targetType | null>(null);
      const [inputValue, setInputValue] = useState<number>(0);

      
      const menuRef = useRef<HTMLDivElement | null>(null);
      const [menuOpen, setMenuOpen] = useState(false);
      const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

      useEffect(() => {
          async function fetchdata() {
              try {
                  const targetRes = await apiFetch<targetType>('/api/general/getTarget', {
                      method: "GET",
                      headers: {"Content-Type": "application/json"}
                  });

                  if(!targetRes) {
                      return;
                  }

                  setTargets(targetRes);
                  setTargetHilo(targetRes.targetHilo);
                  setTargetVelo(targetRes.targetVelo);
                  setTargetHiloPlus(targetRes.targetHiloPlus);

                  const tpResRaw = await fetch(`https://api.webform.tdy-apps.com/sample/stats`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          sample: {
                              hostessCode: targetRes.bmLogin,
                              currentAction: null
                          }
                      })
                  });
                  
                  const tpRes = await tpResRaw.json() as tpSampleStats;
                  if (!tpResRaw.ok) {
                      toast.error("Request failed");
                      return;
                  }

                  setSampleStats(tpRes);

                  const currentMonth = tpRes.data.sample.currentMonth;

                  const hilo = currentMonth.find(item => item.model.toLowerCase() === "hilo") || { count: 0 };
                  const hiloPlus = currentMonth.find(item => item.model.toLowerCase() === "hilo+") || { count: 0 };
                  const veloItems = currentMonth.filter(item => item.brand.toLowerCase() === "velo");

                  setIloscHilo(hilo.count + (targetRes.bmHiloBPC ?? 0));
                  setIloscHiloPlus(hiloPlus.count + (targetRes.bmHiloPluBPC ?? 0));

                  if (veloItems.length > 0) {
                      const totalVelo = veloItems.reduce((sum, v) => sum + (v.count ?? 0), 0);
                      const totalVeloAdjusted = totalVelo
                          - (hilo.count ?? 0)
                          - (hiloPlus.count ?? 0)
                          - (targetRes.bmHiloBPC ?? 0)
                          - (targetRes.bmHiloPluBPC ?? 0)
                          + (targetRes.bmVeloBPC ?? 0);
                      setIloscVelo(totalVeloAdjusted);
                  }


              }catch( error) {
              toast.error(error + '');
              }
          };

          fetchdata();
      }, []);

      const editableFields: (keyof targetType)[] = [
          "bmHiloBPC",
          "bmHiloPluBPC",
          "bmVeloBPC",
      ];

      const friendlyNames: Record<string, string> = {
          bmHiloBPC: "Hilo",
          bmHiloPluBPC: "Hilo Plus",
          bmVeloBPC: "Velo",
      };

      const handleEdit = (key: keyof targetType) => {
          setEditingKey(key);
          if(targets) 
              setInputValue(targets[key] as number);
      };

      const handleSave = async () => {
          if (!editingKey || !targets) return;

          // ✅ Create updated object first
          const updatedTargets = {
              ...targets,
              [editingKey]: inputValue,
          };

          // ✅ Update local state
          setTargets(updatedTargets);
          setEditingKey(null);

          try {
              // ✅ Send the updated values to your API
              const res = await apiFetch<messageRes>("/api/general/editBCP", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  veloBcp: updatedTargets.bmVeloBPC,
                  hiloBcp: updatedTargets.bmHiloBPC,
                  hiloPlusBcp: updatedTargets.bmHiloPluBPC,
              }),
              });

              toast.success(res.message);
          } catch (error: any) {
              toast.error(error.message || String(error));
          }
      };

      const handleCancel = () => {
          setEditingKey(null);
      };

  return (
    <>
    {/* Context menu button (top-right) */}
    <div ref={menuRef} className="fixed top-4 right-4 z-50" onClick={(e) => e.stopPropagation()}>
      <button onClick={toggleMenu} aria-label="Toggle menu" className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none" type="button">
        <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
      {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type={"BM"} />}
    </div>
    <div className="p-6 space-y-8 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 min-h-screen">
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Hilo" actual={iloscHilo} target={tagetHilo} />
        <StatCard title="Hilo+" actual={iloscHiloPlus} target={targetHiloPlus} />
        <StatCard title="Velo" actual={iloscVelo} target={targetVelo} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800 hover:border-zinc-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-white">
                Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400 italic">
                Coming soon...
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
            <Card className="bg-zinc-900/60 backdrop-blur border-zinc-800 hover:border-zinc-700 transition-all duration-300">
            <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-white">
                    <CircleOff/>
                    Dane Awaryjne
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {editableFields.map((key) => (
                    <div key={key} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-white">
                          <Layers2/>
                          {friendlyNames[key]}:
                        </span>
                        {editingKey === key ? (
                        <div className="flex items-center space-x-2">
                            <Input
                            type="number"
                            value={inputValue}
                            onChange={(e) => setInputValue(Number(e.target.value))}
                            className="w-20 text-white"
                            />
                            <Button size="sm" variant="default" onClick={handleSave}>
                            Save
                            </Button>
                            <Button size="sm" className="text-white" variant="outline" onClick={handleCancel}>
                            Cancel
                            </Button>
                        </div>
                        ) : (
                        <span
                            className="cursor-pointer text-white hover:text-purple-600"
                            onClick={() => handleEdit(key)}
                        >
                              {targets?.[key] ?? 0}
                        </span>
                        )}
                    </div>
                ))}
            </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
    </>
  );
};

export default StatsPage;
