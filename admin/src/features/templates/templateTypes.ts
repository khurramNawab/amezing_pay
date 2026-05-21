export type TemplateCategory = "business" | "personal" | "premium" | "other";

export type AdminTemplate = {
  _id: string;
  name: string;
  styleType: string;
  isPremium: boolean;
  isActive: boolean;
  thumbnailUrl?: string;
  category?: TemplateCategory;
  priceInr?: number;
  createdAt: string;
};

