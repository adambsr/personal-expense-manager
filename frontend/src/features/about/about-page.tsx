import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Layers3,
  Wallet,
} from "lucide-react";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import { DashboardReturnLink } from "@/components/dashboard-return-link";
import "../../App.css";

const features = [
  {
    icon: Activity,
    title: "Income & expenses",
    description: "Record money coming in and going out, and see how each affects your monthly balance.",
    tone: "about-feature-violet",
  },
  {
    icon: Layers3,
    title: "Predefined categories",
    description: "Organize activity with ready-to-use categories that make each transaction easier to understand.",
    tone: "about-feature-blue",
  },
  {
    icon: BarChart3,
    title: "Financial dashboard",
    description: "See monthly income, spending, and balance together with a visual overview of activity.",
    tone: "about-feature-green",
  },
  {
    icon: Clock3,
    title: "Transaction history",
    description: "Review, search, and filter your past transactions whenever you need the details.",
    tone: "about-feature-amber",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analytics",
    description: "Use clear charts to spot patterns in your income and expenses over time.",
    tone: "about-feature-rose",
  },
];

export default function AboutPage() {
  return (
    <div className="app-shell">
      <DashboardSidebar activePage="About" />
      <main className="dashboard-main about-main">
        <header className="page-header about-page-header">
          <div className="page-heading">
            <DashboardReturnLink />
            <h1>About</h1>
            <p>A clearer view of your everyday finances.</p>
          </div>
        </header>

        <div className="about-content">
          <section className="about-intro" aria-labelledby="about-product-name">
            <div className="about-intro-copy">
              <div className="about-brand-mark" aria-hidden="true"><Wallet size={25} strokeWidth={2} /></div>
              <h2 id="about-product-name">Personal Expense Manager</h2>
              <p>
                A simple place to keep track of your money. Record income and expenses, organize transactions,
                and understand your monthly activity at a glance.
              </p>
            </div>
            <div className="about-intro-art" aria-hidden="true">
              <div className="about-art-orbit about-art-orbit-one" />
              <div className="about-art-orbit about-art-orbit-two" />
              <div className="about-art-card about-art-card-main">
                <span className="about-art-label"><CalendarDays size={14} /> Monthly overview</span>
                <span className="about-art-amount">Your finances, in focus</span>
                <span className="about-art-rule"><i /><i /><i /></span>
              </div>
              <div className="about-art-card about-art-card-income"><ArrowDownLeft size={15} /><span>Income</span></div>
              <div className="about-art-card about-art-card-expense"><ArrowUpRight size={15} /><span>Expenses</span></div>
            </div>
          </section>

          <section className="about-section" aria-labelledby="about-features-title">
            <div className="about-section-heading">
              <div>
                <h2 id="about-features-title">Made for everyday money management</h2>
                <p>The essentials for staying close to your financial activity.</p>
              </div>
              <span className="about-feature-count">05 features</span>
            </div>
            <div className="about-feature-grid">
              {features.map(({ icon: Icon, title, description, tone }, index) => (
                <article className={`about-feature-card ${index === 0 ? "about-feature-card-wide" : ""}`} key={title}>
                  <span className={`about-feature-icon ${tone}`} aria-hidden="true"><Icon size={19} strokeWidth={1.9} /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* <section className="about-bottom-grid" aria-label="Application details">
            <article className="about-stack-panel">
              <div className="about-detail-heading">
                <span className="about-detail-icon" aria-hidden="true"><Layers3 size={17} /></span>
                <div><h2>Built with</h2><p>The tools behind the app</p></div>
              </div>
              <ul className="about-stack-list">
                {stack.map((technology) => <li key={technology}>{technology}</li>)}
              </ul>
            </article>
            <article className="about-version-panel">
              <div className="about-detail-heading">
                <span className="about-detail-icon about-version-icon" aria-hidden="true"><CircleHelp size={17} /></span>
                <div><h2>Application details</h2><p>About this release</p></div>
              </div>
              <div className="about-version-row"><span>Application</span><strong>Personal Expense Manager</strong></div>
              <div className="about-version-row"><span>Version</span><strong>{packageMetadata.version}</strong></div>
            </article>
          </section> */}
        </div>

        {/* <footer className="page-footer about-footer">
          <span>Personal Expense Manager</span>
          <span className="footer-divider" aria-hidden="true">·</span>
          <span>Everyday finances, made clearer.</span>
          <span className="footer-spacer" />
          <a href="/about" onClick={(event) => handleClientNavigation(event, "/about")}>About this app</a>
        </footer> */}
      </main>
    </div>
  );
}
