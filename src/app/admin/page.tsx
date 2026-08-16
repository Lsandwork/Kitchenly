import { redirect } from "next/navigation";
import { AdminPanelClient } from "@/components/admin/AdminPanelClient";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  try {
    const user = await requireAdmin();
    return <AdminPanelClient email={user.email} name={user.name} role={user.role} />;
  } catch {
    redirect("/login?next=/admin");
  }
}
