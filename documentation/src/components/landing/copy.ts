export const GITHUB_URL =
  'https://github.com/HuyThang011104/expo-template-titan';
export const FEEDBACK_URL =
  'https://github.com/HuyThang011104/expo-template-titan/issues/new?labels=docs';
export const DOCS_URL = '/docs/introduction/overview';
export const SCAFFOLD_CMD = 'pnpm create expo-titan@latest MyApp';

export const STACK_BADGES = [
  'Expo SDK 57',
  'React Native 0.86',
  'React 19.2',
  'New Architecture',
  'TanStack Query',
  'FlashList',
  'EAS Update',
] as const;

export const CONTRACTS = [
  {
    title: 'Thin routes',
    body: 'src/app holds only routes + _layout. Screens, hooks and API calls live in features.',
  },
  {
    title: 'One-way deps',
    body: 'app → features → entities → shared. CI rejects cross-feature imports via eslint-plugin-boundaries.',
  },
  {
    title: 'Config-native',
    body: 'No android/ or ios/ in git. Native comes from CNG + config plugins in plugins/ and modules/.',
  },
  {
    title: 'Shared kernel',
    body: 'Session, query client, realtime socket and media pipeline are built once in shared/, not per screen.',
  },
] as const;

export const INCLUDED = [
  {
    title: 'Auth + session gate',
    body: 'Secure Store tokens, SessionProvider, Stack.Protected and NativeTabs.Protected. Boots to mock login with no backend.',
  },
  {
    title: 'Normalized Post cache',
    body: "One canonical query ['post', id]. Lists hold ids — one like patches the entity and every list follows.",
  },
  {
    title: 'Feed reference vertical',
    body: 'Home feed, post detail, composer and profile show how a feature slice is structured end to end.',
  },
  {
    title: 'Media + offline kernel',
    body: 'expo-image / video / audio, resumable upload, SQLite drafts, NetInfo online-manager.',
  },
  {
    title: 'Ship pipeline',
    body: 'EAS profiles for development / preview / production plus EAS Update for daily JS-only deploys.',
  },
  {
    title: 'Quality gates',
    body: 'Typecheck, boundary lint, Maestro e2e flows and typed env via EXPO_PUBLIC_* variables.',
  },
] as const;

export type ShowcaseId = 'route' | 'cache' | 'gate';

export const SHOWCASES: Record<
  ShowcaseId,
  {label: string; file: string; code: string}
> = {
  route: {
    label: 'Thin route',
    file: 'src/app/(app)/(home)/index.tsx',
    code: `import { HomeFeedScreen } from "@/features/feed";\n\nexport default HomeFeedScreen;`,
  },
  cache: {
    label: 'Canonical cache',
    file: 'src/entities/post/cache.ts',
    code: `// One like patches ['post', id] — every list follows.\nqueryClient.setQueryData(['post', id], (post) =>\n  post ? { ...post, liked: true, likes: post.likes + 1 } : post,\n);`,
  },
  gate: {
    label: 'Auth gate',
    file: 'src/app/(app)/_layout.tsx',
    code: `<Stack.Protected guard={session != null}>\n  <Stack.Screen name="(home)" />\n</Stack.Protected>`,
  },
};

export const SHOWCASE_ORDER: ShowcaseId[] = ['route', 'cache', 'gate'];

export const QUICKSTART = [
  {
    title: 'Scaffold',
    cmd: SCAFFOLD_CMD,
    body: 'Zero-prompt template. Bundle ID and scheme get safe defaults.',
  },
  {
    title: 'Run',
    cmd: 'cd MyApp && pnpm start',
    body: 'Web / Expo Go with mock data. No EAS login, no backend needed.',
  },
  {
    title: 'Ship JS',
    cmd: 'eas update --branch preview',
    body: 'Daily JS ships over the air. Rebuild native only for SDK or config changes.',
  },
] as const;

export const COMPARISON: Array<{
  label: string;
  titan: string;
  bare: string;
}> = [
  {
    label: 'Module boundaries',
    titan: 'Enforced by lint',
    bare: 'By convention',
  },
  {
    label: 'Post cache',
    titan: "Normalized ['post', id]",
    bare: 'Per-screen fetch',
  },
  {
    label: 'Auth session',
    titan: 'Shared kernel + Protected',
    bare: 'Rebuilt each app',
  },
  {
    label: 'Native projects',
    titan: 'CNG from config',
    bare: 'Manual prebuild edits',
  },
  {
    label: 'OTA updates',
    titan: 'EAS Update wired',
    bare: 'DIY',
  },
];
