import Link from "next/link";

const featureCards = [
  {
    title: "Shared attendance",
    description:
      "Owners can mark attendance quickly, and each worker can check only the days meant for them.",
  },
  {
    title: "Built for mobile",
    description:
      "Large controls, clean monthly history, and a layout that feels simple on everyday phones.",
  },
  {
    title: "Ready for Vercel and Supabase",
    description:
      "This version is structured for deployment, auth, row-level security, and multi-household growth.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>

      <section className="hero card">
        <div className="hero-copy">
          <p className="eyebrow">Arit Product Track</p>
          <h1>Househelp attendance that feels easy for both families and staff.</h1>
          <p className="hero-text">
            This app now follows a proper Vercel + Supabase route, so we can grow
            it from a personal utility into a shared product.
          </p>

          <div className="hero-actions">
            <Link className="primary-button" href="/sign-in">
              Continue with email
            </Link>
            <Link className="secondary-button" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-note">
            <p>
              First step: deploy this as its own app. Later, we can mount it under
              `arit.co.in/products/...` or a subdomain without changing the core
              data model.
            </p>
          </div>

          <div className="hero-stack">
            <div className="stack-chip">Next.js App Router</div>
            <div className="stack-chip">Vercel Deployment</div>
            <div className="stack-chip">Supabase Auth + DB</div>
            <div className="stack-chip">Row-Level Security</div>
          </div>
        </div>
      </section>

      <section className="feature-section">
        {featureCards.map((feature) => (
          <article key={feature.title} className="card feature-card">
            <p className="section-kicker">Feature</p>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
