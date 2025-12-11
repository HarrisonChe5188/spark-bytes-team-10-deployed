import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/admin-dashboard";
import { AdminHeader } from "@/components/admin-header";

export const metadata = {
  title: "Admin - Spark Bytes"
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
  const isAdmin =
    appMeta?.role === "admin" || userMeta?.is_admin === true;

  if (!isAdmin) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-4">
        <AdminHeader />
      </header>
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
          </div>
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
}