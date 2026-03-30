import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — PorcelainVend",
  description: "How PorcelainVend handles personal data",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 pb-24">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="text-teal-700 underline">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
        Privacy policy
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: March 29, 2026</p>

      <div className="prose prose-zinc mt-10 max-w-none space-y-6 text-sm leading-relaxed text-zinc-700">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          This policy describes how the PorcelainVend application typically
          processes data. Your deployment&apos;s operator may supplement this with
          their own notices. This is not legal advice.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            1. Who this applies to
          </h2>
          <p className="mt-2">
            This policy covers visitors to the PorcelainVend website and owners
            who register accounts. End customers who pay on your Squarespace store
            interact primarily with Squarespace; refer to Squarespace&apos;s privacy
            policy for checkout data collected there.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            2. Data we collect (owners)
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>Account:</strong> email address, business name, password
              (stored as a secure hash).
            </li>
            <li>
              <strong>Machine configuration:</strong> URLs, encrypted
              third-party credentials (e.g. Squarespace API material, SwitchBot
              tokens, webhook secrets), device identifiers, and operational logs
              needed to run the Service.
            </li>
            <li>
              <strong>Technical:</strong> server logs may include IP addresses,
              timestamps, and request metadata for security and debugging.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            3. How we use data
          </h2>
          <p className="mt-2">
            We use owner data to authenticate you, configure machines, deliver
            webhooks and kiosk features, secure the Service, comply with law,
            and improve reliability. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            4. Third parties
          </h2>
          <p className="mt-2">
            The Service integrates with services you choose, such as{" "}
            <strong>Squarespace</strong> (commerce and webhooks) and{" "}
            <strong>SwitchBot</strong> (device commands). Data is sent to those
            providers only as needed for your configuration. Hosting (e.g.{" "}
            <strong>Railway</strong> or other hosts) and the database provider
            process data according to their policies. Auth and session handling
            may use cookies or similar technologies as implemented by the
            application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">5. Retention</h2>
          <p className="mt-2">
            We retain account and machine data while your account is active and
            as needed for backups, audit, or legal obligations. You may request
            deletion where applicable law requires it, subject to legitimate
            retention needs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">6. Security</h2>
          <p className="mt-2">
            Sensitive secrets are encrypted at rest with application-level
            encryption. Use strong passwords and protect dashboard access. No
            method of transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            7. International transfers
          </h2>
          <p className="mt-2">
            Data may be processed in countries where your hosting provider or
            sub-processors operate. Appropriate safeguards depend on your
            operator&apos;s arrangements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">8. Your rights</h2>
          <p className="mt-2">
            Depending on your region, you may have rights to access, correct,
            delete, or object to certain processing of personal data. Contact
            your deployment operator to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            9. Children&apos;s data
          </h2>
          <p className="mt-2">
            The Service is not directed at children under 13 (or the age required
            in your jurisdiction). Do not register on behalf of a child.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">10. Changes</h2>
          <p className="mt-2">
            We may update this policy and will adjust the &quot;Last updated&quot; date.
            Material changes may be communicated through the Service where
            appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">11. Contact</h2>
          <p className="mt-2">
            For privacy questions, contact the operator of the PorcelainVend
            instance you use (support email or contact shown on your account or
            invoice).
          </p>
        </section>
      </div>
    </main>
  );
}
