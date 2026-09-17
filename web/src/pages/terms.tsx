export const loader = async () => {
  return { title: "Terms & Conditions" };
};

export function Component() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">Terms &amp; Conditions</h1>
      <p className="mt-3 text-ink-faint">Last updated: September 2026</p>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">1. Acceptance of Terms</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          By accessing or placing an order on SriPon, you agree to be bound by
          these Terms &amp; Conditions. If you do not agree, please refrain from
          using our website.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">2. Orders &amp; Payment</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          All orders are subject to product availability. SriPon reserves the
          right to cancel or refuse any order. Prices are listed in INR and
          include applicable taxes unless stated otherwise. Payment must be
          completed at checkout through the available secure payment gateways.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">3. Delivery</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          We deliver across India via trusted logistics partners. Estimated
          delivery dates are provided at checkout but are not guaranteed.
          SriPon is not responsible for delays caused by courier services,
          weather conditions, or government-imposed restrictions on
          fireworks transportation.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">4. Returns &amp; Refunds</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Due to the nature of our products, returns are accepted only for
          damaged or defective items within 7 days of delivery. Please refer
          to our{" "}
          <a href="/refund-policy" className="text-brand-600 hover:underline">
            Refund &amp; Return Policy
          </a>{" "}
          for full details.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">5. User Responsibilities</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          You must be of legal age to purchase fireworks in your state. It is
          your responsibility to ensure that the use and storage of purchased
          products comply with local laws and regulations. SriPon disclaims
          any liability arising from misuse of products.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">6. Limitation of Liability</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          SriPon shall not be held liable for any indirect, incidental, or
          consequential damages arising from the use of our website or
          products. Our total liability for any claim shall not exceed the
          amount paid for the specific order in question.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">7. Intellectual Property</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          All content on this website — including text, images, logos, and
          design — is the property of SriPon and is protected by applicable
          intellectual property laws. Reproduction or redistribution without
          prior written consent is prohibited.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-ink">8. Changes to Terms</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          SriPon reserves the right to update these terms at any time.
          Continued use of the website following changes constitutes
          acceptance of the revised terms.
        </p>
      </section>
    </main>
  );
}

export default Component;
