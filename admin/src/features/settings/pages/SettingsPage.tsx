import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { AdminSettings } from "@/features/settings/settingsTypes";

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/settings")
      .then((res) => setSettings(res.data as AdminSettings))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put("/admin/settings", settings);
      setSettings(res.data as AdminSettings);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <div className="mt-1 text-sm text-text-muted">
            Configure limits, commissions, referrals and ads switches.
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!settings ? (
            <div className="text-sm text-text-muted">No settings loaded.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">
                  Max cards per user
                </div>
                <Input
                  type="number"
                  value={settings.maxCardsPerUser}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                    setSettings((s) =>
                      s ? { ...s, maxCardsPerUser: Math.max(0, Number(val || 0)) } : s,
                    )
                  }}
                  min={0}
                  onFocus={(e) => e.target.select()}
                />
                <div className="px-1 text-[10px] text-text-muted">How many virtual cards one person can create.</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">
                  Platform fee (%)
                </div>
                <Input
                  type="number"
                  value={settings.platformFeePercent}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                    setSettings((s) =>
                      s ? { ...s, platformFeePercent: Math.max(0, Number(val || 0)) } : s,
                    )
                  }}
                  min={0}
                  onFocus={(e) => e.target.select()}
                />
                <div className="px-1 text-[10px] text-text-muted">Charge on transactions or services.</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-text-muted">
                  Referral reward (%)
                </div>
                <Input
                  type="number"
                  value={settings.referralRewardPercent}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                    setSettings((s) =>
                      s ? { ...s, referralRewardPercent: Math.max(0, Number(val || 0)) } : s,
                    )
                  }}
                  min={0}
                  onFocus={(e) => e.target.select()}
                />
                <div className="px-1 text-[10px] text-text-muted">Bonus shared with referrers on user activity.</div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Two-tier commission</div>
                <div className="mt-1 text-sm text-text-muted">
                  Seller gets guaranteed commission; upline gets bonus (max 2 levels only).
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm md:col-span-2">
                    Enable commission system
                    <input
                      type="checkbox"
                      checked={settings.commissions.enabled}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  enabled: e.target.checked,
                                },
                              }
                            : s,
                        )
                      }
                    />
                  </label>

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Minimum transaction amount (INR)
                    </div>
                    <Input
                      type="number"
                      value={settings.commissions.minTransactionAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  minTransactionAmount: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Ignore deals below this price for commission logic.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Seller commission (%)
                    </div>
                    <Input
                      type="number"
                      value={settings.commissions.sellerPercent}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  sellerPercent: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Profit earned by the direct seller.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Upline bonus (%)
                    </div>
                    <Input
                      type="number"
                      value={settings.commissions.uplinePercent}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  uplinePercent: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Bonus for the immediate upline person.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Level 1 referral commission (%)
                    </div>
                    <Input
                      type="number"
                      value={settings.commissions.level1Percent}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  level1Percent: Math.max(0, Number(e.target.value || 0)),
                                },
                              }
                            : s,
                        )
                      }
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Commission for direct referral levels.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Level 2 referral commission (%)
                    </div>
                    <Input
                      type="number"
                      value={settings.commissions.level2Percent}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                commissions: {
                                  ...s.commissions,
                                  level2Percent: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Commission for second-level referrals.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Withdrawals</div>
                <div className="mt-1 text-sm text-text-muted">
                  Enable/disable withdrawals and set a minimum threshold.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm md:col-span-2">
                    Enable withdrawals
                    <input
                      type="checkbox"
                      checked={settings.payouts.enabled}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                payouts: { ...s.payouts, enabled: e.target.checked },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Minimum withdraw amount (INR)
                    </div>
                    <Input
                      type="number"
                      value={settings.payouts.minWithdrawAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                payouts: {
                                  ...s.payouts,
                                  minWithdrawAmount: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">User cannot withdraw if balance is lower than this.</div>
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                    Enable auto payout
                    <input
                      type="checkbox"
                      checked={settings.payouts.autoPayoutEnabled}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                payouts: {
                                  ...s.payouts,
                                  autoPayoutEnabled: e.target.checked,
                                },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">
                      Payout provider
                    </div>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                      value={settings.payouts.defaultProvider}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                payouts: {
                                  ...s.payouts,
                                  defaultProvider: e.target.value as "manual" | "razorpay" | "cashfree",
                                },
                              }
                            : s,
                        )
                      }
                    >
                      <option value="manual">Manual</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="cashfree">Cashfree</option>
                    </select>
                    <div className="px-1 text-[10px] text-text-muted">Method used to process payments.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/20 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Task Rewards</div>
                <div className="mt-1 text-sm text-text-muted">
                  Configure daily cap and per-task rewards for quiz, spin, and ad earnings.
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Daily cap (INR)</div>
                    <Input
                      type="number"
                      value={settings.earnzone.dailyLimitInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  dailyLimitInr: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Max total INR a user can earn per day from tasks.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Quiz reward (INR)</div>
                    <Input
                      type="number"
                      value={settings.earnzone.quiz.rewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  quiz: {
                                    ...s.earnzone.quiz,
                                    rewardInr: Math.max(0, Number(val || 0)),
                                  },
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Spin reward (INR)</div>
                    <Input
                      type="number"
                      value={settings.earnzone.spin.rewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  spin: {
                                    ...s.earnzone.spin,
                                    rewardInr: Math.max(0, Number(val || 0)),
                                  },
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Ad reward (INR)</div>
                    <Input
                      type="number"
                      value={settings.earnzone.ads.rewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  ads: {
                                    ...s.earnzone.ads,
                                    rewardInr: Math.max(0, Number(val || 0)),
                                  },
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Engagement reward (INR)</div>
                    <Input
                      type="number"
                      value={settings.earnzone.engagement.rewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  engagement: {
                                    ...s.earnzone.engagement,
                                    rewardInr: Math.max(0, Number(val || 0)),
                                  },
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                    Auto validate rewards
                    <input
                      type="checkbox"
                      checked={settings.earnzone.autoValidateRewards}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                earnzone: {
                                  ...s.earnzone,
                                  autoValidateRewards: e.target.checked,
                                },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Referral Attribution</div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Attribution window (days)</div>
                    <Input
                      type="number"
                      value={settings.referral.attributionWindowDays}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                referral: {
                                  ...s.referral,
                                  attributionWindowDays: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Days a referral remains valid after a link click.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Level 1 install reward</div>
                    <Input
                      type="number"
                      value={settings.referral.level1InstallRewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                referral: {
                                  ...s.referral,
                                  level1InstallRewardInr: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Bonus for direct install referral.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Level 2 install reward</div>
                    <Input
                      type="number"
                      value={settings.referral.level2InstallRewardInr}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                referral: {
                                  ...s.referral,
                                  level2InstallRewardInr: Math.max(0, Number(val || 0)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Bonus for friend's friend install.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Fraud Controls</div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Max accounts per device</div>
                    <Input
                      type="number"
                      value={settings.fraud.maxAccountsPerDevice}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                fraud: {
                                  ...s.fraud,
                                  maxAccountsPerDevice: Math.max(0, Number(val || 1)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Stop users from making multiple IDs.</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-text-muted">Max accounts per IP/day</div>
                    <Input
                      type="number"
                      value={settings.fraud.maxAccountsPerIpPerDay}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?=\d)/, "");
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                fraud: {
                                  ...s.fraud,
                                  maxAccountsPerIpPerDay: Math.max(0, Number(val || 1)),
                                },
                              }
                            : s,
                        )
                      }}
                      min={0}
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="px-1 text-[10px] text-text-muted">Limit account creation from same connection.</div>
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                    Prevent self-referrals
                    <input
                      type="checkbox"
                      checked={settings.fraud.preventSelfReferral}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                fraud: {
                                  ...s.fraud,
                                  preventSelfReferral: e.target.checked,
                                },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                    Unique install per device
                    <input
                      type="checkbox"
                      checked={settings.fraud.requireUniqueInstallPerDevice}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                fraud: {
                                  ...s.fraud,
                                  requireUniqueInstallPerDevice: e.target.checked,
                                },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="text-sm font-semibold">Ads</div>
                <div className="mt-3 space-y-2 text-sm">
                  <label className="flex items-center justify-between">
                    Enabled
                    <input
                      type="checkbox"
                      checked={settings.ads.enabled}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, ads: { ...s.ads, enabled: e.target.checked } } : s,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    Banner
                    <input
                      type="checkbox"
                      checked={settings.ads.banner}
                      onChange={(e) =>
                        setSettings((s) =>
                          s ? { ...s, ads: { ...s.ads, banner: e.target.checked } } : s,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    Interstitial
                    <input
                      type="checkbox"
                      checked={settings.ads.interstitial}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? {
                                ...s,
                                ads: { ...s.ads, interstitial: e.target.checked },
                              }
                            : s,
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    Rewarded
                    <input
                      type="checkbox"
                      checked={settings.ads.rewarded}
                      onChange={(e) =>
                        setSettings((s) =>
                          s
                            ? { ...s, ads: { ...s.ads, rewarded: e.target.checked } }
                            : s,
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Reset
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
