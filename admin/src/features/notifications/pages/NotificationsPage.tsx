import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Trash2, Edit2, Send, Save, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", message: "" });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/notifications");
      setHistory(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const send = async () => {
    setSending(true);
    try {
      const res = await api.post("/admin/notifications", { title, message });
      setTitle("");
      setMessage("");
      setHistory([res.data, ...history]);
      alert("Broadcast sent successfully!");
    } finally {
      setSending(false);
    }
  };

  const deleteNotif = async (id: string) => {
    if (!window.confirm("Are you sure? This will hide the notification for ALL users.")) return;
    await api.delete(`/admin/notifications/${id}`);
    setHistory(history.filter((h) => h._id !== id));
  };

  const startEdit = (h: any) => {
    setEditingId(h._id);
    setEditForm({ title: h.title, message: h.message });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await api.put(`/admin/notifications/${editingId}`, editForm);
    setHistory(history.map((h) => (h._id === editingId ? { ...h, ...editForm } : h)));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send New Broadcast</CardTitle>
          <div className="mt-1 text-sm text-text-muted">
            Blast an announcement or offer to all active users instantly.
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Broadcast Title</div>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. MEGA OFFERS: FLAT 50% OFF" 
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Message Body</div>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement details here..."
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={send} 
                disabled={sending || !title.trim() || !message.trim()}
                className="rounded-xl h-12 px-8 font-bold gap-2 shadow-lg shadow-primary/20"
              >
                {sending ? "Sending..." : <><Send className="h-4 w-4" /> Blast Message</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
          <div className="text-xs text-text-muted">History of messages sent to all or specific users.</div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-10 grid place-items-center"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h._id} className="group relative rounded-2xl border border-border bg-card/50 hover:bg-card p-5 transition-all">
                  {editingId === h._id ? (
                    <div className="space-y-3">
                      <Input 
                        value={editForm.title} 
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="font-bold"
                      />
                      <textarea
                        className="w-full min-h-[80px] rounded-xl border border-border bg-muted/20 p-3 text-sm outline-none resize-none"
                        value={editForm.message}
                        onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}><X className="h-4 w-4" /> Cancel</Button>
                        <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4" /> Save Changes</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-bold text-text">{h.title}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            {new Date(h.createdAt).toLocaleString()} • {h.targetUser ? `Sent to ${h.targetUser.phone}` : "Global Broadcast"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(h)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10" onClick={() => deleteNotif(h._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="text-xs text-text-muted leading-relaxed line-clamp-2">{h.message}</div>
                    </>
                  )}
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-10 text-center text-sm text-text-muted">No history found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

