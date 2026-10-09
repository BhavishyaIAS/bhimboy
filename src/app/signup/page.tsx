import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, #ffe3e6 0%, #eef3fb 45%, #f4f7fc 100%)",
        }}
      />
      <div className="w-full max-w-sm animate-rise-in">
        <Link href="/" className="flex flex-col items-center text-center">
          <Image
            src="/bhavishya-psc-logo.png"
            alt="Bhavishya IAS"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-full border-[3px] border-white bg-white object-contain shadow-[0_6px_22px_rgba(16,36,62,0.18)]"
            priority
          />
          <span className="mt-3 block text-lg font-extrabold tracking-tight text-[color:var(--navy)]">
            Bhavishya IAS
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            APPSC Group 1 &amp; Group 2
          </span>
        </Link>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
