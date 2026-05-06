import Link from "next/link";

export default function SiteNav() {
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-logo" aria-label="ARIT Home">
          <img src="/arit-logo.svg" alt="" width={26} height={31} />
          <span className="site-nav-wordmark">ARIT</span>
          <span className="site-nav-sep" aria-hidden="true" />
          <span className="site-nav-product">Home</span>
        </Link>
      </div>
    </nav>
  );
}
