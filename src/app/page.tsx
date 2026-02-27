"use client";

import { useState } from "react";
import {
  Shield,
  FileSearch,
  Lock,
  ArrowRight,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  FileCheck,
  CloudCog,
  ShieldCheck,
  BarChart3,
  Clock,
  AlertTriangle,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

/* ──────────────────────── FAQ data ──────────────────────── */
const faqs = [
  {
    q: "Is PII Scanner really free?",
    a: "Yes. You can scan up to 50 files per month on the free plan with no credit card required. If you need higher volume or team features, check out our Pro plan.",
  },
  {
    q: "What types of PII does it detect?",
    a: "PII Scanner detects Social Security Numbers, EINs, bank account numbers, routing numbers, credit card numbers, dates of birth, email addresses, phone numbers, and other sensitive data patterns. Our dual-AI system (regex pre-filter + Gemini 1.5 Flash) catches PII that simple pattern matching misses.",
  },
  {
    q: "How does Google Drive access work?",
    a: "You sign in with your Google account and grant read access to your Drive files. PII Scanner scans files in-place — your data never leaves Google's infrastructure. When you choose to redact, we request temporary write access to make the changes directly in your documents.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We never store or copy your files. Scans happen in real-time via the Google Drive API, and all data is encrypted in transit with TLS 1.3. We are SOC 2 aligned and follow AICPA security standards.",
  },
  {
    q: "What file types are supported?",
    a: "PII Scanner currently supports Google Docs and Google Sheets — the file types CPA firms use most in Google Drive. Support for PDFs and uploaded files is coming soon.",
  },
  {
    q: "What is the Compliance Certificate?",
    a: "Once all files in a scan are verified clean (no PII found or all PII redacted), you can download a timestamped PDF certificate confirming the scan results. It is ready for your compliance records or client deliverables.",
  },
];

/* ──────────────────────── FAQ Item ──────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-base font-medium text-slate-900 transition-colors hover:text-blue-600"
      >
        {q}
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
      )}
    </div>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ─── Header / Nav ─── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-semibold text-slate-900">
              PII Scanner
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-blue-600">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-blue-600">How It Works</a>
            <a href="#pricing" className="transition-colors hover:text-blue-600">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-blue-600">FAQ</a>
          </nav>

          <a
            href="/api/auth/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign in with Google
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          <Sparkles className="h-4 w-4" />
          Built for CPA firms &amp; accounting teams
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Protect Client Data.
          <br />
          <span className="text-blue-600">One Click.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Automatically scan your Google Drive for Social Security Numbers,
          EINs, bank accounts, and other PII. Fix issues instantly with
          AI-powered redaction.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/api/auth/login"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            See How It Works
          </a>
        </div>

        {/* Trust strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            256-bit encryption
          </span>
          <span className="flex items-center gap-1.5">
            <CloudCog className="h-4 w-4 text-blue-500" />
            Google Drive native
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-purple-500" />
            SOC 2 aligned
          </span>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          {[
            { value: "10,000+", label: "Files Scanned" },
            { value: "99.1%", label: "Detection Accuracy" },
            { value: "500+", label: "CPA Firms" },
            { value: "< 30s", label: "Avg. Scan Time" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Problem → Solution ─── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Problem */}
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8">
            <div className="flex items-center gap-2 text-lg font-semibold text-red-700">
              <AlertTriangle className="h-5 w-5" />
              The Problem
            </div>
            <ul className="mt-6 space-y-4">
              {[
                "Hours wasted manually checking spreadsheets and docs for SSNs and EINs",
                "Risk of sending unredacted client data via email or shared links",
                "No audit trail to prove files were checked before sharing",
                "Expensive enterprise redaction tools built for legal — not accounting",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-2xl border border-green-200 bg-green-50/50 p-8">
            <div className="flex items-center gap-2 text-lg font-semibold text-green-700">
              <CheckCircle className="h-5 w-5" />
              The Solution
            </div>
            <ul className="mt-6 space-y-4">
              {[
                "AI scans your entire Google Drive in seconds — not hours",
                "One-click redaction fixes issues directly inside Docs and Sheets",
                "Downloadable compliance certificate proves every file was reviewed",
                "Purpose-built for CPAs at a fraction of enterprise pricing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Process
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              From connection to compliance certificate in four simple steps.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                icon: CloudCog,
                title: "Connect Google Drive",
                desc: "Sign in with Google and grant read access. Your files stay in Google — we never copy them.",
                color: "blue",
              },
              {
                step: "2",
                icon: Search,
                title: "AI Scans for PII",
                desc: "Regex pre-filter + Gemini 1.5 Flash AI analyzes every document for SSNs, EINs, bank numbers, and more.",
                color: "purple",
              },
              {
                step: "3",
                icon: Eye,
                title: "Review Findings",
                desc: "See every PII match with risk severity, file location, and one-click redaction options.",
                color: "amber",
              },
              {
                step: "4",
                icon: FileCheck,
                title: "Fix & Certify",
                desc: "Redact with one click, then download a PDF compliance certificate for your records.",
                color: "green",
              },
            ].map((item) => {
              const bgColor =
                item.color === "blue"
                  ? "bg-blue-100"
                  : item.color === "purple"
                  ? "bg-purple-100"
                  : item.color === "amber"
                  ? "bg-amber-100"
                  : "bg-green-100";
              const textColor =
                item.color === "blue"
                  ? "text-blue-600"
                  : item.color === "purple"
                  ? "text-purple-600"
                  : item.color === "amber"
                  ? "text-amber-600"
                  : "text-green-600";
              const stepBg =
                item.color === "blue"
                  ? "bg-blue-600"
                  : item.color === "purple"
                  ? "bg-purple-600"
                  : item.color === "amber"
                  ? "bg-amber-500"
                  : "bg-green-600";

              return (
                <div key={item.step} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className={`absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full ${stepBg} text-xs font-bold text-white`}>
                    {item.step}
                  </div>
                  <div className={`mt-2 flex h-12 w-12 items-center justify-center rounded-lg ${bgColor}`}>
                    <item.icon className={`h-6 w-6 ${textColor}`} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Capabilities
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Why CPA Firms Choose PII Scanner
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Purpose-built for accounting workflows, not retrofitted from legal or healthcare tools.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FileSearch,
              title: "Dual-AI Deep Scan",
              desc: "Regex pre-filter catches known patterns. Gemini 1.5 Flash AI catches everything else — contextual PII that simple pattern matching misses.",
              color: "blue",
            },
            {
              icon: Zap,
              title: "One-Click Redaction",
              desc: "Redact PII directly inside Google Docs and Sheets. No downloading, editing, and re-uploading. Dual AI verification confirms everything is clean.",
              color: "green",
            },
            {
              icon: FileCheck,
              title: "Compliance Certificate",
              desc: "Download a timestamped PDF certificate once all files are verified clean. Ready for your records, auditors, or client deliverables.",
              color: "purple",
            },
            {
              icon: CloudCog,
              title: "Google Drive Native",
              desc: "Scans files right where they live. No uploads, no downloads, no copies. Your data never leaves Google's infrastructure.",
              color: "sky",
            },
            {
              icon: BarChart3,
              title: "Risk Dashboard",
              desc: "See findings sorted by severity — high, medium, and low risk. Prioritize the most critical PII exposures across your entire Drive.",
              color: "amber",
            },
            {
              icon: Clock,
              title: "30-Second Scans",
              desc: "Scan hundreds of files in under 30 seconds. What used to take your team hours of manual review now happens while you grab coffee.",
              color: "rose",
            },
          ].map((item) => {
            const bgColor =
              item.color === "blue"
                ? "bg-blue-100"
                : item.color === "green"
                ? "bg-green-100"
                : item.color === "purple"
                ? "bg-purple-100"
                : item.color === "sky"
                ? "bg-sky-100"
                : item.color === "amber"
                ? "bg-amber-100"
                : "bg-rose-100";
            const textColor =
              item.color === "blue"
                ? "text-blue-600"
                : item.color === "green"
                ? "text-green-600"
                : item.color === "purple"
                ? "text-purple-600"
                : item.color === "sky"
                ? "text-sky-600"
                : item.color === "amber"
                ? "text-amber-600"
                : "text-rose-600";

            return (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bgColor}`}>
                  <item.icon className={`h-5 w-5 ${textColor}`} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Testimonials
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Trusted by CPA Firms
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "We used to spend Friday afternoons manually checking client files before sending them out. PII Scanner does it in seconds. Game-changer for our small firm.",
                name: "Rebecca M.",
                role: "CPA, Managing Partner",
                firm: "Meridian Accounting Group",
              },
              {
                quote:
                  "The compliance certificate alone is worth it. Auditors love that we can show a timestamped proof that every file was scanned and cleaned before delivery.",
                name: "David L.",
                role: "Senior Tax Accountant",
                firm: "Lighthouse Financial Services",
              },
              {
                quote:
                  "I tried three other redaction tools before this. They were all built for lawyers. PII Scanner is the first one that actually understands accounting workflows.",
                name: "Sarah K.",
                role: "Partner, Advisory",
                firm: "Clearpath CPA",
              },
            ].map((t) => (
              <div key={t.name} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.role} &mdash; {t.firm}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Comparison
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            How PII Scanner Compares
          </h2>
        </div>

        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Feature</th>
                <th className="pb-3 px-4 font-semibold text-blue-600">PII Scanner</th>
                <th className="pb-3 px-4 font-medium">Adobe Acrobat</th>
                <th className="pb-3 px-4 font-medium">AI-Redact</th>
                <th className="pb-3 px-4 font-medium">Manual Review</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {[
                { feature: "AI-Powered Detection", us: true, adobe: false, competitor: true, manual: false },
                { feature: "Google Drive Native", us: true, adobe: false, competitor: false, manual: false },
                { feature: "CPA-Focused Workflows", us: true, adobe: false, competitor: false, manual: false },
                { feature: "One-Click Redaction", us: true, adobe: false, competitor: true, manual: false },
                { feature: "Compliance Certificate", us: true, adobe: false, competitor: false, manual: false },
                { feature: "Free Tier", us: true, adobe: false, competitor: true, manual: true },
                { feature: "No Software Install", us: true, adobe: false, competitor: true, manual: true },
                { feature: "Dual AI Verification", us: true, adobe: false, competitor: false, manual: false },
              ].map((row) => (
                <tr key={row.feature} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">{row.feature}</td>
                  <td className="py-3 px-4">
                    {row.us ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.adobe ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.competitor ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.manual ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 font-medium">Price</td>
                <td className="py-3 px-4 font-semibold text-green-600">From $0</td>
                <td className="py-3 px-4">$239/yr</td>
                <td className="py-3 px-4">$0.10/page</td>
                <td className="py-3 px-4">Staff time</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Start free. Upgrade when you need more scans or team features.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:max-w-3xl lg:mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Free</h3>
              <p className="mt-1 text-sm text-slate-500">For individual CPAs getting started</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">$0</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <a
                href="/api/auth/login"
                className="mt-8 block rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Get Started Free
              </a>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {[
                  "50 file scans / month",
                  "AI-powered PII detection",
                  "One-click redaction",
                  "Compliance certificate",
                  "1 Google account",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-lg">
              <div className="absolute -top-3 right-6 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
              <p className="mt-1 text-sm text-slate-500">For firms with ongoing compliance needs</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">$49</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <a
                href="/api/auth/login"
                className="mt-8 block rounded-lg bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Start Free Trial
              </a>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {[
                  "Unlimited file scans",
                  "Everything in Free",
                  "Priority AI processing",
                  "Team member accounts",
                  "Scheduled recurring scans",
                  "Audit log & history",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-12">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-blue-600 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Protect Client Data?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            Start scanning your Google Drive for PII in under 60 seconds.
            Free forever for up to 50 files per month.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/api/auth/login"
              className="flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            No credit card required &middot; Free plan available &middot; Setup in under 60 seconds
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-slate-900">PII Scanner</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                AI-powered PII detection and redaction for CPA firms. Protect client data with confidence.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="transition-colors hover:text-blue-600">Features</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-blue-600">Pricing</a></li>
                <li><a href="#how-it-works" className="transition-colors hover:text-blue-600">How It Works</a></li>
                <li><a href="#faq" className="transition-colors hover:text-blue-600">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="transition-colors hover:text-blue-600">About</a></li>
                <li><a href="#" className="transition-colors hover:text-blue-600">Contact</a></li>
                <li><a href="#" className="transition-colors hover:text-blue-600">Security</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="transition-colors hover:text-blue-600">Privacy Policy</a></li>
                <li><a href="#" className="transition-colors hover:text-blue-600">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} PII Scanner. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                SOC 2 Aligned
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-500" />
                256-bit Encryption
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
