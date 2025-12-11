import { ThemeSwitcher } from "@/components/theme-switcher";

export function Footer() {
  return (
    <div className="max-w-4xl mx-auto mt-10 mb-8 px-6 sm:px-12 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
      <span>© {new Date().getFullYear()} Spark!Bytes</span>
      <ThemeSwitcher />
    </div>
  );
}
