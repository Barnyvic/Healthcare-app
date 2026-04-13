import { FormEvent, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth
} from "@clerk/nextjs";
import DatePicker from "react-datepicker";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

function normalizeGeneratedOutput(raw: string): string {
  let formatted = raw
    .replace(/####\s*/g, "\n\n### ")
    .replace(/\s+###/g, "\n\n###")
    .replace(/\[Your Name\]/gi, "MediNotes Pro")
    .replace(/Best regards,\s*\n\s*MediNotes Pro/gi, "Best regards,\nMediNotes Pro");

  if (!/###\s*Summary of visit for the doctor's records/i.test(formatted)) {
    formatted = formatted.replace(
      /summary of visit for the doctor's records/gi,
      "### Summary of visit for the doctor's records"
    );
  }
  if (!/###\s*Next steps for the doctor/i.test(formatted)) {
    formatted = formatted.replace(
      /next steps for the doctor/gi,
      "### Next steps for the doctor"
    );
  }
  if (!/###\s*Draft of email to patient in patient-friendly language/i.test(formatted)) {
    formatted = formatted.replace(
      /draft of email to patient in patient-friendly language/gi,
      "### Draft of email to patient in patient-friendly language"
    );
  }

  formatted = formatted
    .replace(/(###\s*Summary of visit for the doctor's records)/gi, "\n\n$1\n\n")
    .replace(/(###\s*Next steps for the doctor)/gi, "\n\n$1\n\n")
    .replace(
      /(###\s*Draft of email to patient in patient-friendly language)/gi,
      "\n\n$1\n\n"
    )
    .replace(/(\d+)\.\s*/g, "\n$1. ")
    .replace(/Subject:\s*/gi, "**Subject:** ")
    .replace(/(\*\*Subject:\*\*[^\n]+)\s*(Dear\s)/i, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}

function ConsultationForm() {
  const { getToken } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [visitDate, setVisitDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setOutput("");
    setErrorMessage("");

    const token = await getToken();
    if (!token) {
      setOutput("Authentication required.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let buffer = "";

    let isSettled = false;
    const timeout = setTimeout(() => {
      if (!isSettled) {
        controller.abort();
        setLoading(false);
        setErrorMessage(
          "The request timed out. Please try again in a few seconds."
        );
      }
    }, 45000);

    try {
      await fetchEventSource("/api/consultation", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: visitDate?.toISOString().slice(0, 10),
          notes
        }),
        async onopen(response) {
          if (response.ok) {
            return;
          }
          const message = await response.text();
          throw new Error(message || "Request failed. Please try again.");
        },
        onmessage(ev) {
          buffer += ev.data;
          setOutput(normalizeGeneratedOutput(buffer));
        },
        onclose() {
          isSettled = true;
          clearTimeout(timeout);
          setLoading(false);
        },
        onerror(err) {
          controller.abort();
          throw err;
        }
      });
    } catch (err) {
      isSettled = true;
      clearTimeout(timeout);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate summary. Please try again.";
      setErrorMessage(message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900">
        Consultation Notes Assistant
      </h1>
      <form
        className="mt-4 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Patient Name
          <input
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter patient full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Date of Visit
          <DatePicker
            selected={visitDate}
            onChange={(date: Date | null) => setVisitDate(date)}
            dateFormat="yyyy-MM-dd"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Consultation Notes
          <textarea
            required
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write consultation notes here..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <button
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          type="submit"
          disabled={loading}
        >
          {loading ? "Generating Summary..." : "Generate Summary"}
        </button>
      </form>

      {errorMessage && (
        <section className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="text-sm">{errorMessage}</p>
        </section>
      )}

      {output && (
        <section className="mt-5 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-6 shadow-sm">
          <ReactMarkdown
            className="prose prose-slate max-w-none text-[0.96rem] leading-7 prose-h3:mb-2 prose-h3:mt-6 prose-h3:text-2xl prose-h3:font-bold prose-li:my-1 prose-ol:pl-6 prose-ul:pl-6"
            remarkPlugins={[remarkGfm, remarkBreaks]}
          >
            {output}
          </ReactMarkdown>
        </section>
      )}
    </div>
  );
}

export default function Product() {
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
        <ConsultationForm />
      </SignedIn>
    </main>
  );
}
