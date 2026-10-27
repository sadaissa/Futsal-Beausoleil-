import { requireAdmin } from "@/lib/guards";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

/** Toutes les pages ADMIN : rôle revérifié en base, en plus du middleware. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
