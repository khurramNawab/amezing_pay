import { useEffect, useMemo, useState } from "react";
import { ShieldBan, ShieldCheck, Trash2, Search, Percent, MessageCircle, Send, ExternalLink, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";
import type { AdminUserRow, Paginated } from "@/features/users/userTypes";

export function UsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null);
  const [commissionUser, setCommissionUser] = useState<AdminUserRow | null>(null);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionForm, setCommissionForm] = useState<{
    enabled: boolean;
    sellerPercent: string;
    uplinePercent: string;
  }>({ enabled: true, sellerPercent: "", uplinePercent: "" });
  const [msgUser, setMsgUser] = useState<AdminUserRow | null>(null);
  const [msgForm, setMsgForm] = useState({ title: "", message: "" });
  const [msgSending, setMsgSending] = useState(false);
  const [kycUser, setKycUser] = useState<AdminUserRow | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const limit = 20;

  const query = useMemo(() => ({ q: q.trim(), page, limit }), [q, page]);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/users", { params: query })
      .then((res) => setData(res.data as Paginated<AdminUserRow>))
      .finally(() => setLoading(false));
  }, [query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const toggleBlock = async (u: AdminUserRow) => {
    await api.patch(`/admin/users/${u._id}/block`, { isBlocked: !u.isBlocked });
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((x) =>
              x._id === u._id ? { ...x, isBlocked: !u.isBlocked } : x,
            ),
          }
        : prev,
    );
  };

  const deleteUser = async (u: AdminUserRow) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      `Delete user ${u.phone}? This will permanently remove the user and their data.`,
    );
    if (!ok) return;
    await api.delete(`/admin/users/${u._id}`);
    setData((prev) =>
      prev ? { ...prev, items: prev.items.filter((x) => x._id !== u._id) } : prev,
    );
  };

  const openCommission = (u: AdminUserRow) => {
    setCommissionUser(u);
    setCommissionForm({
      enabled: u.commission?.enabled !== false,
      sellerPercent:
        u.commission?.sellerPercent === null || u.commission?.sellerPercent === undefined
          ? ""
          : String(u.commission.sellerPercent),
      uplinePercent:
        u.commission?.uplinePercent === null || u.commission?.uplinePercent === undefined
          ? ""
          : String(u.commission.uplinePercent),
    });
  };

  const saveCommission = async () => {
    if (!commissionUser) return;
    setCommissionSaving(true);
    try {
      const payload = {
        enabled: commissionForm.enabled,
        sellerPercent:
          commissionForm.sellerPercent.trim() === ""
            ? null
            : Number(commissionForm.sellerPercent),
        uplinePercent:
          commissionForm.uplinePercent.trim() === ""
            ? null
            : Number(commissionForm.uplinePercent),
      };
      const res = await api.patch(
        `/admin/users/${commissionUser._id}/commission`,
        payload,
      );
      const updated = res.data?.commission;
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((x) =>
                x._id === commissionUser._id
                  ? { ...x, commission: updated }
                  : x,
              ),
            }
          : prev,
      );
      setCommissionUser(null);
    } finally {
      setCommissionSaving(false);
    }
  };

  const openMessage = (u: AdminUserRow) => {
    setMsgUser(u);
    setMsgForm({ title: "Important Update", message: "" });
  };

  const sendDirectMessage = async () => {
    if (!msgUser) return;
    if (!msgForm.title.trim() || !msgForm.message.trim()) {
      alert("Title and message are required.");
      return;
    }
    setMsgSending(true);
    try {
      await api.post("/admin/notifications", {
        targetUser: msgUser._id,
        title: msgForm.title,
        message: msgForm.message,
      });
      alert(`Message sent to ${msgUser.phone}`);
      setMsgUser(null);
    } catch (err) {
      alert("Failed to send message.");
    } finally {
      setMsgSending(false);
    }
  };

  const openKycReview = (u: AdminUserRow) => {
    setKycUser(u);
    setKycRejectReason("");
  };

  const handleKycReview = async (status: "verified" | "rejected") => {
    if (!kycUser) return;
    if (status === "rejected" && !kycRejectReason.trim()) {
      alert("Please provide a reason for rejecting the KYC documents.");
      return;
    }

    setKycSubmitting(true);
    try {
      await api.post(`/kyc/review/${kycUser._id}`, {
        status,
        reason: status === "rejected" ? kycRejectReason.trim() : undefined,
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((x) =>
                x._id === kycUser._id ? { ...x, kycStatus: status } : x
              ),
            }
          : prev
      );
      alert(`KYC status updated to ${status} for ${kycUser.phone}`);
      setKycUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update KYC status.");
    } finally {
      setKycSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Search, block/unblock, and enforce policy (max cards limit is configurable in Settings).
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
          <div className="col-span-3">User</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2">Cards</div>
          <div className="col-span-2">Earnings</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </TableHead>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          (data?.items || []).map((u) => (
            <TableRow key={u._id}>
              <div className="col-span-3 min-w-0">
                <div className="truncate font-medium">{u.name || "—"}</div>
                <div className="truncate text-xs text-text-muted">{u.email || "—"}</div>
              </div>
              <div className="col-span-2 truncate">{u.phone}</div>
              <div className="col-span-2 text-text-muted">
                <span className="font-medium text-text">{u.cardsCreated}</span>{" "}
                <span className="text-xs">cards</span>
                <div className="text-xs">Referrals: {u.referralsCount}</div>
              </div>
              <div className="col-span-2">
                <div className="font-medium">₹{u.totalEarnings.toLocaleString()}</div>
                <div className="text-xs text-text-muted">
                  Wallet ₹{u.walletBalance.toLocaleString()}
                </div>
                <div className="text-xs text-text-muted">
                  KYC:{" "}
                  <span
                    onClick={() => u.kycStatus && u.kycStatus !== "unverified" && openKycReview(u)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer transition-opacity hover:opacity-85 ${
                      u.kycStatus === "verified"
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                        : u.kycStatus === "pending"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        : u.kycStatus === "rejected"
                        ? "bg-rose-500/15 text-rose-500 border border-rose-500/20"
                        : "bg-neutral-500/15 text-text-muted border border-border"
                    }`}
                    title={u.kycStatus && u.kycStatus !== "unverified" ? "Click to review documents" : undefined}
                  >
                    {u.kycStatus || "unverified"}
                  </span>
                </div>
              </div>
              <div className="col-span-1">
                {u.isBlocked ? (
                  <Badge variant="danger">Blocked</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleBlock(u)}
                  title={u.isBlocked ? "Unblock" : "Block"}
                >
                  {u.isBlocked ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldBan className="h-4 w-4" />
                  )}
                </Button>
                {u.kycStatus && u.kycStatus !== "unverified" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openKycReview(u)}
                    title="Review KYC Documents"
                    className="hover:text-primary transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openMessage(u)}
                  title="Send Direct Message"
                  className="hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openCommission(u)}
                  title="Commission override"
                >
                  <Percent className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteUser(u)}
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}

        {!loading && !(data?.items?.length) ? (
          <div className="p-10 text-center text-sm text-text-muted">No users found.</div>
        ) : null}
      </Table>

      {commissionUser ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
          onClick={() => setCommissionUser(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Commission override</div>
                <div className="mt-1 text-xs text-text-muted">
                  User: {commissionUser.phone}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setCommissionUser(null)}>
                Close
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm md:col-span-2">
                Enable commissions for this user
                <input
                  type="checkbox"
                  checked={commissionForm.enabled}
                  onChange={(e) =>
                    setCommissionForm((p) => ({ ...p, enabled: e.target.checked }))
                  }
                />
              </label>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">
                  Seller % override (blank = global)
                </div>
                <Input
                  value={commissionForm.sellerPercent}
                  onChange={(e) =>
                    setCommissionForm((p) => ({ ...p, sellerPercent: e.target.value }))
                  }
                  placeholder="e.g. 5"
                  inputMode="decimal"
                />
                <div className="px-1 text-[10px] text-text-muted">Direct profit percentage the user gets from their own sales.</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">
                  Upline % override (blank = global)
                </div>
                <Input
                  value={commissionForm.uplinePercent}
                  onChange={(e) =>
                    setCommissionForm((p) => ({ ...p, uplinePercent: e.target.value }))
                  }
                  placeholder="e.g. 2"
                  inputMode="decimal"
                />
                <div className="px-1 text-[10px] text-text-muted">Percentage the person who referred this user will earn.</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCommissionUser(null)}>
                Cancel
              </Button>
              <Button onClick={saveCommission} disabled={commissionSaving}>
                {commissionSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {msgUser ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-sm"
          onClick={() => setMsgUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-0 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary/5 p-6 border-b border-border/50">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
                     <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                     <div className="text-base font-bold text-text">Send Direct Message</div>
                     <div className="text-xs text-text-muted">Targeted User: {msgUser.phone} ({msgUser.name || "N/A"})</div>
                  </div>
               </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Message Title</div>
                <Input
                  value={msgForm.title}
                  onChange={(e) => setMsgForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Notification Header"
                  className="h-12 text-sm"
                />
                <div className="px-1 text-[10px] text-text-muted">Main headline of the notification. User will see this first.</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Message Content</div>
                <textarea
                  className="w-full min-h-[120px] rounded-2xl border border-border bg-muted/20 p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                  value={msgForm.message}
                  onChange={(e) => setMsgForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Type your message to the user here..."
                />
                <div className="px-1 text-[10px] text-text-muted">This message will appear in the user's notification center.</div>
              </div>
            </div>

            <div className="bg-muted/30 p-6 flex justify-end gap-3 border-t border-border/50">
              <Button variant="secondary" onClick={() => setMsgUser(null)} className="rounded-xl h-11 px-6 font-semibold">
                Discard
              </Button>
              <Button onClick={sendDirectMessage} disabled={msgSending} className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 gap-2">
                {msgSending ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {kycUser ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-sm overflow-y-auto"
          onClick={() => setKycUser(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-border bg-card p-0 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-primary/5 p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-text">Verify User KYC</div>
                    <div className="text-xs text-text-muted">
                      User: {kycUser.name || "N/A"} ({kycUser.phone})
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold px-3 py-1 rounded bg-muted">
                  Current Status: <span className="uppercase text-primary">{kycUser.kycStatus}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
                  Uploaded Documents
                </div>
                {!kycUser.kycDocuments || kycUser.kycDocuments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-text-muted border border-dashed border-border rounded-2xl bg-muted/10">
                    No documents uploaded by the user yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kycUser.kycDocuments.map((doc, idx) => {
                      const typeLabel =
                        doc.docType === "aadhar_front"
                          ? "Aadhar Card Front"
                          : doc.docType === "aadhar_back"
                          ? "Aadhar Card Back"
                          : doc.docType === "pan_card"
                          ? "PAN Card"
                          : doc.docType === "selfie"
                          ? "Selfie with ID"
                          : doc.docType;

                      return (
                        <div
                          key={idx}
                          className="p-4 border border-border bg-muted/15 rounded-2xl flex flex-col justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-text">{typeLabel}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "N/A"}
                            </div>
                          </div>
                          
                          {doc.url ? (
                            <div className="mt-3">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                              >
                                View Full Size <ExternalLink className="h-3 w-3" />
                              </a>
                              <img
                                src={doc.url}
                                alt={typeLabel}
                                className="mt-2 w-full h-40 object-contain rounded-xl border border-border bg-black/40"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-[11px] text-rose-400 mt-2">
                              Document URL unavailable or secured
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {kycUser.kycStatus === "rejected" && kycUser.kycRejectionReason && (
                <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-2xl">
                  <div className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                    Previous Rejection Reason
                  </div>
                  <div className="text-sm text-text-muted mt-1">
                    {kycUser.kycRejectionReason}
                  </div>
                </div>
              )}

              <div className="border-t border-border/50 pt-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  Action Panel
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">
                    Rejection Reason (Required only if rejecting)
                  </div>
                  <Input
                    value={kycRejectReason}
                    onChange={(e) => setKycRejectReason(e.target.value)}
                    placeholder="Enter reason for rejecting the KYC (e.g. Photo blur, Details mismatch)"
                    className="h-12 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-6 flex justify-between items-center border-t border-border/50">
              <Button
                variant="secondary"
                onClick={() => setKycUser(null)}
                className="rounded-xl h-11 px-6 font-semibold"
              >
                Close
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={() => handleKycReview("rejected")}
                  disabled={kycSubmitting}
                  className="rounded-xl h-11 px-6 font-semibold"
                >
                  Reject KYC
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleKycReview("verified")}
                  disabled={kycSubmitting}
                  className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20"
                >
                  {kycSubmitting ? "Processing..." : "Approve & Verify"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
