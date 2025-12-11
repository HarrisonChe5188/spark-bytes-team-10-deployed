import SettingsForm from "@/components/settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p>Please sign in to access settings.</p>
      </div>
    );
  }

  const { data: profileData } = await supabase
    .from("userinfo")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <SettingsForm
        userId={user.id}
        initialNickname={profileData?.nickname ?? ""}
        initialAvatarUrl={profileData?.avatar_url ?? null}
      />
    </main>
  );
}