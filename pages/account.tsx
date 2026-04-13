import { SignedIn, SignedOut, SignInButton, UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
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
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <UserProfile />
        </div>
      </SignedIn>
    </main>
  );
}
