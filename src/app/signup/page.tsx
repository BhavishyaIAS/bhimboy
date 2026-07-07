import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { FallingLeaves } from "@/components/decor/falling-leaves";
import { Lotus } from "@/components/decor/ornaments";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="dawn-sky pointer-events-none absolute inset-0" />
      <FallingLeaves density="full" className="fixed inset-0 h-screen" />
      <div className="relative z-10 w-full max-w-sm animate-rise-in">
        <Link href="/" className="block text-center">
          <Lotus breathing className="mx-auto h-9 w-16" />
          <span className="mt-2 block font-display text-lg font-semibold italic">
            Bhimboy
          </span>
        </Link>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
