import { LandingHeader } from "@/components/landing-header";
import { Footer } from "@/components/footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-black dark:to-red-950 flex flex-col">
      <header className="pt-6 px-6 sm:pt-6 sm:px-12 pb-0">
        <LandingHeader />
      </header>

      {children}

      <footer>
        <Footer />
      </footer>
    </div>
  );
}
