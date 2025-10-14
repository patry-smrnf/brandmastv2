// app/brandmasters/page.tsx
"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { myBms, myBmsTargets } from "@/types/myBms"
import { apiFetch } from "@/utils/apiFetch"
import { toast } from "sonner"
import { messageRes } from "@/types/MessageRes"
import ContextMenu from "@/components/contextMenu";
import DarkLoadingPage from "@/components/LoadingScreen"


export default function myTeamPage() {
    const [data, setData] = useState<myBmsTargets[]>([])
    const [selected, setSelected] = useState<number[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(5)
    const [open, setOpen] = useState(false)

    const [loading, setLoading] = useState(true); // ✅ Added

    const [newBrandmaster, setNewBrandmaster] = useState<Omit<myBmsTargets, "brandmasterId">>({
        brandmasterName: "",
        brandmasterLast: "",
        brandmasterLogin: "",
        tourplannerId: null,
        targetHilo: 0,
        targetHiloPlus: 0,
        targetVelo: 0,
        idTarget: 0
    })

    const totalPages = Math.ceil(data.length / pageSize)
    const startIndex = (page - 1) * pageSize
    const visibleData = data.slice(startIndex, startIndex + pageSize)

    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);


    // Add new state at the top of your component
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const [editingValues, setEditingValues] = useState<{
    targetHilo: number,
    targetHiloPlus: number,
    targetVelo: number
    }>({ targetHilo: 0, targetHiloPlus: 0, targetVelo: 0 })


    useEffect(() => {
        setLoading(true);
        async function fetchData() {
            try {
                const res = await apiFetch<myBmsTargets[]>('/api/sv/myTargets', {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });

                setData(res);
            } catch(error) {
                toast.error("" + error);
            } finally {
                setLoading(false);
            }
        };


        fetchData();
    }, []);

  async function handleAdd() {
    const id = Math.max(0, ...data.map((d) => d.brandmasterId)) + 1
    setData([...data, { ...newBrandmaster, brandmasterId: id }])

    try {
        const res = await apiFetch<messageRes>('/api/sv/setGeneralTargets', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetHilo: newBrandmaster.targetHilo,
                targetHiloPlus: newBrandmaster.targetHiloPlus,
                targetVelo: newBrandmaster.targetVelo,
            })  
        });

        toast.success(res.message);
    } catch(error) {
        toast.error(error + '');
    }

    setNewBrandmaster({
    
    brandmasterName: "",
    brandmasterLast: "",
    brandmasterLogin: "",
    tourplannerId: null,
    targetHilo: 0,
    targetHiloPlus: 0,
    targetVelo: 0,
    idTarget: 0
    })

    setOpen(false)
  }

  if(loading) {
    return ( <DarkLoadingPage/>);
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
        {menuOpen && <ContextMenu closeMenu={() => setMenuOpen(false)} type={"SV"} />}
    </div>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-6 flex items-center justify-center">
        <Card className="w-full max-w-6xl bg-neutral-950 border border-neutral-900/70 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
            <CardHeader className="border-b border-neutral-900 pb-3 flex justify-between items-center">
            <CardTitle className="text-xl font-semibold tracking-tight text-gray-100">
                Targets
            </CardTitle>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
                Management Panel
            </div>
            </CardHeader>

            <CardContent className="pt-4">
                {/* Top controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex gap-2">
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                            <Button className="h-8 px-3 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-sm border border-neutral-700">
                                + Ustal ogolny target
                            </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-neutral-950 border border-neutral-800 text-gray-100 p-6 rounded-xl max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-semibold">Set general Target</DialogTitle>
                            </DialogHeader>

                            <div className="grid gap-3 mt-4">
                                <div>
                                <Label className="text-xs text-gray-400">Hilo</Label>
                                <Input
                                    className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                                    value={Number(newBrandmaster.targetHilo)}
                                    onChange={(e) =>
                                    setNewBrandmaster((p) => ({ ...p, targetHilo: Number(e.target.value )}))
                                    }
                                />
                                </div>
                                <div>
                                <Label className="text-xs text-gray-400">Hilo Plus</Label>
                                <Input
                                    className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                                    value={Number(newBrandmaster.targetHiloPlus)}
                                    onChange={(e) =>
                                    setNewBrandmaster((p) => ({ ...p, targetHiloPlus: Number(e.target.value )}))
                                    }
                                />
                                </div>
                                <div>
                                <Label className="text-xs text-gray-400">Velo</Label>
                                <Input
                                    className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                                    value={Number(newBrandmaster.targetVelo)}
                                    onChange={(e) =>
                                    setNewBrandmaster((p) => ({ ...p, targetVelo: Number(e.target.value )}))
                                    }
                                />
                                </div>
                                <Button
                                onClick={handleAdd}
                                className="h-8 mt-1 bg-blue-600 hover:bg-blue-500 text-sm font-medium"
                                >
                                    Set it
                                </Button>
                            </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Label className="text-gray-400">Rows:</Label>
                        <Select value={pageSize.toString()}
                            onValueChange={(val) => {
                            setPageSize(Number(val))
                            setPage(1)
                            }}>

                            <SelectTrigger className="h-8 w-20 bg-neutral-900 border-neutral-800 text-gray-200 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-950 border-neutral-800 text-gray-200">
                            {[5, 10, 20, 50].map((n) => (
                                <SelectItem key={n} value={n.toString()} className="hover:bg-neutral-800">
                                {n}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-neutral-900 rounded-xl">
                    <Table>
                    <TableHeader>
                        <TableRow className="bg-neutral-950/80">
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">ID</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Name</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Last</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Login</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Hilo</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Hilo Plus</TableHead>
                            <TableHead className="text-gray-400 text-xs uppercase">Velo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {visibleData.map((item) => {
                        const isEditing = editingRow === item.brandmasterId

                        return (
                        <TableRow key={item.brandmasterId} className={cn("transition-colors hover:bg-zinc-900 border-b border-neutral-900/60",item.targetHilo === null && "bg-red-950/30")}>
                            <TableCell className="px-3">
                                <input type="checkbox" className="accent-blue-600" checked={selected.includes(item.brandmasterId)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, item.brandmasterId] : prev.filter((id) => id !== item.brandmasterId))}/>
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">{item.brandmasterId}</TableCell>
                            <TableCell className="text-gray-400 text-sm">{item.brandmasterName}</TableCell>
                            <TableCell className="text-gray-400 text-sm">{item.brandmasterLast}</TableCell>
                            <TableCell className="text-sm font-mono text-blue-500">{item.brandmasterLogin}</TableCell>

                            {/* Editable cells */}
                            <TableCell className="text-gray-400 text-sm">
                            {isEditing ? (
                                <Input
                                className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                                type="number"
                                value={editingValues.targetHilo}
                                onChange={(e) => setEditingValues(prev => ({ ...prev, targetHilo: Number(e.target.value) }))}
                                />
                            ) : (
                                <span onClick={() => {
                                setEditingRow(item.brandmasterId)
                                setEditingValues({
                                    targetHilo: item.targetHilo ?? 0,
                                    targetHiloPlus: item.targetHiloPlus ?? 0,
                                    targetVelo: item.targetVelo ?? 0,
                                })
                                }} className="cursor-pointer">
                                {item.targetHilo ?? <span className="text-neutral-600">—</span>}
                                </span>
                            )}
                            </TableCell>

                            <TableCell className="text-gray-400 text-sm">
                            {isEditing ? (
                                <Input
                                className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                                type="number"
                                value={editingValues.targetHiloPlus}
                                onChange={(e) => setEditingValues(prev => ({ ...prev, targetHiloPlus: Number(e.target.value) }))}
                                />
                            ) : (
                                <span onClick={() => {
                                setEditingRow(item.brandmasterId)
                                setEditingValues({
                                    targetHilo: item.targetHilo ?? 0,
                                    targetHiloPlus: item.targetHiloPlus ?? 0,
                                    targetVelo: item.targetVelo ?? 0,
                                })
                                }} className="cursor-pointer">
                                {item.targetHiloPlus ?? <span className="text-neutral-600">—</span>}
                                </span>
                            )}
                            </TableCell>

                            <TableCell className="text-gray-400 text-sm">
                            {isEditing ? (
                                <div className="flex items-center gap-1">
                                <Input
                                    className="h-8 w-16 bg-neutral-900 border-neutral-800 text-sm"
                                    type="number"
                                    value={editingValues.targetVelo}
                                    onChange={(e) => setEditingValues(prev => ({ ...prev, targetVelo: Number(e.target.value) }))}
                                />
                                <Button
                                    size="sm"
                                    className="h-8 px-2 bg-green-800 hover:bg-green-500"
                                    onClick={() => {
                                    // Save logic
                                    const updatedObject = {
                                        brandmasterId: item.brandmasterId,
                                        targetHilo: editingValues.targetHilo,
                                        targetHiloPlus: editingValues.targetHiloPlus,
                                        targetVelo: editingValues.targetVelo
                                    }

                                    try {
                                        const res = apiFetch<messageRes>('/api/sv/setBmTarget', {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(updatedObject)
                                        });

                                        res.then((item) => {
                                            toast.success(item.message);
                                        });
                                    } catch(error) {
                                        toast.error(error + '');
                                    }

                                    // Update table locally
                                    setData(prev => prev.map(d => d.brandmasterId === item.brandmasterId ? { ...d, ...editingValues } : d))

                                    console.log("Saved object:", updatedObject)
                                    setEditingRow(null)
                                    }}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 px-2 bg-red-800 hover:bg-red-500"
                                    onClick={() => setEditingRow(null)}
                                >
                                    Cancel
                                </Button>
                                </div>
                            ) : (
                                <span onClick={() => {
                                setEditingRow(item.brandmasterId)
                                setEditingValues({
                                    targetHilo: item.targetHilo ?? 0,
                                    targetHiloPlus: item.targetHiloPlus ?? 0,
                                    targetVelo: item.targetVelo ?? 0,
                                })
                                }} className="cursor-pointer">
                                {item.targetVelo ?? <span className="text-neutral-600">—</span>}
                                </span>
                            )}
                            </TableCell>
                        </TableRow>
                        )
                    })}
                    </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                    <span>
                    Page <span className="text-gray-200">{page}</span> /{" "}
                    <span className="text-gray-200">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800"
                    >
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 px-3 bg-neutral-900 border-neutral-800 text-gray-300 hover:bg-neutral-800"
                    >
                        Next
                    </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
    </>
  )
}
