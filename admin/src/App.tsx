import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RequireAdminAuth } from "@/features/auth/RequireAdminAuth";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { OverviewPage } from "@/features/overview/pages/OverviewPage";
import { UsersPage } from "@/features/users/pages/UsersPage";
import { CardsPage } from "@/features/cards/pages/CardsPage";
import { TemplatesPage } from "@/features/templates/pages/TemplatesPage";
import { TransactionsPage } from "@/features/transactions/pages/TransactionsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { ReferralsPage } from "@/features/referrals/pages/ReferralsPage";
import { AdsPage } from "@/features/ads/pages/AdsPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";
import { MediaPage } from "@/features/media/pages/MediaPage";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { WithdrawalsPage } from "@/features/withdrawals/pages/WithdrawalsPage";
import { CardDetailPage } from "@/features/cards/pages/CardDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAdminAuth>
            <AdminLayout />
          </RequireAdminAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="ads" element={<AdsPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="card/:id" element={<CardDetailPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
