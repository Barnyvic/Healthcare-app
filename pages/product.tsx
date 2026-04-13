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
  return raw
    .replace(/\[Your Name\]/gi, "MediNotes Pro")
    .replace(/Best regards,\s*\n\s*MediNotes Pro/gi, "Best regards,\nMediNotes Pro");
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
    <div className="container">
      <h1>Consultation Notes Assistant</h1>
      <form className="card" onSubmit={handleSubmit}>
        <label>
          Patient Name
          <input
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter patient full name"
          />
        </label>

        <label>
          Date of Visit
          <DatePicker
            selected={visitDate}
            onChange={(date: Date | null) => setVisitDate(date)}
            dateFormat="yyyy-MM-dd"
            required
            className="input"
          />
        </label>

        <label>
          Consultation Notes
          <textarea
            required
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write consultation notes here..."
          />
        </label>

        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "Generating Summary..." : "Generate Summary"}
        </button>
      </form>

      {errorMessage && (
        <section className="card">
          <p>{errorMessage}</p>
        </section>
      )}

      {output && (
        <section className="card summary-card">
          <h2>Generated Consultation Summary</h2>
          <ReactMarkdown
            className="summary-output"
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
    <main className="page">
      <div className="top-right">
        <UserButton showName />
      </div>
      <SignedOut>
        <div className="container card">
          <h1>Sign in required</h1>
          <SignInButton mode="modal">
            <button className="button primary">Sign In to Continue</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <ConsultationForm />
      </SignedIn>
    </main>
  );
}
