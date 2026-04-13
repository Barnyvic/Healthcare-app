import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <h1>MediNotes Pro</h1>
          <div className="row">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="button">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/product" className="button">
                Go to App
              </Link>
              <UserButton showName />
            </SignedIn>
          </div>
        </nav>

        <section className="hero">
          <h2>Transform Consultation Notes Into Clear Clinical Outputs</h2>
          <p>
            Secure healthcare assistant for doctors to generate records summaries,
            next steps, and patient-friendly email drafts.
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="button primary">Start Free Trial</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/product" className="button primary">
              Open Consultation Assistant
            </Link>
          </SignedIn>
        </section>
      </div>
    </main>
  );
}
