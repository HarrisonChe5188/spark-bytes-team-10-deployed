import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Utensils, Clock, Users, Sparkles, CheckCircle2, MessageCircle } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims) {
    redirect("/home");
  }

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="flex items-center justify-center px-6 sm:px-12 py-20 sm:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              BU Community Verified
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Share food.
            <br />
            Reduce waste.
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Connect with the Boston University community to share and discover available food. 
            Help reduce waste while building community connections.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="w-full sm:w-auto bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 font-semibold transition-colors text-lg shadow-lg hover:shadow-xl"
            >
              Get started
            </Link>
            <Link
              href="/about"
              className="w-full sm:w-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-8 py-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors text-lg border border-gray-200 dark:border-gray-700"
            >
              Learn more
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-red-600 dark:text-red-400 font-semibold hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 sm:px-12 py-30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400">
              Why Spark Bytes?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The easiest way to share food and connect with your BU community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Easy to Post
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Quick and simple interface to share leftover food from events and meetings.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Real-Time Updates
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Refresh by the hour to find food near you! 
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Reduce Waste
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Help combat food waste while supporting fellow students. Make a real environmental impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 sm:px-12 py-20 bg-gradient-to-br from-red-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Post Available Food
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Hosts share details about leftover food including location, quantity, and pickup time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Browse & Reserve
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Students browse the feed, find food they want, and reserve items for pickup.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Pick Up & Enjoy
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Head to the location, grab your food, and enjoy! Posts automatically expire when claimed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 sm:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-start gap-2">
                <MessageCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                Is Spark Bytes only for BU students?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 ml-7">
                Yes, Spark Bytes is exclusively for the Boston University community to ensure safety and trust within our network.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-start gap-2">
                <MessageCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                Allergies?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 ml-7">
              Allergens will be listed. We encourage everyone to follow proper food handling guidelines and use their best judgment.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-start gap-2">
                <MessageCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                How do pickups work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 ml-7">
                When you reserve food, you'll see the pickup location and time. Simply head there during the specified window and collect your food. It's that easy!
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-start gap-2">
                <MessageCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                What happens if food runs out before I can pick it up?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 ml-7">
                Posts are automatically removed when food runs out. We recommend acting fast when you see something you want! You can also set up notifications to be alerted as soon as new food is posted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 sm:px-12 py-20 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to make a difference?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of BU students reducing food waste and building community connections.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="w-full sm:w-auto bg-white text-red-600 px-8 py-4 rounded-lg hover:bg-gray-100 font-semibold transition-colors text-lg shadow-lg"
            >
              Sign up now
            </Link>
            <Link
              href="/about"
              className="w-full sm:w-auto bg-red-700 text-white px-8 py-4 rounded-lg hover:bg-red-800 font-semibold transition-colors text-lg border-2 border-white/20"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}