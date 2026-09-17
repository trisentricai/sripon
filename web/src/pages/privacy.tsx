export const loader = async () => {
  return { title: "Privacy Policy" };
};

export function Component() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">Privacy Policy</h1>
      <p className="mt-3 text-ink-faint">Last updated: September 2026</p>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Information We Collect</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          When you create an account or place an order, we collect your name,
          email address, phone number, and shipping address. Authentication is
          handled through Firebase, which may also collect device and session
          data. We additionally collect order history, payment confirmations,
          and any information you provide through contact forms or customer
          support.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">How We Use Your Data</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Your information is used to process orders, deliver products, send
          order updates, and provide customer support. We may use your email
          address to share promotional offers and festive deals — you can opt
          out at any time. Aggregated, anonymised data may be used to improve
          our website and services.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Cookies &amp; Tracking</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          SriPon uses essential cookies to maintain your session and cart
          state. Analytics cookies may be used to understand site traffic and
          improve user experience. You can manage cookie preferences through
          your browser settings. Disabling essential cookies may affect site
          functionality.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Third-Party Services</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          We rely on third-party services including Firebase for
          authentication, Razorpay or similar gateways for payment processing,
          and logistics partners for order delivery. These providers have
          access only to the data necessary to perform their functions and are
          bound by their own privacy policies.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Data Retention</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Account and order data is retained for as long as your account is
          active or as needed to provide our services. If you delete your
          account, personal information is removed within 30 days, though
          anonymised transaction records may be retained for legal and
          auditing purposes.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Your Rights</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          You have the right to access, update, or request deletion of your
          personal data at any time. To exercise these rights or raise
          concerns about data handling, please contact us at{" "}
          <a href="mailto:support@sripon.in" className="text-brand-600 hover:underline">
            support@sripon.in
          </a>
          . We respond to all data requests within 14 business days.
        </p>
      </section>
    </main>
  );
}

export default Component;
