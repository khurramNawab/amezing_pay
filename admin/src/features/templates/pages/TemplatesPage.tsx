import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, EyeOff, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";
import type { AdminTemplate } from "@/features/templates/templateTypes";

type EditState = {
  open: boolean;
  mode: "create" | "edit";
  template?: AdminTemplate;
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function TemplatesPage() {
  const [items, setItems] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>({ open: false, mode: "create" });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    styleType: "",
    isPremium: false,
    isActive: true,
    category: "business",
    priceInr: 0,
    thumbnailUrl: "",
  });

  const refresh = () => {
    setLoading(true);
    api
      .get("/admin/templates")
      .then((res) => setItems(res.data.items || res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setForm({
      name: "",
      styleType: "",
      isPremium: false,
      isActive: true,
      category: "business",
      priceInr: 0,
      thumbnailUrl: "",
    });
    setEdit({ open: true, mode: "create" });
  };

  const openEdit = (t: AdminTemplate) => {
    setForm({
      name: t.name || "",
      styleType: t.styleType || "",
      isPremium: !!t.isPremium,
      isActive: !!t.isActive,
      category: (t.category as string) || "business",
      priceInr: t.priceInr || 0,
      thumbnailUrl: t.thumbnailUrl || "",
    });
    setEdit({ open: true, mode: "edit", template: t });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (edit.mode === "create") {
        await api.post("/admin/templates", form);
      } else if (edit.template?._id) {
        await api.put(`/admin/templates/${edit.template._id}`, form);
      }
      setEdit({ open: false, mode: "create" });
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: AdminTemplate) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete template "${t.name}"?`);
    if (!ok) return;
    await api.delete(`/admin/templates/${t._id}`);
    refresh();
  };

  const toggleVisibility = async (t: AdminTemplate) => {
    await api.patch(`/admin/templates/${t._id}/visibility`, { isActive: !t.isActive });
    setItems((prev) => prev.map((x) => (x._id === t._id ? { ...x, isActive: !t.isActive } : x)));
  };

  const uploadThumb = async (file: File) => {
    const dataUri = await toBase64(file);
    const res = await api.post("/uploads/image", { file: dataUri, folder: "admin_templates" });
    const url = res.data?.url || "";
    setForm((p) => ({ ...p, thumbnailUrl: url }));
  };

  const activeCount = useMemo(() => items.filter((x) => x.isActive).length, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Templates</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Add/edit templates, pricing, categories and visibility.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">{activeCount} active</Badge>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Table>
        <TableHead>
          <div className="col-span-4">Template</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Pricing</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Actions</div>
        </TableHead>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          items.map((t) => (
            <TableRow key={t._id}>
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl border border-border bg-muted/30 overflow-hidden grid place-items-center">
                  {t.thumbnailUrl ? (
                    <img src={t.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-text-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="truncate text-xs text-text-muted">{t.styleType}</div>
                </div>
                {t.isPremium ? <Badge className="ml-auto" variant="warning">Premium</Badge> : null}
              </div>
              <div className="col-span-2">
                <Badge variant="default">{t.category || "business"}</Badge>
              </div>
              <div className="col-span-2">
                {t.isPremium ? (
                  <div className="font-medium">₹{(t.priceInr || 0).toLocaleString()}</div>
                ) : (
                  <Badge variant="success">Free</Badge>
                )}
              </div>
              <div className="col-span-2">
                {t.isActive ? <Badge variant="success">Visible</Badge> : <Badge variant="danger">Hidden</Badge>}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleVisibility(t)} title="Toggle visibility">
                  {t.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(t)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(t)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}

        {!loading && items.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">No templates.</div>
        ) : null}
      </Table>

      {edit.open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setEdit({ open: false, mode: "create" })}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {edit.mode === "create" ? "Create template" : "Edit template"}
              </div>
              <Button variant="ghost" onClick={() => setEdit({ open: false, mode: "create" })}>
                Close
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">Name</div>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">styleType</div>
                <Input value={form.styleType} onChange={(e) => setForm((p) => ({ ...p, styleType: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">Category</div>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="premium">Premium</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">Price (INR)</div>
                <Input
                  type="number"
                  value={form.priceInr}
                  onChange={(e) => setForm((p) => ({ ...p, priceInr: Number(e.target.value || 0) }))}
                />
                <div className="text-xs text-text-muted">
                  Set `isPremium=true` to enable pricing.
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPremium}
                  onChange={(e) => setForm((p) => ({ ...p, isPremium: e.target.checked }))}
                />
                Premium
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Visible to users
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Thumbnail</div>
                  <div className="text-xs text-text-muted">
                    Upload a preview image (stored via Cloudinary).
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                  <ImageIcon className="h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadThumb(file);
                    }}
                  />
                </label>
              </div>
              {form.thumbnailUrl ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                  <img src={form.thumbnailUrl} alt="" className="h-44 w-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit({ open: false, mode: "create" })}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !form.name.trim() || !form.styleType.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

