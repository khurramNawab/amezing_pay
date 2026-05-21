import { useEffect, useMemo, useState } from "react";
import { Search, ExternalLink, Clock, CheckCircle2, XCircle, MoreVertical } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";

interface WithdrawalRow {
  _id: string;
  user: { name: string; phone: string; kycStatus: string };
  amount: number;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  method: string;
  destination: { upiId?: string; accountHolder?: string; accountNumberMasked?: string; bankName?: string };
  createdAt: string;
}

export function WithdrawalsPage() {
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string>("");
  const [data, setData] = useState<{ items: WithdrawalRow[]; total: number; limit: number } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/withdrawals", { params: { status, page, limit: 20 } });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [status, page]);

  const approve = async (id: string) => {
    if (!window.confirm("Mark this withdrawal as successful?")) return;
    setActionLoadingId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/approve`, { note: "Manually approved by admin" });
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Approval failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    setActionLoadingId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/reject`, { reason });
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Rejection failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const markProcessing = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/process`);
      await loadData();
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
        <div className="flex border border-border bg-card rounded-xl p-1 gap-1">
          {["PENDING", "PROCESSING", "SUCCESS", "FAILED"].map((s) => (
            <Button
              key={s}
              variant={status === s ? "primary" : "ghost"}
              size="sm"
              onClick={() => { setStatus(s); setPage(1); }}
              className="text-xs"
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHead>
          <div className="col-span-3">User</div>
          <div className="col-span-2">Method / Details</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Actions</div>
          <div className="col-span-2 text-right">Amount</div>
        </TableHead>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          (data?.items || []).map((w) => (
            <TableRow key={w._id}>
              <div className="col-span-3">
                <div className="font-medium">{w.user?.name || "Unknown"}</div>
                <div className="text-xs text-text-muted">{w.user?.phone}</div>
                <Badge variant={w.user?.kycStatus === 'verified' ? 'success' : 'warning'} className="mt-1">
                  KYC {w.user?.kycStatus}
                </Badge>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold">{w.method.toUpperCase()}</div>
                <div className="text-xs text-text-muted truncate">
                   {w.method === 'upi' ? w.destination?.upiId : `${w.destination?.bankName} (..${w.destination?.accountNumberMasked})`}
                </div>
              </div>
              <div className="col-span-2 text-xs text-text-muted">
                {new Date(w.createdAt).toLocaleString()}
              </div>
              <div className="col-span-1">
                 <Badge variant={w.status === 'SUCCESS' ? 'success' : w.status === 'FAILED' ? 'danger' : 'warning'}>
                   {w.status}
                 </Badge>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                 {w.status === 'PENDING' && (
                   <Button size="sm" onClick={() => markProcessing(w._id)} disabled={!!actionLoadingId}>Process</Button>
                 )}
                 {(w.status === 'PENDING' || w.status === 'PROCESSING') && (
                   <>
                    <Button size="sm" variant="success" onClick={() => approve(w._id)} disabled={!!actionLoadingId}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => reject(w._id)} disabled={!!actionLoadingId}>Reject</Button>
                   </>
                 )}
                 {(w.status === 'SUCCESS' || w.status === 'FAILED') && (
                   <span className="text-xs text-text-muted">No actions</span>
                 )}
              </div>
              <div className="col-span-2 text-right font-bold text-lg">
                ₹{w.amount}
              </div>
            </TableRow>
          ))
        )}
      </Table>
    </div>
  );
}
