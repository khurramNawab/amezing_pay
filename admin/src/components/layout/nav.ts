import {
  LayoutDashboard,
  Users,
  CreditCard,
  LayoutTemplate,
  Wallet,
  Share2,
  Megaphone,
  Image as ImageIcon,
  Bell,
  Settings,
  ShoppingBag,
} from "lucide-react";

export const navItems = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Users", to: "/users", icon: Users },
  { label: "Cards", to: "/cards", icon: CreditCard },
  { label: "Transactions", to: "/transactions", icon: Wallet },
  { label: "Payouts", to: "/withdrawals", icon: CreditCard },
  { label: "Referrals", to: "/referrals", icon: Share2 },
  { label: "Products", to: "/products", icon: ShoppingBag },
  { label: "Ads", to: "/ads", icon: Megaphone },
  { label: "Media", to: "/media", icon: ImageIcon },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;
