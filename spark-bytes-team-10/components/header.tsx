"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import UserDropdown from "@/components/user-dropdown";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isPost = pathname === "/post";
  const isSaved = pathname === "/reservations";

  return (
    <header className="max-w-4xl mx-auto mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 
            onClick={() => router.push("/home")}
            className="text-2xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            Spark!Bytes
          </h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <button
            onClick={() => router.push("/post")}
            className={`transition-colors font-medium ${
              isPost
                ? "text-gray-900 dark:text-gray-100 font-semibold"
                : "text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            Post
          </button>
          <button
            onClick={() => router.push("/reservations")}
            className={`transition-colors font-medium ${
              isSaved
                ? "text-gray-900 dark:text-gray-100 font-semibold"
                : "text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            }`}
          >
            Saved
          </button>
          <UserDropdown>
            <LogoutButton />
          </UserDropdown>
        </nav>
      </div>
    </header>
  );
}
