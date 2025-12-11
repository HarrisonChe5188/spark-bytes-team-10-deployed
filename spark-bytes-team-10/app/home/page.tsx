import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Home from "@/components/home";

export default async function HomePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <main className="w-full space-y-6">
      <Home />
    </main>
  );
}
