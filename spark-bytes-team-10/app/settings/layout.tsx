import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-black dark:to-red-950 flex flex-col">
      <header className="pt-6 px-6 sm:pt-6 sm:px-12 pb-0">
        <Header />
      </header>

      <main className="flex-1 px-6 pt-2 pb-6 sm:px-12 sm:pt-4 sm:pb-2">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      <footer>
        <Footer />
      </footer>
    </div>
  );
}