import Link from "next/link";
import { Button } from "./ui/button";

export function LandingHeader() {
  return (
    <header className="max-w-4xl mx-auto mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Spark!Bytes</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/about"
            className="text-red-600 dark:text-red-400 font-semibold hover:underline"
          >
            About
          </Link>
          <div className="flex gap-2">
            <Button asChild size="sm" variant={"outline"}>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" variant={"default"}>
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
