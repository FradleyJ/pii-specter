# pii-specter

> *AI-powered PII detection and redaction — ghost scanner for sensitive data*

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vertex AI](https://img.shields.io/badge/Google-Vertex_AI-4285F4?logo=google-cloud)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Status](https://img.shields.io/badge/status-WIP-yellow)

A web application for detecting and redacting Personally Identifiable Information (PII) from uploaded documents — built for tax season, applicable anywhere sensitive data leaks. Upload a document, let Vertex AI ghost-scan it for exposed PII, redact with one click, export clean PDF.

---

## Problem

Tax documents, financial statements, and legal filings are riddled with SSNs, EINs, bank account numbers, and addresses. Sharing these unredacted — with accountants, attorneys, or cloud storage — is a data exposure risk. `pii-specter` treats every document upload as an untrusted input and scans before it leaves your hands.

---

## Architecture

```
pii-specter/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # Server-side routes
│   │   │   ├── scan/        # Vertex AI PII scan endpoint
│   │   │   ├── redact/      # Redaction pipeline
│   │   │   └── export/      # jsPDF export endpoint
│   │   └── page.tsx         # Main upload UI
│   ├── components/          # React components
│   └── lib/                 # Vertex AI + Supabase clients
├── next.config.ts
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| AI Engine | Google Vertex AI (Gemini) |
| Auth | Google OAuth via `googleapis` |
| Storage | Supabase (PostgreSQL + file storage) |
| PDF Export | jsPDF |
| Language | TypeScript 5 |

---

## Planned Features

- **Document Upload** — PDF, image, and plain text support
- **AI PII Scan** — Vertex AI identifies SSN, EIN, account numbers, addresses, names
- **Redaction UI** — Review detected PII with bounding boxes before committing
- **One-click Redact** — Replace sensitive fields with `[REDACTED]`
- **PDF Export** — Export clean, redacted document as PDF via jsPDF
- **Audit Log** — Supabase stores scan history (what was found, not what was in it)
- **Google OAuth** — Secure single-sign-on, no password storage

---

## Quickstart

```bash
npm install
cp .env.example .env.local   # Add your Google Cloud + Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CLOUD_PROJECT=
VERTEX_AI_LOCATION=us-central1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## PII Types Detected

- Social Security Numbers (SSN)
- Employer Identification Numbers (EIN)
- Bank account and routing numbers
- Credit card numbers
- Driver's license numbers
- Passport numbers
- Full names + addresses (contextual)
- Date of birth combinations

---

## Status

**Work in progress.** Scaffold is in place (Next.js 16, Vertex AI client wired, Supabase connected, jsPDF integrated). Core scan/redact pipeline under active development.

---

## Cybersec Angle

PII exposure is consistently in the OWASP Top 10. Most document handling tools treat uploaded files as trusted — `pii-specter` treats every document as a potential data breach waiting to happen. The AI scan runs *before* the document hits storage, enforcing a zero-trust model for sensitive file processing.
