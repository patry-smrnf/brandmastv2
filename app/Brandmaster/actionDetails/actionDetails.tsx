"use client" 

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"

import { ArrowLeft } from "lucide-react";

import { ActionDetail } from "@/types/ActionRelated";
import { shopRes } from "@/types/Shops";
import { newActionPayload, updateActionPayload } from "@/types/UpdateAction";
import {messageRes } from "@/types/MessageRes";

import { toast } from "sonner";

import AddressInput from "@/components/AddressInput";
import TimeInputs from "@/components/TimeInputs"
import DatePickerInput from '@/components/DatePickerInput'
import { apiFetch } from "@/utils/apiFetch";
import ContextMenu from "@/components/contextMenu";

import { DateTime } from 'luxon';

//Shit to craft new date
function formatDate (date: Date): string { 
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeTime(input: string): string {
    // Trim whitespace
    const str = input.trim();

    // If it's just an hour (e.g., "9" or "09")
    if (/^\d{1,2}$/.test(str)) {
        return str.padStart(2, '0') + ':00';
    }

    // If it's hour and minute (e.g., "14:00" or "9:5")
    if (/^\d{1,2}:\d{1,2}$/.test(str)) {
        const [h, m] = str.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }

    // If it's hour:minute:second (e.g., "14:00:00"), ignore seconds
    if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(str)) {
        const [h, m] = str.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }

    toast.warning(`Invalid time format: "${input}"`);
    throw new Error(`Invalid time format: "${input}"`);
}

function combineDateTime(date: string, time: string): string | null {
  // date: "2025-10-09" (from <input type="date">)
  // time: "14:30:15" (from <input type="time">)
  if (!date || !time) return null; // handle empty input

  // Split time into parts
  const [hours, minutes, seconds] = time.split(':').map(Number);

  // Create a DateTime in Warsaw timezone
  const dt = DateTime.fromObject(
    {
      year: Number(date.split('-')[0]),
      month: Number(date.split('-')[1]),
      day: Number(date.split('-')[2]),
      hour: hours,
      minute: minutes,
      second: seconds,
    },
    { zone: 'Europe/Warsaw' }
  );

  // Convert to ISO offset string (backend-friendly)
  return dt.toISO(); // example: 2025-10-09T14:30:15+02:00
}

enum loadType { NEW_ACTION, EDIT_ACTION, UNKNOWN } 

