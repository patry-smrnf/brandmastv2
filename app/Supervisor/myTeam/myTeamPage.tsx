// app/brandmasters/page.tsx
"use client"

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { myBms } from "@/types/myBms"
import { apiFetch } from "@/utils/apiFetch"
import { toast } from "sonner"
import ContextMenu from "@/components/contextMenu"
import DarkLoadingPage from "@/components/LoadingScreen"

export default function MyTeamPage() {
  const [data, setData] = useState<myBms[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const [newBrandmaster, setNewBrandmaster] = useState<Omit<myBms, "brandmasterId">>({
    brandmasterName: "",
    brandmasterLast: "",
    brandmasterLogin: "",
    tourplannerId: null,
  })

  const menuRef = useRef<HTMLDivElement | null>(null)
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), [])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / pageSize)),
    [data.length, pageSize]
  )

  const visibleData = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return data.slice(startIndex, startIndex + pageSize)
  }, [data, page, pageSize])

  // Fetch Data
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const res = await apiFetch<myBms[]>("/api/sv/myBms", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (isMounted) setData(res ?? [])
      } catch (error) {
        toast.error("Failed to load data: " + (error as Error).message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  // Add Brandmaster
  const handleAdd = useCallback(async () => {
    if (!newBrandmaster.brandmasterName.trim() || !newBrandmaster.brandmasterLogin.trim()) {
      toast.warning("Please fill in required fields.")
      return
    }

    const id =
      (data.length > 0 ? Math.max(...data.map((d) => d.brandmasterId)) : 0) + 1

    const optimistic = { ...newBrandmaster, brandmasterId: id }
    setData((prev) => [...prev, optimistic])

    try {
      const res = await apiFetch<{ message: string }>("/api/sv/addBm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrandmaster),
      })
      toast.success(res.message)
    } catch (error) {
      toast.error("Failed to add brandmaster: " + (error as Error).message)
      setData((prev) => prev.filter((d) => d.brandmasterId !== id))
    } finally {
      setNewBrandmaster({
        brandmasterName: "",
        brandmasterLast: "",
        brandmasterLogin: "",
        tourplannerId: null,
      })
      setOpen(false)
    }
  }, [data, newBrandmaster])

  // Delete Brandmasters
  const handleDelete = useCallback(async () => {
    if (selected.length === 0) return
    const toDelete = [...selected]
    setSelected([])

    const remaining = data.filter((d) => !toDelete.includes(d.brandmasterId))
    setData(remaining)

    for (const bmId of toDelete) {
      try {
        const res = await apiFetch<{ message: string }>("/api/sv/delBm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandmasterId: bmId }),
        })
        toast.success(res.message)
      } catch (error) {
        toast.error("Failed to delete: " + (error as Error).message)
      }
    }
  }, [data, selected])

  if (loading) return <DarkLoadingPage />

  return (
    <>
      {/* Floating Menu */}
      <div
        ref={menuRef}
        className="fixed top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleMenu}
          aria-label="Toggle menu"
          type="button"
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none"
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

      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-gray-200 p-6 flex items-center justify-center">
        <Card className="w-full max-w-6xl bg-neutral-950 border border-neutral-900/70 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden">
          <CardHeader className="border-b border-neutral-900 pb-3 flex justify-between items-center">
            <CardTitle className="text-xl font-semibold tracking-tight text-gray-100">
              Brandmasters
            </CardTitle>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              Management Panel
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-8 px-3 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-sm border border-neutral-700">
                      + Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-neutral-950 border border-neutral-800 text-gray-100 p-6 rounded-xl max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold">Add Brandmaster</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3 mt-4">
                      {[
                        { label: "Name", key: "brandmasterName" },
                        { label: "Last", key: "brandmasterLast" },
                        { label: "Login", key: "brandmasterLogin" },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <Label className="text-xs text-gray-400">{label}</Label>
                          <Input
                            className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                            value={(newBrandmaster as any)[key]}
                            onChange={(e) =>
                              setNewBrandmaster((p) => ({
                                ...p,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}

                      <div>
                        <Label className="text-xs text-gray-400">Tourplanner ID (optional)</Label>
                        <Input
                          className="h-8 bg-neutral-900 border-neutral-800 text-sm"
                          value={newBrandmaster.tourplannerId ?? ""}
                          onChange={(e) =>
                            setNewBrandmaster((p) => ({
                              ...p,
                              tourplannerId: e.target.value || null,
                            }))
                          }
                        />
                      </div>

                      <Button
                        onClick={handleAdd}
                        disabled={!newBrandmaster.brandmasterName || !newBrandmaster.brandmasterLogin}
                        className="h-8 mt-1 bg-blue-600 hover:bg-blue-500 text-sm font-medium"
                      >
                        Add
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={selected.length === 0}
                  className="h-8 px-3 text-sm bg-red-700 hover:bg-red-600 border border-red-800"
                >
                  Delete
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Label className="text-gray-400">Rows:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-20 bg-neutral-900 border-neutral-800 text-gray-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950 border-neutral-800 text-gray-200">
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
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
                    {["ID", "Name", "Last", "Login", "Tourplanner"].map((h) => (
                      <TableHead key={h} className="text-gray-400 text-xs uppercase">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleData.map((item) => (
                    <TableRow
                      key={item.brandmasterId}
                      className={cn(
                        "transition-colors hover:bg-zinc-900 border-b border-neutral-900/60",
                        item.tourplannerId === null && "bg-red-950/30"
                      )}
                    >
                      <TableCell className="px-3">
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={selected.includes(item.brandmasterId)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, item.brandmasterId]
                                : prev.filter((id) => id !== item.brandmasterId)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{item.brandmasterId}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{item.brandmasterName}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{item.brandmasterLast}</TableCell>
                      <TableCell className="text-sm font-mono text-blue-500">
                        {item.brandmasterLogin}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {item.tourplannerId ?? <span className="text-neutral-600">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
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
