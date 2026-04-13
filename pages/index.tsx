import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">MediNotes Pro</h1>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/product"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Go to App
              </Link>
              <UserButton showName />
            </SignedIn>
          </div>
        </nav>

        <section className="mx-auto mt-20 grid max-w-3xl gap-4 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Transform Consultation Notes Into Clear Clinical Outputs
          </h2>
          <p className="text-lg text-slate-600">
            Secure healthcare assistant for doctors to generate records summaries,
            next steps, and patient-friendly email drafts.
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Start Free Trial
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/product"
              className="mx-auto rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open Consultation Assistant
            </Link>
          </SignedIn>
        </section>
      </div>
    </main>
  );
}