export default function actionDetails() {
    const router = useRouter();
    const searchParams = useSearchParams();

    //Logic of site
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [typeOfLoad, setTypeOfLoad] = useState<loadType>(loadType.NEW_ACTION);
    const [theActionID, setActionID] = useState<number>();

    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

    //ServerData
    const [actionDetails, setActionDetails] = useState<ActionDetail>();
    const [shopsData, setShopsData] = useState<shopRes[]>();

    //Form DATA
    const [shopAddress, setShopAddress] = useState("");
    const [shopID, setShopID] = useState(0);
    const [actionDate, setActionDate] = useState<Date>(new Date());
    const [systemStart, setSystemStart] = useState("");
    const [systemEnd, setSystemEnd] = useState("");
    const [realStart, setRealStart] = useState("");
    const [realEnd, setRealEnd] = useState("");
   
    //Fetching data from the Server here
    useEffect(() => {
        const newActionParam = searchParams.get("newAction");
        const actionIdParam = searchParams.get("actionId");

        const isNewAction = !!newActionParam;
        const actionID = actionIdParam ? parseInt(actionIdParam, 10) : NaN;

        // Invalid combinations
        if ((isNewAction && !isNaN(actionID)) || (!isNewAction && isNaN(actionID))) {
            const uri = "/?error=Blad przy wchodzeniu w panel akcji, nie jest okreslone czy to nowa czy edycja istniejacej";
            router.push(encodeURI(uri));
            return;
        }

        const fetchAkcjaDetails = async() => {
            try {
                const res = await apiFetch<ActionDetail>('/api/bm/detailsAction', {
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({
                        idAction: actionID
                    })
                });

                setActionDetails(res);
                setShopAddress(res.shopAddress);
                setShopID(res.shopID);

                const sinceDateTemp = new Date(res.since);
                const untilDateTemp = new Date(res.until);

                const hoursSince = String(sinceDateTemp.getUTCHours() + 2).padStart(2, '0'); // add offset if needed
                const minutesSince = String(sinceDateTemp.getUTCMinutes()).padStart(2, '0');
                const secondsSince = String(sinceDateTemp.getUTCSeconds()).padStart(2, '0');

                
                const hoursUntil = String(untilDateTemp.getUTCHours() + 2).padStart(2, '0'); // add offset if needed
                const minutesUntil = String(untilDateTemp.getUTCMinutes()).padStart(2, '0');
                const secondsUntil = String(untilDateTemp.getUTCSeconds()).padStart(2, '0');

                const year = sinceDateTemp.getFullYear();
                const month = String(sinceDateTemp.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
                const day = String(sinceDateTemp.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;

                setSystemStart(`${hoursSince}:${minutesSince}:${secondsSince}`);
                setSystemEnd(`${hoursUntil}:${minutesUntil}:${secondsUntil}`)

                setActionDate(new Date(formattedDate));


            }catch(erorr){
                toast.error('' + erorr);
            }
            

        };

        const fetchShops = async() => {
            try {
                const res = await apiFetch<shopRes[]>('/api/general/getAllShops', {
                    method: "GET",
                    headers: { "Content-Type": "application/json"}
                });

                setShopsData(res);
            } catch(error) {
                toast.error(error + '');
            }
        }

        // Fetch data based on case
        if (!isNewAction) {
            setTypeOfLoad(loadType.EDIT_ACTION);
            setActionID(actionID);
            fetchAkcjaDetails();
        }
        fetchShops();  

    }, [searchParams]);


    const submitForm = useCallback(async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault();
        let shopID_local = shopID;

        //Check if shopid is found, case if user type address of shop manually
        if(shopID === 0) {
            const normalizedAddress = shopAddress.trim().toLowerCase();

            const found = shopsData?.find(
                shop => shop.addressShop.trim().toLowerCase() === normalizedAddress
            );

            if(found) {
                shopID_local = found.idShop;
            }
            else {
                toast.error("[Frontend]: Nie istnieje sklep z takim adresem")
                return ;
            }
        }

        //Basic time stuff
        const dateString = formatDate(actionDate);

        //Check if the hours typed correctly
        if(systemEnd < systemStart) {
            toast.error("[Frontend]: Nie mozna konczyc potem zaczac lol")
            return ;
        }

        if(systemEnd==="" || systemStart==="" || shopAddress ==="") {
            toast.error("[Frontend]: Missing data")
            return ;
        }
        
        //NewAction TypeShit
        if(typeOfLoad === loadType.NEW_ACTION) {
            const payload: newActionPayload = {
                idShop: shopID_local,
                sinceSystem: combineDateTime(dateString, normalizeTime(systemStart)),
                untilSystem: combineDateTime(dateString, normalizeTime(systemEnd))
            };

            try {
                const res = apiFetch<messageRes>("/api/bm/addAction", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                toast.success((await res).message);
                
            }catch (error) {
                toast.error(error + '');
            }

        }
        if(typeOfLoad === loadType.EDIT_ACTION) {
            if(!actionDetails){
                toast.error("error");
                return;
            }

            const payload: updateActionPayload = {
                idAction: actionDetails?.idAction,
                idShop: shopID_local,
                sinceSystem: combineDateTime(dateString, normalizeTime(systemStart)),
                untilSystem: combineDateTime(dateString, normalizeTime(systemEnd))
            }

            try {
                const res = apiFetch<messageRes>("/api/bm/editAction", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                toast.success((await res).message);
            } catch(error) {
                toast.error(error + '');
            }
        }

    }, [shopID, actionDate, systemStart, systemEnd, realStart, realEnd, shopAddress, shopsData]) 

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
            <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-100 px-6 py-10 flex flex-col items-center" aria-busy={loading}>
                <div className="w-full max-w-xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-lg rounded-xl p-6 sm:p-8 shadow-2xl">
                    <div className="mb-6">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-gray-400 hover:text-white hover:bg-zinc-900 flex items-center gap-2 px-0" aria-label="Back to dashboard">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm">Back to Dashboard</span>
                        </Button>
                    </div>
                    {loading && <div className="mb-4 text-center text-sm text-gray-300">Loading...</div>}
                    <form onSubmit={submitForm} className="space-y-5" noValidate>
                        <div>
                            <Label htmlFor="date" className="text-sm text-gray-300 mb-1 block">
                                Event Date
                            </Label>
                            <DatePickerInput value={actionDate} onChange={setActionDate} />
                        </div>

                        <AddressInput value={shopAddress} onChange={setShopAddress} onChangeID={setShopID} shopsResponse={shopsData}/>
                        <TimeInputs time1={systemStart} time1Name="Start" onTime1Change={setSystemStart} time2={systemEnd}  time2Name="Stop" onTime2Change={setSystemEnd}/>
                        <Button
                            type="submit"
                            variant="default"
                            className="w-full  text-base bg-green-900 hover:bg-green-700"
                            disabled={saving}
                            aria-disabled={saving}
                            >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </div>
            </div>
        </>
    )
}