export type AdminRole = "super_admin" | "sub_admin";

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin";
  adminRole: AdminRole;
};

