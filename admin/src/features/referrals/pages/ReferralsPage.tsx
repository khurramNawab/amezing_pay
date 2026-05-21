import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function ReferralsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals</CardTitle>
        <div className="mt-1 text-sm text-text-muted">
          View referral relationships, commissions and fraud flags.
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <EmptyState
          title="Referral tree view"
          description="Backend endpoints are scaffolded to power tree/graph UI and fraud heuristics."
        />
      </CardContent>
    </Card>
  );
}

