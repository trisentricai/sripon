export const loader = async () => {
  return { title: "Refund & Return Policy" };
};

export function Component() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">Refund &amp; Return Policy</h1>
      <p className="mt-3 text-ink-faint">Last updated: September 2026</p>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Eligibility</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          We accept returns and refunds for products that arrive damaged,
          defective, or incorrect. Due to the nature of fireworks and
          crackers, change-of-mind returns are not applicable.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Return Window</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          You must initiate a return request within <strong className="text-ink">7 days</strong> of
          receiving your order. Requests received after this period may not be
          eligible for a refund.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">How to Request a Return</h2>
        <ol className="mt-2 list-decimal list-inside space-y-1 leading-relaxed text-ink-soft">
          <li>Contact our support team at support@sripon.in with your order number.</li>
          <li>Provide clear photographs showing the damage or defect.</li>
          <li>Our team will review your request and respond within 48 hours.</li>
          <li>Once approved, we will arrange a pickup or provide return shipping instructions.</li>
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Refund Timeline</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Refunds are processed within <strong className="text-ink">5–7 business days</strong> after
          we receive and inspect the returned item. The refund is credited to
          the original payment method. For COD orders, refunds are transferred
          to the bank account you provide during the return request.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Damaged in Transit</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          If your package is visibly damaged upon delivery, please refuse the
          shipment or note the damage when signing for it. Then contact us
          immediately so we can file a claim and send a replacement or issue a
          full refund.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">Non-Returnable Items</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Products that have been opened, used, or stored improperly are not
          eligible for return. Items purchased during clearance sales are
          final sale and cannot be returned unless defective.
        </p>
      </section>
    </main>
  );
}

export default Component;
