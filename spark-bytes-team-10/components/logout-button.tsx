"use client";

import { createClient } from "@/lib/supabase/client"; // use the exported client
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut(); // use the imported supabase
    if (error) {
      console.error("Error signing out:", error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
      <LogOut className="mr-2 h-4 w-4" />
      <span>Logout</span>
    </DropdownMenuItem>
  );
}
