import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyReservations from "@/components/my-reservations";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Saved - Spark Bytes",
  description: "View your saved posts",
};

export default async function ReservationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-black dark:to-red-950 flex flex-col">
      <header className="pt-6 px-6 sm:pt-6 sm:px-12 pb-0">
        <Header />
      </header>

      <main className="flex-1 px-6 pt-2 pb-6 sm:px-12 sm:pt-4 sm:pb-2">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Saved
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track the posts you're interested in
            </p>
          </div>

          <MyReservations />
        </div>
      </main>

      <footer>
        <Footer />
      </footer>
    </div>
  );
}
