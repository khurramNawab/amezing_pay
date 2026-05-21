import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";
import type { AdminCardRow, Paginated } from "@/features/cards/cardTypes";

export function CardsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Paginated<AdminCardRow> | null>(null);
  const [preview, setPreview] = useState<AdminCardRow | null>(null);

  const limit = 20;
  const query = useMemo(() => ({ q: q.trim(), page, limit }), [q, page]);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/cards", { params: query })
      .then((res) => setData(res.data as Paginated<AdminCardRow>))
      .finally(() => setLoading(false));
  }, [query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const setModeration = async (card: AdminCardRow, moderationStatus: AdminCardRow["moderationStatus"]) => {
    await api.patch(`/admin/cards/${card._id}/moderation`, { moderationStatus });
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((x) =>
              x._id === card._id ? { ...x, moderationStatus } : x,
            ),
          }
        : prev,
    );
  };

  const deleteCard = async (card: AdminCardRow) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete card "${card.name}"?`);
    if (!ok) return;
    await api.delete(`/admin/cards/${card._id}`);
    setData((prev) =>
      prev ? { ...prev, items: prev.items.filter((x) => x._id !== card._id) } : prev,
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Virtual Visiting Cards</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Moderate cards and remove spam. Approved cards can be shared publicly.
            </div>
          </div>
          <Badge variant="default">{data?.total ?? 0} total</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                className="pl-9"
                placeholder="Search by name, phone, email…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <div className="text-sm text-text-muted">
                Page {page} / {totalPages}
              </div>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <div className="col-span-3">Card</div>
          <div className="col-span-2">User</div>
          <div className="col-span-2">Template</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </TableHead>
        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          (data?.items || []).map((c) => (
            <TableRow key={c._id}>
              <div className="col-span-3 min-w-0">
                <div className="truncate font-medium">{c.name}</div>
                <div className="truncate text-xs text-text-muted">
                  {c.phone} • {c.email}
                </div>
              </div>
              <div className="col-span-2 min-w-0">
                <div className="truncate">{c.user?.name || "—"}</div>
                <div className="truncate text-xs text-text-muted">{c.user?.phone}</div>
              </div>
              <div className="col-span-2 min-w-0">
                <div className="truncate font-medium">{c.template?.name}</div>
                <div className="truncate text-xs text-text-muted">
                  {c.template?.isPremium ? "Premium" : "Free"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={c.status === "active" ? "success" : "warning"}>
                    {c.status}
                  </Badge>
                  <Badge
                    variant={
                      c.moderationStatus === "approved"
                        ? "success"
                        : c.moderationStatus === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {c.moderationStatus}
                  </Badge>
                </div>
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreview(c)} title="Preview">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModeration(c, "approved")}
                  title="Approve"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModeration(c, "rejected")}
                  title="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => deleteCard(c)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}

        {!loading && !(data?.items?.length) ? (
          <div className="p-10 text-center text-sm text-text-muted">No cards found.</div>
        ) : null}
      </Table>

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Card Preview</div>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-text-muted">Name</div>
                <div className="mt-1 font-medium">{preview.name}</div>
                <div className="mt-3 text-xs text-text-muted">Role</div>
                <div className="mt-1">{preview.role}</div>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="text-xs text-text-muted">Contact</div>
                <div className="mt-1">{preview.phone}</div>
                <div className="mt-1">{preview.email}</div>
                <div className="mt-3 text-xs text-text-muted">Template</div>
                <div className="mt-1">{preview.template?.name}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

