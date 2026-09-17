export const loader = async () => {
  return { title: "Contact Us" };
};

export function Component() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold text-ink">Contact Us</h1>
      <p className="mt-3 text-ink-soft">
        Have a question or need assistance? We are here to help.
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Get in Touch</h2>
          <ul className="mt-4 space-y-3 text-ink-soft">
            <li>
              <span className="block text-sm font-medium text-ink-faint uppercase tracking-wide">Email</span>
              <a href="mailto:support@sripon.in" className="text-brand-600 hover:underline">
                support@sripon.in
              </a>
            </li>
            <li>
              <span className="block text-sm font-medium text-ink-faint uppercase tracking-wide">Phone</span>
              <a href="tel:+919876543210" className="text-brand-600 hover:underline">
                +91 98765 43210
              </a>
            </li>
            <li>
              <span className="block text-sm font-medium text-ink-faint uppercase tracking-wide">Address</span>
              <span>123 Festival Lane, Sivakasi,<br />Tamil Nadu — 626 189, India</span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Send a Message</h2>
          <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-faint">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border border-surface bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-faint">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-surface bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-ink-faint">Message</label>
              <textarea
                id="message"
                rows={4}
                placeholder="How can we help?"
                className="mt-1 w-full resize-none rounded-lg border border-surface bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600/90"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold text-ink">Follow Us</h2>
        <p className="mt-2 text-ink-soft">Stay connected for offers, updates, and festive specials.</p>
        <div className="mt-4 flex gap-4">
          <a href="#" className="rounded-lg border border-surface px-4 py-2 text-sm text-ink-soft transition-colors hover:border-brand-600 hover:text-brand-600">
            Facebook
          </a>
          <a href="#" className="rounded-lg border border-surface px-4 py-2 text-sm text-ink-soft transition-colors hover:border-brand-600 hover:text-brand-600">
            Instagram
          </a>
          <a href="#" className="rounded-lg border border-surface px-4 py-2 text-sm text-ink-soft transition-colors hover:border-brand-600 hover:text-brand-600">
            WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

export default Component;
