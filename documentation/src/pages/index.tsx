import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import { CopyCommand } from '../components/landing/Terminal';
import {
  DOCS_URL,
  GITHUB_URL,
  SCAFFOLD_CMD,
  STACK_BADGES,
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
          {siteConfig.title}: production boilerplate for Expo
        </Heading>
        <p className="hero__subtitle">
          Enforced boundaries, normalized cache, config-generated native. A
          working feed out of the box, ready for real product logic.
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

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — production Expo boilerplate`}
      description="Titan: Expo SDK 57 production boilerplate with thin routes, one-way dependencies, normalized cache, and EAS Update.">
      <HomepageHeader />
      <main>
        <StackBar />
      </main>
    </Layout>
  );
}
