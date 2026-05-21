import { useEffect, useState } from "react";
import { Users, IndianRupee, CreditCard, Share2, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { OverviewStats } from "@/features/overview/overviewTypes";
import { Badge } from "@/components/ui/Badge";

function Stat({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/analytics/overview?range=30d")
      .then((res) => setData(res.data as OverviewStats))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total Users"
          value={`${totals?.totalUsers ?? 0}`}
          icon={Users}
          hint={`${totals?.activeUsers ?? 0} active`}
        />
        <Stat
          label="Total Revenue"
          value={`₹${(totals?.totalRevenue ?? 0).toLocaleString()}`}
          icon={IndianRupee}
          hint={`Seller ₹${(totals?.sellerEarnings ?? 0).toLocaleString()} • Upline ₹${(
            totals?.uplineEarnings ?? 0
          ).toLocaleString()}`}
        />
        <Stat
          label="Cards Created"
          value={`${totals?.cardsCreated ?? 0}`}
          icon={CreditCard}
        />
        <Stat
          label="Referrals"
          value={`${totals?.totalReferrals ?? 0}`}
          icon={Share2}
          hint={`Ads ₹${(totals?.adsRevenue ?? 0).toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Analytics (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-border bg-muted/20 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Trends</div>
                <Badge variant="default">Charts ready for Recharts</Badge>
              </div>
              <div className="mt-3 text-sm text-text-muted">
                API returns time-series arrays. Plug-in your preferred chart lib (Recharts/Chart.js)
                without changing the backend contract.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {(data?.recentTransactions || []).slice(0, 8).map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="truncate text-xs text-text-muted">
                      {t.userName || t.userPhone || "User"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-success">
                    +₹{t.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              {!data?.recentTransactions?.length ? (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-text-muted">
                  No transactions yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ads</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-warning/15 p-3 text-warning">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Ads Revenue Tracking</div>
                <div className="text-xs text-text-muted">
                  Connect AdMob/mediation or log manually via Ads module.
                </div>
              </div>
            </div>
            <Badge variant="default">Module ready</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
