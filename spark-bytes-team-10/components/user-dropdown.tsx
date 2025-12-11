"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UserDropdown({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("userinfo")
          .select("nickname, avatar_url")
          .eq("id", user.id)
          .single();
        if (error) {
          console.error("Failed to load userinfo", error);
          return;
        }
        if (!mounted) return;
        setNickname(data?.nickname ?? null);
        setAvatarUrl(data?.avatar_url ?? null);
      } catch (err) {
        console.error(err);
      }
    })();

    // Listen for profile updates from settings page
    const handleProfileUpdate = (event: CustomEvent<{ avatarUrl: string | null; nickname: string | null }>) => {
      if (!mounted) return;
      setAvatarUrl(event.detail.avatarUrl);
      setNickname(event.detail.nickname);
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          {avatarUrl ? (
            <NextImage
              src={avatarUrl}
              alt={nickname ?? "avatar"}
              width={28}
              height={28}
              className="w-7 h-7 rounded-md object-cover"
              unoptimized
            />
          ) : (
            <User size={20} className="text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          Settings
        </DropdownMenuItem>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}