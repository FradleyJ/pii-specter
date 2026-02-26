"use client";

import { Shield, FileSearch, Lock, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-semibold text-slate-900">PII Scanner</span>
          </div>
          <a
            href="/api/auth/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign in with Google
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Protect Client Data.
            <br />
            <span className="text-blue-600">One Click.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Automatically scan your Google Drive for Social Security Numbers, EINs,
            bank accounts, and other PII. Fix issues instantly with AI-powered redaction.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/api/auth/login"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileSearch className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Deep Scan</h3>
            <p className="mt-2 text-sm text-slate-600">
              Regex pre-filter + Gemini 1.5 Flash AI analysis catches PII that simple
              pattern matching misses.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">One-Click Fix</h3>
            <p className="mt-2 text-sm text-slate-600">
              Redact PII directly in Google Docs and Sheets. Dual AI verification
              confirms everything is clean.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Compliance Certificate</h3>
            <p className="mt-2 text-sm text-slate-600">
              Download a PDF compliance certificate once all files are verified clean.
              Ready for your records.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
