import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

type AdsState = {
  enabled: boolean;
  banner: boolean;
  interstitial: boolean;
  rewarded: boolean;
  adsRevenue: number;
};

export function AdsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<AdsState | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/ads")
      .then((res) => setS(res.data as AdsState))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const res = await api.put("/admin/ads", s);
      setS(res.data as AdsState);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !s) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ads Management</CardTitle>
        <div className="mt-1 text-sm text-text-muted">
          Switch ad formats and track revenue (manual entry/API sync).
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!s ? (
          <div className="text-sm text-text-muted">No ads config loaded.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-semibold">Visibility</div>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center justify-between">
                  Enabled
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => setS((p) => (p ? { ...p, enabled: e.target.checked } : p))}
                  />
                </label>
                <label className="flex items-center justify-between">
                  Banner
                  <input
                    type="checkbox"
                    checked={s.banner}
                    onChange={(e) => setS((p) => (p ? { ...p, banner: e.target.checked } : p))}
                  />
                </label>
                <label className="flex items-center justify-between">
                  Interstitial
                  <input
                    type="checkbox"
                    checked={s.interstitial}
                    onChange={(e) => setS((p) => (p ? { ...p, interstitial: e.target.checked } : p))}
                  />
                </label>
                <label className="flex items-center justify-between">
                  Rewarded
                  <input
                    type="checkbox"
                    checked={s.rewarded}
                    onChange={(e) => setS((p) => (p ? { ...p, rewarded: e.target.checked } : p))}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-semibold">Revenue</div>
              <div className="mt-1 text-sm text-text-muted">Monthly / latest entry.</div>
              <div className="mt-3 space-y-1.5">
                <div className="text-xs font-medium text-text-muted">Ads revenue (INR)</div>
                <Input
                  type="number"
                  value={s.adsRevenue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                    setS((p) => (p ? { ...p, adsRevenue: Math.max(0, Number(val || 0)) } : p))
                  }}
                  min={0}
                  onFocus={(e) => e.target.select()}
                />
                <div className="px-1 text-[10px] text-text-muted">Total money earned from advertisements (Manual entry).</div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

