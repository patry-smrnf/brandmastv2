"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, User, Calendar, Package, Store, PlusCircle } from "lucide-react";
import { gradientForShop } from "@/utils/colors";
import { cn } from "@/lib/utils";

import { apiFetch } from "@/utils/apiFetch";
import { shopRes } from "@/types/Shops";
import { messageRes } from "@/types/MessageRes";
import ContextMenu from "@/components/contextMenu";

import { toast } from "sonner";
import DarkLoadingPage from "@/components/LoadingScreen";

type Product = {
  id: number;
  label: string;
  qty: number;
};

type ShopInventory = {
  shopId: number;
  shopName: string;
  eventName: string;
  shopAddress: string;
  bmFullName: string;
  addTime: string;
  productClass: Product[];
};

function isValidISOString(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime()) && str.includes('T');
}


export default function ProductsPage() {
    const [shops, setShops] = useState<ShopInventory[]>([]);
    const [shopsList, setShopsList] = useState<shopRes[]>();
    const [query, setQuery] = useState("");
    const [view, setView] = useState<"shops" | "add">("shops");

    // edit states
    const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
    const [openInputs, setOpenInputs] = useState<Record<string, boolean>>({});

    const [addressSuggestions, setAddressSuggestions] = useState<shopRes[]>([]);

    const [loading, setLoading] = useState(true); // ✅ Added

    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

    // form states - nawet nie wiem jakie kokodzambo tu polecialo xddd
    const [newShop, setNewShop] = useState({
        idShop: 0,
        address: "",
        hilo: "",
        hiloPlus: "",
        packs: "",
    });

    useEffect(() => {
      setLoading(true);
        const fetchShops = async () => {
            try {
                const res = await apiFetch<shopRes[]>('/api/general/getAllShops', {
                method: "GET",
                headers: { "Content-Type": "application/json" }
                });
                console.log(res[0]);
                setShopsList(res);
            } catch (error) {
                toast.error(String(error));
            } finally {
              setLoading(false);
            }
        };

        const fetchProducts = async () => { 
            try {
                const res = await apiFetch<ShopInventory[]>('/api/bm/getRaports', {
                method: "GET",
                headers: { "Content-Type": "application/json" }
                });
                setShops(res);
            } catch (error) {
                toast.error(String(error));
            }
        }
        fetchProducts();
        fetchShops();
    }, []);

    //Funkcja zbyt cool na nazwe
    const handleAddressChange = (addressValue: string) => {
        setNewShop({ ...newShop, address: addressValue, idShop: 0 });
        if (!addressValue.trim()) {
            setAddressSuggestions([]);
            return;
        }
        if(!shopsList) {
            return;
        }
        const filtered = shopsList.filter((shop) =>
            shop.addressShop.toLowerCase().includes(addressValue.toLowerCase())
        );
        setAddressSuggestions(filtered.slice(0, 5)); // show top 5 suggestions
    };

    const selectAddress = (shopObject: shopRes) => {
        setNewShop({
        ...newShop,
        idShop: shopObject.idShop,
        address: shopObject.addressShop,
        });
        setAddressSuggestions([]); // hide suggestions
    };

    const filtered = useMemo(() => {
        const searchWord = query.trim().toLowerCase();

        if (!searchWord) 
            return shops;

        return shops.filter((shopObject) => shopObject.shopAddress.toLowerCase().includes(searchWord));
    }, [shops, query]);

    const startEdit = (shopId: number, productKey: number) => {
        const key = `${shopId}_${productKey}`;

        setOpenInputs((p) => ({ ...p, [key]: true }));

        const shop = shops.find((s) => s.shopId === shopId);

        if (!shop) 
            return;

        const product = shop.productClass.find((p) => p.id === productKey);

        if (!product) 
            return;

        setEdits((prev) => ({
            ...prev, [String(shopId)]: { ...(prev[String(shopId)] || {}), [String(productKey)]: String(product.qty) },
        }));
    };

    const changeEdit = (shopId: number, productKey: number, value: string) => {
        setEdits((prev) => ({
            ...prev,
            [String(shopId)]: { ...(prev[String(shopId)] || {}), [String(productKey)]: value },
        }));
    };

    const cancelEdits = (shopId: number) => {
        const newOpen = { ...openInputs };

        Object.keys(newOpen).forEach((k) => {
            if (k.startsWith(shopId + "_")) 
                delete newOpen[k];
        });

        setOpenInputs(newOpen);
        setEdits((prev) => {
            const copy = { ...prev };
            delete copy[shopId];
            return copy;
        });
    };

    const saveEdits = async(shopId: number) => {
        const shop = shops.find((s) => s.shopId === shopId);

        if (!shop) 
            return;

        const shopEdits = edits[shopId] ?? {};
        const objectShopActual = shops.find(shop => shop.shopId === newShop.idShop);

        const updated: ShopInventory = {
            ...shop,
            productClass: shop.productClass.map((pr) => {
                const edited = shopEdits[pr.id];
                if (edited == null) return pr;
                const parsed = parseInt(edited, 10);
                return { ...pr, qty: Number.isFinite(parsed) && parsed >= 0 ? parsed : pr.qty };
            }),
        };

        try {
            const res = await apiFetch<messageRes>("/api/bm/addRaport", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    idShop: shop.shopId,
                    hiloQty: updated.productClass.find(item => item.id.toString() === "1")?.qty,
                    hiloPlusQty: updated.productClass.find(item => item.id.toString() === "2")?.qty,
                    packsQty: updated.productClass.find(item => item.id.toString() === "3")?.qty
                })
            });
            toast.success(res.message);
        } catch(error) {
            toast.error(error + '');
        }

        setShops((prev) => prev.map((s) => (s.shopId === shopId ? updated : s)));
        cancelEdits(shopId);
    };

    const shopHasEdits = (shopId: number) => {
        const shop = shops.find((s) => s.shopId === shopId);

        if (!shop) 
            return false;

        const shopEdits = edits[String(shopId)];
        if (!shopEdits) return false;

        return shop.productClass.some((p) => {
        const edited = shopEdits[String(p.id)];
        if (edited == null) return false;
        const parsed = parseInt(edited, 10);
        return !Number.isNaN(parsed) && parsed !== p.qty;
        });
    };

    const handleAddShop = async() => {
        if (!newShop.address.trim()) return;
        if(shopsList) {
          const objectShopActual = shopsList.find(shop => shop.idShop === newShop.idShop);
          if(!shopsList.find(shop => shop.addressShop === newShop.address)) {
            toast.error("[Frontend] Such a address doesnt exist");
            return;
          }


          const newEntry: ShopInventory = {
              shopId: newShop.idShop,
              shopName: objectShopActual?.nameShop || "refresh needed",
              eventName: objectShopActual?.eventName || "",
              shopAddress: newShop.address,
              bmFullName:"refresh needed",
              addTime: new Date().toLocaleString(),
              productClass: [
                  { id: 1, label: "HILO", qty: Number(newShop.hilo) || 0 },
                  { id: 2, label: "HILO PLUS", qty: Number(newShop.hiloPlus) || 0 },
                  { id: 3, label: "PACKS", qty: Number(newShop.packs) || 0 },
              ],
          };

          try {
              const res = await apiFetch<messageRes>("/api/bm/addRaport", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      idShop: newShop.idShop,
                      hiloQty: newShop.hilo,
                      hiloPlusQty: newShop.hiloPlus,
                      packsQty: newShop.packs
                  })
              });
              toast.success(res.message);
          } catch(error) {
              toast.error(error + '');
          }


          // setShops((prev) => [newEntry, ...prev]);
          setShops((prev) => {
              if(objectShopActual) {
                  return prev.map(shop => shop.shopId === newEntry.shopId ? newEntry : shop )
              } else {
                  return [newEntry, ...prev];
              }
          });

          setNewShop({ address: "", hilo: "", hiloPlus: "", packs: "", idShop: 0 });
          setView("shops");
        }


    };


    if(loading) {
      return (
        <DarkLoadingPage/>
      )
    }
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-gray-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-zinc-900/70 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setView("shops")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                view === "shops"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Store className="inline w-4 h-4 mr-1.5" />
              Show Shops
            </button>
            <button
              onClick={() => setView("add")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                view === "add"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <PlusCircle className="inline w-4 h-4 mr-1.5" />
              Add New
            </button>
          </div>
        </div>

        {view === "shops" ? (
          <>
            {/* Search Bar */}
            <header>
              <Label htmlFor="search" className="sr-only">
                Search by address
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by address..."
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 placeholder-zinc-500 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500/30"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </header>

            {/* Shops List */}
            <main className="space-y-3 sm:space-y-4">
              {filtered.map((shop) => {
                const hasEdits = shopHasEdits(shop.shopId);
                return (
                  <motion.div
                    key={shop.shopId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Card
                      className={`rounded-xl border border-zinc-800/60 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all bg-gradient-to-br ${gradientForShop(
                        shop.eventName
                      )} backdrop-blur-md`}
                    >
                      <CardContent className="p-3 sm:p-4 flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                              {shop.shopName}
                            </h3>
                            <p className="text-xs sm:text-sm text-zinc-400">{shop.shopAddress}</p>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1.5 bg-zinc-900/70 border border-zinc-800 px-2.5 py-1 rounded-md text-xs sm:text-sm text-zinc-200">
                              <User className="w-3.5 h-3.5 text-indigo-400" />
                              {shop.bmFullName} 
                            </div>
                            <div className="text-[10px] sm:text-xs text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded-md border border-zinc-800">
                              <Calendar className="inline w-3 h-3 mr-1 text-zinc-500" />
                              {new Date(shop.addTime).toLocaleString("pl-PL", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false,
                                      timeZone: "Europe/Warsaw"

                              })};
                            </div>
                          </div>
                        </div>

                        {/* Products */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 sm:p-3">
                          <div className="grid gap-2.5">
                            {shop?.productClass?.map((pr) => {
                              const key = `${shop.shopId}_${pr.id}`;
                              const isOpen = !!openInputs[key];
                                const editedVal = edits[String(shop.shopId)]?.[String(pr.id)];
                              const hasEdits = shopHasEdits(shop.shopId);

                              return (
                                <div
                                  key={pr.id}
                                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-100">
                                    <Package className="w-3.5 h-3.5 text-zinc-500" />
                                    {pr.label}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isOpen ? (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={editedVal}
                                        onChange={(e) =>
                                          changeEdit(shop.shopId, pr.id, e.target.value)
                                        }
                                        className="w-16 bg-transparent border border-zinc-700 rounded-md px-2 py-0.5 text-zinc-200 text-right text-xs sm:text-sm"
                                      />
                                    ) : (
                                      <button
                                        onClick={() => startEdit(shop.shopId, pr.id)}
                                        className="min-w-[48px] text-right text-zinc-100 text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-md hover:bg-zinc-800/50"
                                        aria-label={`Edit ${pr.label} for ${shop.shopName}`}
                                      >
                                        {pr.qty}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Footer */}
                            <div className="pt-2 border-t border-zinc-800 mt-2 flex items-center justify-end gap-2">
                              {hasEdits ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    onClick={() => cancelEdits(shop.shopId)}
                                    className="px-3 py-1 text-xs sm:text-sm text-zinc-100"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => saveEdits(shop.shopId)}
                                    className="px-3 py-1 text-xs sm:text-sm text-emerald-400"
                                  >
                                    Save
                                  </Button>
                                </>
                              ) : (
                                <div className="text-xs sm:text-sm text-zinc-500">
                                  Tap a number to edit
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center text-zinc-500 py-12 text-sm sm:text-base">
                  No shops match the address.
                </div>
              )}
            </main>
          </>
        ) : (
          /* Add New Form */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="rounded-xl border border-zinc-800/60 shadow-sm bg-zinc-900/60 backdrop-blur-md p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                Add New Shop
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-zinc-300">Shop Address</Label>
                    <Input
                    placeholder="Enter full address..."
                    value={newShop.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    className="mt-1 bg-zinc-950/70 border-zinc-800 text-zinc-200 text-sm"
                    />
                    {addressSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1  bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden">
                        {addressSuggestions.map((shop) => (
                            <button
                            key={shop.idShop}
                            onClick={() => selectAddress(shop)}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors duration-100 border-b border-zinc-800 last:border-none"
                            >
                            <div className="flex flex-col">
                                <span className="text-zinc-100 text-xs font-medium leading-tight">{shop.eventName}</span>
                                <span className="text-zinc-400 text-xs leading-tight">{shop.nameShop}</span>
                                <span className="text-zinc-500 text-[11px] mt-0.5 leading-tight">{shop.addressShop}</span>
                            </div>
                            </button>
                        ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">HILO</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newShop.hilo}
                      onChange={(e) => setNewShop({ ...newShop, hilo: e.target.value })}
                      className="mt-1 bg-zinc-950/70 border-zinc-800 text-zinc-200 text-sm text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">HILO PLUS</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newShop.hiloPlus}
                      onChange={(e) => setNewShop({ ...newShop, hiloPlus: e.target.value })}
                      className="mt-1 bg-zinc-950/70 border-zinc-800 text-zinc-200 text-sm text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">PACKS</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newShop.packs}
                      onChange={(e) => setNewShop({ ...newShop, packs: e.target.value })}
                      className="mt-1 bg-zinc-950/70 border-zinc-800 text-zinc-200 text-sm text-center"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddShop}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm mt-2"
                >
                  Submit New Shop
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}
