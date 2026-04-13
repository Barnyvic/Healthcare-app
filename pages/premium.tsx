import { SignInButton, SignedIn, SignedOut, UserButton, UserProfile } from "@clerk/nextjs";

export default function PremiumPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mb-4 flex justify-end">
        <UserButton showName />
      </div>

      <SignedOut>
        <div className="mx-auto mt-4 grid max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <SignInButton mode="modal">
            <button className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Subscribe to Premium</h1>
          <p className="text-sm text-slate-700">
            Use Clerk's account portal below to manage your subscriptions and billing.
          </p>
          <div className="rounded-xl border border-slate-200 p-2">
            <UserProfile />
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
