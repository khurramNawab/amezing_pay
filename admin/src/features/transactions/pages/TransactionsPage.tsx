import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";
import type { AdminTransactionRow, Paginated } from "@/features/transactions/transactionTypes";

export function TransactionsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string>("");
  const [data, setData] = useState<Paginated<AdminTransactionRow> | null>(null);
  const limit = 20;

  const query = useMemo(() => ({ q: q.trim(), page, limit }), [q, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/transactions", { params: query });
      setData(res.data as Paginated<AdminTransactionRow>);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const approvePending = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/admin/transactions/${id}/approve`);
      await loadData();
    } finally {
      setActionLoadingId("");
    }
  };

  const rejectPending = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/admin/transactions/${id}/reject`, { reason: "Rejected by admin" });
      await loadData();
    } finally {
      setActionLoadingId("");
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Track credits, debits, pending validations, and settlement actions.
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
                placeholder="Search by title / source / status..."
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
          <div className="col-span-3">Title</div>
          <div className="col-span-2">User</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Wallet</div>
          <div className="col-span-1">Source</div>
          <div className="col-span-1">Actions</div>
          <div className="col-span-2 text-right">Amount</div>
        </TableHead>
        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          (data?.items || []).map((t) => {
            const isPendingCredit = t.status === "pending" && t.wallet === "pending";
            const isWorking = actionLoadingId === t._id;
            return (
              <TableRow key={t._id}>
                <div className="col-span-3 min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="truncate text-xs text-text-muted">{t.category}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <div className="truncate">{t.user?.name || "-"}</div>
                  <div className="truncate text-xs text-text-muted">{t.user?.phone}</div>
                </div>
                <div className="col-span-2">
                  <Badge variant="default">{t.type}</Badge>
                </div>
                <div className="col-span-2">
                  <Badge
                    variant={
                      t.status === "success" || t.status === "completed"
                        ? "success"
                        : t.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {t.status}
                  </Badge>
                </div>
                <div className="col-span-1">
                  <Badge variant="default">{t.wallet || "-"}</Badge>
                </div>
                <div className="col-span-1 text-xs text-text-muted">{t.source || "-"}</div>
                <div className="col-span-1 flex items-center gap-1">
                  {isPendingCredit ? (
                    <>
                      <Button
                        size="sm"
                        disabled={isWorking}
                        onClick={() => approvePending(t._id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isWorking}
                        onClick={() => rejectPending(t._id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">-</span>
                  )}
                </div>
                <div
                  className={`col-span-2 text-right font-semibold ${
                    t.direction === "debit"
                      ? "text-rose-500"
                      : t.direction === "credit"
                        ? "text-emerald-500"
                        : "text-text"
                  }`}
                >
                  {t.direction === "debit" ? "-" : t.direction === "credit" ? "+" : ""} INR{" "}
                  {t.amount.toLocaleString()}
                </div>
              </TableRow>
            );
          })
        )}

        {!loading && !(data?.items?.length) ? (
          <div className="p-10 text-center text-sm text-text-muted">No transactions found.</div>
        ) : null}
      </Table>
    </div>
  );
}

