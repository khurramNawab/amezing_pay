import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableHead, TableRow } from "@/components/ui/Table";
import type { AdminProduct } from "@/features/products/productTypes";

type EditState = {
  open: boolean;
  mode: "create" | "edit";
  item?: AdminProduct;
};

type FormState = {
  title: string;
  description: string;
  price: number;
  commission: string;
  originalPrice: number;
  category: string;
  imageUrl: string;
  imageUrls: string[];
  source: "affiliate" | "internal";
  platformName: string;
  platformColor: string;
  trustBadge: string;
  shareUrl: string;
  placements: Array<"high_commission" | "digital_store" | "trending_affiliate">;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  price: 0,
  commission: "",
  originalPrice: 0,
  category: "general",
  imageUrl: "",
  imageUrls: ["", "", ""],
  source: "internal",
  platformName: "Amezing Pay",
  platformColor: "#6366F1",
  trustBadge: "",
  shareUrl: "",
  placements: ["high_commission", "digital_store"],
  sortOrder: 0,
  isActive: true,
};

export function ProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState>({ open: false, mode: "create" });
  const [form, setForm] = useState<FormState>(emptyForm);

  const refresh = () => {
    setLoading(true);
    api
      .get("/admin/products")
      .then((res) => setItems(res.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEdit({ open: true, mode: "create" });
  };

  const openEdit = (item: AdminProduct) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      price: Number(item.price || 0),
      commission: item.commission || "",
      originalPrice: Number(item.originalPrice || 0),
      category: item.category || "general",
      imageUrl: item.imageUrl || "",
      imageUrls: Array.isArray(item.imageUrls) ? [...item.imageUrls, "", "", ""].slice(0, 3) : ["", "", ""],
      source: item.source || "internal",
      platformName: item.platformName || "",
      platformColor: item.platformColor || "",
      trustBadge: item.trustBadge || "",
      shareUrl: item.shareUrl || "",
      placements: Array.isArray(item.placements) ? item.placements : [],
      sortOrder: Number(item.sortOrder || 0),
      isActive: !!item.isActive,
    });
    setEdit({ open: true, mode: "edit", item });
  };

  const togglePlacement = (p: "high_commission" | "digital_store" | "trending_affiliate") => {
    setForm((prev) => {
      const exists = prev.placements.includes(p);
      return {
        ...prev,
        placements: exists ? prev.placements.filter((x) => x !== p) : [...prev.placements, p],
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "imageUrl" | 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading or localized state if needed
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await api.post("/uploads/image", { 
          file: reader.result,
          folder: "products"
        });
        const url = res.data.url;
        
        setForm((p) => {
          if (field === "imageUrl") return { ...p, imageUrl: url };
          const newUrls = [...p.imageUrls];
          newUrls[field] = url;
          return { ...p, imageUrls: newUrls };
        });
      } catch (err: any) {
        console.error("Upload failed", err);
        const msg = err.response?.data?.message || err.message || "Please check image size and your internet connection.";
        alert("Upload failed: " + msg);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Ensure at least some default commission text if empty for internal products
      const finalForm = {
        ...form,
        commission: form.commission.trim() || (form.source === 'internal' ? '0' : 'Affiliate Deal')
      };

      if (edit.mode === "create") {
        await api.post("/admin/products", finalForm);
        alert("Product created successfully! It should now be visible in the app.");
      } else if (edit.item?._id) {
        await api.put(`/admin/products/${edit.item._id}`, finalForm);
        alert("Product updated successfully!");
      }
      setEdit({ open: false, mode: "create" });
      refresh();
    } catch (err: any) {
      console.error("Save failed", err);
      const msg = err.response?.data?.message || "Failed to save product. Please check all fields.";
      alert("Error: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: AdminProduct) => {
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete "${item.title}"?`);
    if (!ok) return;
    await api.delete(`/admin/products/${item._id}`);
    refresh();
  };

  const toggleVisibility = async (item: AdminProduct) => {
    await api.patch(`/admin/products/${item._id}/visibility`, { isActive: !item.isActive });
    setItems((prev) => prev.map((x) => (x._id === item._id ? { ...x, isActive: !x.isActive } : x)));
  };

  const activeCount = useMemo(() => items.filter((x) => x.isActive).length, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <div className="mt-1 text-sm text-text-muted">
              Manage Digital Store, High Commission Services and Trending Affiliate sections.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">{activeCount} active</Badge>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Table>
        <TableHead>
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Placements</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Actions</div>
        </TableHead>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          items.map((item) => (
            <TableRow key={item._id}>
              <div className="col-span-4 min-w-0">
                <div className="truncate font-medium">{item.title}</div>
                <div className="truncate text-xs text-text-muted">{item.commission} · Sort {item.sortOrder}</div>
              </div>
              <div className="col-span-2">
                <Badge variant={item.source === "affiliate" ? "warning" : "default"}>{item.source}</Badge>
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {(item.placements || []).map((p) => (
                    <Badge key={p} variant="default">{p}</Badge>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                {item.isActive ? <Badge variant="success">Visible</Badge> : <Badge variant="danger">Hidden</Badge>}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleVisibility(item)}>
                  {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableRow>
          ))
        )}
      </Table>

      {edit.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:p-6 backdrop-blur-sm" onClick={() => setEdit({ open: false, mode: "create" })}>
          <div 
            className="relative flex h-full max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/40 p-6 px-8">
              <div className="space-y-1">
                <div className="text-lg font-bold text-text">
                  {edit.mode === "create" ? "Add New Product" : "Edit Product Details"}
                </div>
                <div className="text-xs text-text-muted">Fill in the details to update the marketplace listings.</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEdit({ open: false, mode: "create" })} className="rounded-full h-8 w-8 p-0">×</Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 pt-4 space-y-8 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-border-hover">
              {/* Mode Selection Tabs */}
              <div className="sticky top-0 z-10 -mx-8 -mt-4 mb-6 border-b border-border/40 bg-card/80 p-4 px-8 backdrop-blur-md">
                <div className="flex rounded-2xl bg-muted/20 p-1.5">
                  {["internal", "affiliate"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, source: s as any }))}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
                        form.source === s
                          ? "bg-card text-primary shadow-lg shadow-primary/5 ring-1 ring-border/50"
                          : "text-text-muted hover:text-text hover:bg-muted/30"
                      }`}
                    >
                      <div className="capitalize">{s} Product</div>
                      {form.source === s && (
                        <div className="mt-0.5 text-[9px] font-medium text-text-muted/60">
                          {s === "internal" ? "Marketplace & Direct Sales" : "External Referral Links"}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared Section: Basic Info */}
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60"></div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Product Basics
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60"></div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Input placeholder="Product title, e.g. Resume Kit" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-12 text-base" />
                    <div className="px-1 text-[10px] text-text-muted">Type the full name of the product as it should appear in the shop.</div>
                  </div>
                  <div className="space-y-1.5">
                    <Input placeholder="Category, e.g. business, course" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="h-12" />
                    <div className="px-1 text-[10px] text-text-muted">Tags help users find your product faster (e.g., templates, course).</div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Input placeholder="Short description for users" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="h-12" />
                    <div className="px-1 text-[10px] text-text-muted">Write a catchy 1-line description to grab user attention.</div>
                  </div>
                </div>
              </div>

              {/* Internal Specific: Pricing & Buying */}
              {form.source === "internal" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60"></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Pricing & Sales Options
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Input 
                        type="number" 
                        min={0} 
                        placeholder="Selling Price (INR)" 
                        value={form.price} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+(?=\d)/, "");
                          setForm((p) => ({ ...p, price: Math.max(0, Number(val || 0)) }))
                        }} 
                        onFocus={(e) => e.target.select()}
                        className="h-12 font-bold text-primary"
                      />
                      <div className="px-1 text-[10px] text-text-muted">This is the final price the buyer will pay in the app.</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input 
                        type="number" 
                        min={0} 
                        placeholder="MRP / Original Price" 
                        value={form.originalPrice} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+(?=\d)/, "");
                          setForm((p) => ({ ...p, originalPrice: Math.max(0, Number(val || 0)) }))
                        }} 
                        onFocus={(e) => e.target.select()}
                        className="h-12"
                      />
                      <div className="px-1 text-[10px] text-text-muted">The higher price that will be shown with a strike-through (Cut price).</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input 
                        placeholder="Commission Label, e.g. Extra 5% off" 
                        value={form.commission} 
                        onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))} 
                        className="h-12"
                      />
                      <div className="px-1 text-[10px] text-text-muted">What badge or discount text should show on the product card.</div>
                    </div>
                    
                    <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:col-span-1">
                       <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Plus className="h-5 w-5" />
                       </div>
                       <div className="flex-1">
                          <div className="text-xs font-bold uppercase tracking-tight">Direct Purchase</div>
                          <div className="text-[10px] leading-3 text-text-muted mt-0.5">Automated "Buy Now" & "Internal Payment" logic will be enabled for this item.</div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Affiliate Specific: Referral & Branding */}
              {form.source === "affiliate" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60"></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Affiliate Details
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-1.5">
                      <Input placeholder="Affiliate Share URL (e.g. Myntra/Amazon link)" value={form.shareUrl} onChange={(e) => setForm((p) => ({ ...p, shareUrl: e.target.value }))} className="h-12 font-medium text-primary ring-offset-2 focus:ring-primary" />
                      <div className="px-1 text-[10px] text-text-muted font-medium">Important: Paste the specific affiliate referral link for this product.</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input placeholder="Commission Text, e.g. 5% Commission" value={form.commission} onChange={(e) => setForm((p) => ({ ...p, commission: e.target.value }))} className="h-12" />
                      <div className="px-1 text-[10px] text-text-muted">Define the earning percentage or amount to show users.</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input placeholder="Platform Name, e.g. Amazon" value={form.platformName} onChange={(e) => setForm((p) => ({ ...p, platformName: e.target.value }))} className="h-12" />
                      <div className="px-1 text-[10px] text-text-muted">The store name where this link leads (e.g., Myntra, Flipkart).</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input placeholder="Brand Color HEX, e.g. #FF9900" value={form.platformColor} onChange={(e) => setForm((p) => ({ ...p, platformColor: e.target.value }))} className="h-12" />
                      <div className="px-1 text-[10px] text-text-muted">Color of the shop badge (matches the store's brand).</div>
                    </div>
                    <div className="space-y-1.5">
                      <Input placeholder="Trust Badge, e.g. Verified by Myntra" value={form.trustBadge} onChange={(e) => setForm((p) => ({ ...p, trustBadge: e.target.value }))} className="h-12" />
                      <div className="px-1 text-[10px] text-text-muted">Small label to increase user confidence in the deal.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Media Section: Photo Uploads for Internal, Links for Affiliate */}
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60"></div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {form.source === 'internal' ? 'Upload Product Photos' : 'External Image Links'}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60"></div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex gap-4">
                      <Input placeholder="Main Image URL" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} className="h-12 flex-1" />
                      {form.source === 'internal' && (
                        <div className="relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'imageUrl')} accept="image/*" />
                          <button type="button" className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-md">Choose Photo</button>
                        </div>
                      )}
                    </div>
                    <div className="px-1 text-[10px] text-text-muted">Primary photo that shows in lists. {form.source === 'internal' ? 'Upload from device for direct products.' : 'Paste image link for affiliate items.'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <Input placeholder="Gallery Image 2" value={form.imageUrls[1]} onChange={(e) => setForm((p) => { const n = [...p.imageUrls]; n[1] = e.target.value; return {...p, imageUrls: n} })} className="h-12 flex-1" />
                      {form.source === 'internal' && (
                        <div className="relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 1)} accept="image/*" />
                          <button type="button" className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center hover:bg-muted/60"><Plus className="h-4 w-4"/></button>
                        </div>
                      )}
                    </div>
                    <div className="px-1 text-[10px] text-text-muted">Second gallery photo (Optional).</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <Input placeholder="Gallery Image 3" value={form.imageUrls[2]} onChange={(e) => setForm((p) => { const n = [...p.imageUrls]; n[2] = e.target.value; return {...p, imageUrls: n} })} className="h-12 flex-1" />
                      {form.source === 'internal' && (
                        <div className="relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 2)} accept="image/*" />
                          <button type="button" className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center hover:bg-muted/60"><Plus className="h-4 w-4"/></button>
                        </div>
                      )}
                    </div>
                    <div className="px-1 text-[10px] text-text-muted">Third gallery photo (Optional).</div>
                  </div>
                </div>
              </div>

              {/* Placements & Metadata */}
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60"></div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Final Listing Settings
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60"></div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 items-start">
                    <div className="space-y-1.5">
                      <Input 
                        type="number" 
                        min={0} 
                        placeholder="Listing Sort Order" 
                        value={form.sortOrder} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+(?=\d)/, "");
                          setForm((p) => ({ ...p, sortOrder: Math.max(0, Number(val || 0)) }))
                        }} 
                        onFocus={(e) => e.target.select()}
                        className="h-12"
                      />
                      <div className="px-1 text-[10px] text-text-muted">Lower numbers show first (e.g., 0 is the top of the list).</div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <div 
                        className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/10 p-3 h-12 px-5 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                      >
                        <div 
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ${
                            form.isActive ? "bg-primary shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "bg-muted"
                          }`}
                        >
                          <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ${
                            form.isActive ? "translate-x-5 shadow-sm" : "translate-x-0"
                          }`} />
                        </div>
                        <div className="text-sm font-bold truncate select-none">Visible to users</div>
                      </div>
                      <div className="px-1 text-[10px] text-text-muted font-medium">By default this is ON to show product in app.</div>
                    </div>
                  </div>


                  <div>
                    <div className="mb-3 text-[10px] font-bold text-text-muted uppercase tracking-tight">Active Placements</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { key: "high_commission", title: "High Commission", desc: "Top Banner" },
                        { key: "digital_store", title: "Digital Store", desc: "Marketplace" },
                        { key: "trending_affiliate", title: "Trending deals", desc: "Affiliate Section" },
                      ].map((item) => {
                        const active = form.placements.includes(item.key as any);
                        return (
                          <div 
                            key={item.key}
                            onClick={() => togglePlacement(item.key as any)}
                            className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                              active
                                ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                : "border-border/60 bg-card/50 hover:border-primary/40"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className={`text-xs font-bold truncate ${active ? "text-primary" : "text-text"}`}>
                                {item.title}
                              </div>
                              <div className="text-[9px] text-text-muted truncate">{item.desc}</div>
                            </div>
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                              active ? "border-primary bg-primary text-white scale-110 shadow-sm" : "border-border/40"
                            }`}>
                              {active && <Plus className="h-3 w-3 stroke-[4]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/40 bg-card/90 p-8 pt-6 backdrop-blur-md">
              <Button variant="secondary" onClick={() => setEdit({ open: false, mode: "create" })} className="px-8 h-12 rounded-2xl font-bold">Cancel</Button>
              <Button onClick={save} disabled={saving || !form.title.trim()} className="px-10 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20">
                {saving ? "Saving..." : (edit.mode === 'create' ? "Create Product" : "Update Changes")}
              </Button>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
