import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";

type MediaRow = {
  _id: string;
  url: string;
  publicId: string;
  folder: string;
  createdAt: string;
};

export function MediaPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaRow[]>([]);

  const refresh = () => {
    setLoading(true);
    api
      .get("/admin/media")
      .then((res) => setItems(res.data.items || res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (m: MediaRow) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete asset? This will remove the Cloudinary resource.");
    if (!ok) return;
    await api.delete(`/admin/media/${m._id}`);
    refresh();
  };

  const count = useMemo(() => items.length, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Media & Storage</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Cloudinary assets uploaded via platform (templates, cards, profile photos).
            </div>
          </div>
          <div className="text-sm text-text-muted">{count} items</div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-text-muted">
            For production, connect Cloudinary Admin API to list usage/billing and delete unused resources safely.
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <div className="col-span-5">Asset</div>
          <div className="col-span-5">Public ID</div>
          <div className="col-span-2 text-right">Actions</div>
        </TableHead>
        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          items.map((m) => (
            <TableRow key={m._id}>
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl border border-border bg-muted/30 overflow-hidden grid place-items-center">
                  {m.url ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-text-muted" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.folder}</div>
                  <div className="truncate text-xs text-text-muted">{m.url}</div>
                </div>
              </div>
              <div className="col-span-5 truncate text-xs text-text-muted">{m.publicId}</div>
              <div className="col-span-2 flex justify-end">
                <Button variant="danger" size="sm" onClick={() => remove(m)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}
        {!loading && items.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">No media assets tracked yet.</div>
        ) : null}
      </Table>
    </div>
  );
}

