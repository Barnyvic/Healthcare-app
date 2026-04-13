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

        <section className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Free Plan
            </p>
            <h3 className="text-2xl font-bold text-slate-900">$0/month</h3>
            <p className="mt-2 text-sm text-slate-600">
              Basic access for quick consultation note drafting and testing.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>- Generate consultation summaries</li>
              <li>- Basic markdown output</li>
              <li>- Community-level support</li>
            </ul>
            <div className="mt-6">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Start Free
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/product"
                  className="block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Use Free Plan
                </Link>
              </SignedIn>
            </div>
          </article>

          <article className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-md">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
              Premium Plan
            </p>
            <h3 className="text-2xl font-bold text-slate-900">$10/month</h3>
            <p className="mt-2 text-sm text-slate-600">
              Priority access and advanced workflows for production healthcare teams.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>- Premium-only workspace</li>
              <li>- Advanced quality output path</li>
              <li>- Priority support</li>
            </ul>
            <div className="mt-6">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Sign In to Subscribe
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/account"
                  className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Subscribe to Premium
                </Link>
              </SignedIn>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
