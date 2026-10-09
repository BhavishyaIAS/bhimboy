import Link from "next/link";
import Image from "next/image";
import { LogIn, UserPlus } from "lucide-react";

/**
 * Bhavishya·PSCs public site header (white bar with wordmark + auth actions).
 * Shared by the commission chooser and the group chooser pages.
 */
export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="psc-header">
      <Link href="/" className="psc-brand">
        <Image
          src="/bhavishya-psc-logo.png"
          alt="Bhavishya"
          width={56}
          height={56}
          className="psc-brand-logo"
          priority
        />
        <span className="psc-wordmark">
          <b>
            Bhavishya<span className="psc-accent">·PSCs</span>
          </b>
          <span>LEARN · PRACTICE · PERFORM</span>
        </span>
      </Link>

      <div className="psc-actions">
        {loggedIn ? (
          <Link href="/app/syllabus" className="psc-btn-signup">
            <span>Enter platform</span> →
          </Link>
        ) : (
          <>
            <Link href="/login" className="psc-btn-login">
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
            <Link href="/signup" className="psc-btn-signup">
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
