// Template reference demo (Expo init). Internal to `features/showcase`.
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText, ThemedView, spacing } from '@/shared/ui';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  return (
    <View style={styles.stepRow}>
      <ThemedText type="small">{title}</ThemedText>
      <ThemedView type="backgroundSelected" style={styles.codeSnippet}>
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeSnippet: {
    borderRadius: spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
});
