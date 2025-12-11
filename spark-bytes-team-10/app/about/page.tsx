"use client";
import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-black dark:to-red-950 p-6 sm:p-12">
      <main className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg space-y-8 border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-bold text-red-700 dark:text-red-400">
          About Spark Bytes
        </h1>

        <p className="text-gray-700 dark:text-gray-300">
          Spark Bytes helps reduce food waste at Boston University by connecting
          hosts with leftover food to students who can use it.
        </p>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            How it works
          </h2>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
            <li>Hosts post leftover food details.</li>
            <li>Students browse the feed and pick up.</li>
            <li>Posts expire once food is gone.</li>
          </ul>
        </section>

        <div>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
