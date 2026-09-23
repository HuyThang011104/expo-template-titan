import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

import { CopyCommand } from '../components/landing/Terminal';
import {
  COMPARISON,
  CONTRACTS,
  DOCS_URL,
  FEEDBACK_URL,
  GITHUB_URL,
  INCLUDED,
  QUICKSTART,
  SCAFFOLD_CMD,
  SHOWCASE_ORDER,
  SHOWCASES,
  STACK_BADGES,
  type ShowcaseId,
} from '../components/landing/copy';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <p className={styles.eyebrow}>
          Expo SDK 57 &bull; React Native 0.86 &bull; New Architecture
        </p>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}: production boilerplate for Expo apps
        </Heading>
        <p className="hero__subtitle">
          Thin routes, one-way dependencies, config-generated native, EAS
          Update. Clone it, mock-login to a working feed, then build product
          logic.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to={DOCS_URL}>
            Get Started
          </Link>
          <Link className="button button--outline button--lg" href={GITHUB_URL}>
            GitHub
          </Link>
        </div>
        <div className={styles.terminalWrap}>
          <CopyCommand cmd={SCAFFOLD_CMD} />
          <p className={styles.terminalHint}>
            {siteConfig.tagline} &bull; No EAS login needed for{' '}
            <code>pnpm start</code>
          </p>
        </div>
      </div>
    </header>
  );
}

function StackBar() {
  return (
    <section className={styles.strip} aria-label="Stack">
      <div className="container">
        <ul className={styles.badgeRow}>
          {STACK_BADGES.map((b) => (
            <li key={b} className={styles.badge}>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Contracts() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Four contracts that survive production
        </Heading>
        <p className={styles.sectionSub}>
          The rules CI actually enforces. Everything else is just a screen.
        </p>
        <div className={styles.grid4}>
          {CONTRACTS.map((c, i) => (
            <div key={c.title} className={styles.card}>
              <span className={styles.cardIndex}>0{i + 1}</span>
              <Heading as="h3" className={styles.cardTitle}>
                {c.title}
              </Heading>
              <p className={styles.cardBody}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Architecture at a glance
        </Heading>
        <p className={styles.sectionSub}>
          One dependency direction. A concept used twice moves down to{' '}
          <code>entities</code> or <code>shared</code>.
        </p>
        <div className={styles.split}>
          <div className={styles.codeCard}>
            <p className={styles.codeTitle}>Dependency flow</p>
            <pre className={styles.code}>
              {`app (routes)
  → features/*
    → entities/*   (Post, User)
      → shared/*   (ui, api, theme)`}
            </pre>
          </div>
          <div className={styles.codeCard}>
            <p className={styles.codeTitle}>src/ layout</p>
            <pre className={styles.code}>
              {`src/
├── app/            # ONLY routes
├── features/       # feed, composer, …
├── entities/       # canonical cache
├── shared/         # kernel
└── app-providers.tsx`}
            </pre>
          </div>
        </div>
        <Link to="/docs/introduction/project-structure">
          Read project structure →
        </Link>
      </div>
    </section>
  );
}

function Included() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          What you get on day one
        </Heading>
        <p className={styles.sectionSub}>
          A working social vertical on top of a reusable kernel.
        </p>
        <div className={styles.grid3}>
          {INCLUDED.map((f) => (
            <div key={f.title} className={styles.card}>
              <Heading as="h3" className={styles.cardTitle}>
                {f.title}
              </Heading>
              <p className={styles.cardBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  const [active, setActive] = useState<ShowcaseId>('route');
  const current = SHOWCASES[active];
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          The kernel in 5 lines
        </Heading>
        <p className={styles.sectionSub}>
          Copy pasted from the real files — not simplified for docs.
        </p>
        <div className={styles.tabs} role="tablist">
          {SHOWCASE_ORDER.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={active === id}
              type="button"
              onClick={() => setActive(id)}
              className={clsx(
                styles.tab,
                active === id && styles.tabActive,
              )}>
              {SHOWCASES[id].label}
            </button>
          ))}
        </div>
        <div className={styles.codeCard}>
          <p className={styles.codeTitle}>{current.file}</p>
          <pre className={styles.code}>{current.code}</pre>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Titan vs bare Expo template
        </Heading>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Concern</th>
                <th scope="col">Titan</th>
                <th scope="col">Bare template</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>
                    <strong>{row.titan}</strong>
                  </td>
                  <td>{row.bare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Quickstart() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Boot to a working feed in 3 steps
        </Heading>
        <div className={styles.grid3}>
          {QUICKSTART.map((s, i) => (
            <div key={s.title} className={styles.card}>
              <span className={styles.cardIndex}>0{i + 1}</span>
              <Heading as="h3" className={styles.cardTitle}>
                {s.title}
              </Heading>
              <code className={styles.inlineCmd}>{s.cmd}</code>
              <p className={styles.cardBody}>{s.body}</p>
            </div>
          ))}
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to={DOCS_URL}>
            Read the overview
          </Link>
          <Link className="button button--outline button--lg" href={GITHUB_URL}>
            Star on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <Heading as="h2">Stop rebuilding kernel. Ship product.</Heading>
        <p>
          Found a gap or a bad default? File a docs-labeled issue — the docs
          rewrite is in progress.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            href={GITHUB_URL}>
            Get Titan
          </Link>
          <Link
            className="button button--outline button--lg"
            href={FEEDBACK_URL}>
            Docs feedback
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — production Expo boilerplate`}
      description="Titan: Expo SDK 57 production boilerplate with thin routes, one-way dependencies, normalized cache, and EAS Update.">
      <HomepageHeader />
      <main>
        <StackBar />
        <Contracts />
        <Architecture />
        <Included />
        <Showcase />
        <Comparison />
        <Quickstart />
        <FinalCta />
      </main>
    </Layout>
  );
}
