import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { OceanScene } from "@/components/living/ocean-scene";
import { Lotus } from "@/components/decor/ornaments";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#081527] px-4 py-12">
      <OceanScene />
      <div className="relative z-10 w-full max-w-sm animate-rise-in">
        <Link href="/" className="block text-center">
          <Lotus breathing className="mx-auto h-9 w-16 fill-slate-200/90" />
          <span className="mt-2 block font-display text-lg font-semibold italic text-slate-100">
            Bhimboy
          </span>
        </Link>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs italic text-slate-400/70">
          The ocean is calm tonight. Come in quietly.
        </p>
      </div>
    </main>
  );
}
