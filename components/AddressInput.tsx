"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { shopRes } from "@/types/Shops";
import { toast } from "sonner";


const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

type AddressInputProps = {
  value: string;
  onChange: (newValue: string) => void;
  shopsResponse?: shopRes[]; 
  onChangeID: (newValue: number) => void;
};



export default function AddressInput({ value, onChange, shopsResponse, onChangeID }: AddressInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    if(!shopsResponse) {
        shopsResponse = [];
    }

    const normalizeString = useCallback((str: string) =>
        str
        .normalize?.("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(), []
    );

    const filteredSuggestions = useMemo(() => { 
        if (!value) {
            return shopsResponse.slice(0, 0);
        }

        const needle = normalizeString(value);

        return shopsResponse
            .filter(
                (shop) =>
                    normalizeString(shop.addressShop).includes(needle) ||
                    normalizeString(shop.eventName).includes(needle)
            )
            .slice(0, 8);
    }, [shopsResponse, value, normalizeString]);

    return (
        <>
            <div className="relative w-full">
                <div className="mb-6">
                    <MapPicker
                        shops={shopsResponse}
                        selectedAddress={value}
                        onSelect={(selectedAddress) => {
                            onChange(selectedAddress);
                            setShowSuggestions(false);
                        }}
                        />
                </div>
                <Label htmlFor="address" className="mb-1 text-gray-300">
                    Address
                </Label>

                <Input
                    id="address"
                    type="text"
                    placeholder="Address"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                    // small delay allows selection via mouse before closing
                    setTimeout(() => setShowSuggestions(false), 150);
                    }}
                    className="bg-zinc-700 text-white border-zinc-600 placeholder-gray-400 focus:border-green-500 focus:ring-green-500"
                    aria-autocomplete="list"
                    aria-controls="address-suggestions"
                    aria-expanded={showSuggestions}
                />

                {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                    id="address-suggestions"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-md shadow-lg max-h-64 overflow-auto"
                    >
                    {filteredSuggestions.map((shop) => (
                        <div
                        key={shop.idShop}
                        role="option"
                        aria-selected={shop.addressShop === value}
                        onBlur={() => {
                            setTimeout(() => setShowSuggestions(false), 250);
                        }}
                        className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-white text-sm"
                        onMouseDown={(ev) => {
                            // onMouseDown is used instead of onClick to avoid blur before selection
                            if(shop.hiloQty === 0) {
                                toast.warning("Na " + shop.addressShop + " mozliwe ze nie ma urzadzen hilo");
                            }
                            if(shop.hiloPlusQty === 0) {
                                toast.warning("Na " + shop.addressShop + " mozliwe ze nie ma urzadzen hilo Plus");
                            }
                            if(shop.packsQty === 0) {
                                toast.warning("Na " + shop.addressShop + " mozliwe ze nie ma paczek");
                            }
                            ev.preventDefault();
                            onChange(shop.addressShop);
                            console.log(`Changing idShop to ${shop.idShop} and address to ${shop.addressShop}`)
                            onChangeID(shop.idShop);
                            setShowSuggestions(false);
                        }}
                        >
                        <div className="font-medium">{shop.eventName}, {shop.nameShop}</div>
                        <div className="text-xs text-zinc-300 truncate">{shop.addressShop}</div>
                        </div>
                    ))}
                    </div>
                )}

            </div>
        </>
    )
};