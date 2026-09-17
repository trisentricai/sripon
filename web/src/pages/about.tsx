export const loader = async () => {
  return { title: "About Us" };
};

export function Component() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">About SriPon</h1>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Our Story</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          SriPon is your trusted destination for premium crackers and fireworks,
          bringing the joy of celebration to households across the country. What
          started as a small family venture has grown into a reliable online
          store serving thousands of happy customers every festive season.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Our Mission</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          We believe every celebration deserves the sparkle of high-quality
          fireworks without compromise. Our mission is to make premium
          crackers accessible, affordable, and safe — delivered right to your
          doorstep so you can focus on creating memories with your loved ones.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Quality You Can Trust</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Every product at SriPon is sourced from certified manufacturers who
          adhere to strict safety and quality standards. We carefully inspect
          and curate our collection so that you receive nothing but the best.
          From vibrant colour sparklers to thundering aerial shells, our range
          is designed to light up every occasion.
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-brand-600/20 bg-brand-600/5 p-6">
        <h2 className="font-display text-2xl font-semibold text-brand-600">Our Safety Pledge</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Safety is at the heart of everything we do. We partner exclusively
          with manufacturers who follow government-approved processes, and we
          provide clear usage guidelines with every order. Our packaging meets
          transport safety regulations, ensuring your fireworks arrive intact
          and secure. Celebrate responsibly — because your safety is our
          priority.
        </p>
      </section>
    </main>
  );
}

export default Component;
