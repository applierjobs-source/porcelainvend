import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & conditions — PorcelainVend",
  description: "Terms and conditions for using PorcelainVend",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 pb-24">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="text-teal-700 underline">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
        Terms &amp; conditions
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: March 29, 2026</p>

      <div className="prose prose-zinc mt-10 max-w-none space-y-6 text-sm leading-relaxed text-zinc-700">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          This document is a practical starting point for a small software
          service. It is not legal advice. Have a lawyer review it for your
          jurisdiction and business.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">1. Agreement</h2>
          <p className="mt-2">
            By accessing or using PorcelainVend (the &quot;Service&quot;), you agree to
            these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">2. The service</h2>
          <p className="mt-2">
            PorcelainVend provides a web application that helps operators connect
            a kiosk experience with third-party services such as Squarespace
            (commerce and notifications) and SwitchBot (physical device control).
            We do not sell goods on your behalf and are not a payment processor.
            Your relationship with customers, payment providers, and third-party
            platforms remains solely between you and them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">3. Accounts</h2>
          <p className="mt-2">
            You must provide accurate registration information and safeguard your
            credentials. You are responsible for activity under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            4. Acceptable use
          </h2>
          <p className="mt-2">
            You will not misuse the Service, attempt unauthorized access, probe
            or attack systems, overload infrastructure, or use the Service for
            unlawful, fraudulent, or harmful purposes. You comply with applicable
            laws and the terms of any integrated third-party services you use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            5. Your configuration
          </h2>
          <p className="mt-2">
            You are responsible for API keys, webhook configuration, device
            credentials, kiosk hardware, physical safety, and compliance with
            local rules for vending, payments, accessibility, and data
            protection. We do not guarantee uninterrupted operation of external
            platforms (e.g. Squarespace or SwitchBot outages).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            6. Intellectual property
          </h2>
          <p className="mt-2">
            The Service, including its software and branding, is owned by the
            operator of PorcelainVend (or its licensors). You receive a limited,
            non-exclusive license to use the Service according to these Terms.
            You retain ownership of your business content and data you submit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            7. Disclaimers
          </h2>
          <p className="mt-2">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT, TO THE FULLEST EXTENT PERMITTED BY LAW.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            8. Limitation of liability
          </h2>
          <p className="mt-2">
            TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE OPERATOR WILL NOT
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER
            INTANGIBLE LOSSES. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE
            SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US FOR THE SERVICE IN THE
            TWELVE (12) MONTHS BEFORE THE CLAIM (OR, IF NONE, ONE HUNDRED U.S.
            DOLLARS (US$100)).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">9. Changes</h2>
          <p className="mt-2">
            We may modify these Terms or the Service. We will post updated Terms
            with a new &quot;Last updated&quot; date where reasonable. Continued use after
            changes constitutes acceptance where allowed by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">10. Termination</h2>
          <p className="mt-2">
            We may suspend or terminate access for violations or operational
            reasons. You may stop using the Service at any time. Provisions that
            by nature should survive will survive termination.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">11. Contact</h2>
          <p className="mt-2">
            For questions about these Terms, contact the operator of your
            PorcelainVend deployment using the support channel they provide (for
            example the email or site shown on your invoice or dashboard).
          </p>
        </section>
      </div>
    </main>
  );
}
