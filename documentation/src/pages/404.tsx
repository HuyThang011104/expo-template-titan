import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function NotFound(): ReactNode {
  return (
    <Layout title="Page not found" description="The page you asked for does not exist.">
      <main className="container margin-vert--xl">
        <Heading as="h1">Page not found</Heading>
        <p>This page moved or never existed. Start from the homepage instead:</p>
        <p>
          <Link className="button button--primary" to="/">
            Go to homepage
          </Link>
        </p>
      </main>
    </Layout>
  );
}
