import { useState } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import {
  Avatar,
  Badge,
  Button,
  Card,
  ComposerInput,
  CounterRing,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  IconButton,
  Input,
  ListItem,
  LoadingState,
  PressableScale,
  Screen,
  Skeleton,
  Spinner,
  Tabs,
  TextArea,
  Text,
  iconNames,
  useTheme,
  type Theme,
} from "../index";

/**
 * Dev-only gallery of the design system (spec §11): color roles, typography,
 * spacing/radius/elevation, icons, button matrix, inputs, avatar/badge,
 * list items/tabs, states and skeleton. Every new shared component must be
 * added here in the same PR. Product strings are intentionally not localized.
 */

const SEMANTIC_COLORS = [
  "background",
  "surface",
  "surfaceElevated",
  "surfaceSunken",
  "surfaceMuted",
  "border",
  "borderStrong",
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "textInverse",
  "primary",
  "primaryPressed",
  "primarySoft",
  "onPrimary",
  "brand",
  "success",
  "successSoft",
  "warning",
  "warningSoft",
  "danger",
  "dangerSoft",
  "onDanger",
  "skeleton",
  "focusRing",
] as const;

const TYPOGRAPHY_VARIANTS = [
  "display",
  "h1",
  "h2",
  "h3",
  "bodyStrong",
  "body",
  "labelStrong",
  "label",
  "caption",
  "overline",
] as const;

export function DesignLabScreen() {
  const theme = useTheme();

  return (
    <Screen scroll testID="design-lab">
      <View style={styles.content}>
        <Text variant="overline" color="textSecondary">
          Design Lab — dev only
        </Text>
        <Text variant="h2">Design system v1.1</Text>
        <Text variant="body" color="textSecondary">
          Theme: {theme.name}
        </Text>

        <ColorSection theme={theme} />
        <TypographySection />
        <SpaceSection theme={theme} />
        <RadiusSection theme={theme} />
        <ElevationSection theme={theme} />
        <IconSection />
        <ButtonSection />
        <IconButtonSection />
        <InputSection />
        <FeelPrimitivesSection />
        <AvatarSection />
        <BadgeSection />
        <ListItemSection />
        <TabsSection />
        <StateSection />
        <SkeletonSection />
        <MiscSection />
      </View>
    </Screen>
  );
}

function Section({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text variant="overline" color="textSecondary">
        {title}
      </Text>
      <View style={{ gap: theme.space[2] }}>{children}</View>
    </View>
  );
}

function ColorSection({ theme }: { theme: Theme }) {
  return (
    <Section title="Color roles">
      <View style={styles.swatchGrid}>
        {SEMANTIC_COLORS.map((name) => (
          <View key={name} style={styles.swatchItem}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: theme.color[name],
                  borderColor: theme.color.border,
                },
              ]}
            />
            <Text variant="caption" color="textSecondary">
              {name}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function TypographySection() {
  return (
    <Section title="Typography">
      {TYPOGRAPHY_VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {variant} — The quick brown fox
        </Text>
      ))}
    </Section>
  );
}

function SpaceSection({ theme }: { theme: Theme }) {
  const steps = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;
  return (
    <Section title="Spacing">
      {steps.map((step) => (
        <View key={step} style={styles.spaceRow}>
          <View
            style={{
              width: theme.space[step],
              height: 12,
              backgroundColor: theme.color.primary,
              borderRadius: theme.radius.xs,
            }}
          />
          <Text variant="caption" color="textSecondary">
            space[{step}] = {theme.space[step]}
          </Text>
        </View>
      ))}
    </Section>
  );
}

function RadiusSection({ theme }: { theme: Theme }) {
  const names = ["none", "xs", "sm", "md", "lg", "xl", "full"] as const;
  return (
    <Section title="Radius">
      <View style={styles.swatchGrid}>
        {names.map((name) => (
          <View key={name} style={styles.swatchItem}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: Math.min(theme.radius[name], 24),
                backgroundColor: theme.color.primarySoft,
                borderWidth: 1,
                borderColor: theme.color.primary,
              }}
            />
            <Text variant="caption" color="textSecondary">
              {name}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function ElevationSection({ theme }: { theme: Theme }) {
  const names = ["none", "card", "popover", "modal"] as const;
  const platform = Platform.OS === "android" ? "android" : "ios";
  return (
    <Section title="Elevation">
      {names.map((name) => (
        <View
          key={name}
          style={[
            styles.elevationBox,
            theme.elevation[name][platform],
            {
              backgroundColor: theme.color.surfaceElevated,
              borderColor: theme.color.border,
            },
          ]}
        >
          <Text variant="label">{name}</Text>
        </View>
      ))}
    </Section>
  );
}

function IconSection() {
  return (
    <Section title="Icons">
      <View style={styles.iconGrid}>
        {iconNames.map((name) => (
          <View key={name} style={styles.iconItem}>
            <Icon name={name} size="lg" />
            <Text variant="caption" color="textSecondary">
              {name}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <Section title="Buttons">
      {(["primary", "secondary", "outline", "ghost", "danger"] as const).map((variant) => (
        <View key={variant} style={styles.buttonRow}>
          {(["sm", "md", "lg"] as const).map((size) => (
            <Button
              key={size}
              title={`${variant}/${size}`}
              variant={variant}
              size={size}
              onPress={() => undefined}
            />
          ))}
        </View>
      ))}
      <View style={styles.buttonRow}>
        <Button title="Disabled" onPress={() => undefined} disabled />
        <Button
          title={loading ? "Loading" : "Toggle loading"}
          loading={loading}
          onPress={() => setLoading((value) => !value)}
        />
      </View>
      <Button title="Icon left" icon="plus" onPress={() => undefined} />
      <Button
        title="Icon right"
        icon="chevronRight"
        iconPosition="right"
        variant="secondary"
        onPress={() => undefined}
      />
      <Button title="Full width" fullWidth onPress={() => undefined} />
    </Section>
  );
}

function IconButtonSection() {
  return (
    <Section title="Icon buttons">
      <View style={styles.buttonRow}>
        {(["ghost", "primary", "secondary", "danger"] as const).map((variant) => (
          <IconButton
            key={variant}
            icon="heart"
            variant={variant}
            accessibilityLabel={`Heart ${variant}`}
            onPress={() => undefined}
          />
        ))}
        <IconButton
          icon="settings"
          disabled
          accessibilityLabel="Settings disabled"
          onPress={() => undefined}
        />
      </View>
    </Section>
  );
}

function InputSection() {
  const [value, setValue] = useState("");
  const [bio, setBio] = useState("");
  return (
    <Section title="Inputs and fields">
      <Input
        value={value}
        onChangeText={setValue}
        label="Email"
        placeholder="you@example.com"
        leadingIcon="profile"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="lab-input"
      />
      <Input
        value={value}
        onChangeText={setValue}
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        error="Password must be at least 8 characters"
      />
      <Input
        value={value}
        onChangeText={setValue}
        label="Username"
        helper="Only letters, numbers and dots."
        counter
        maxLength={20}
        trailingIcon="check"
      />
      <Field label="Bio" counter={`${bio.length}/160`}>
        <TextArea value={bio} onChangeText={setBio} maxLength={160} placeholder="Tell us…" />
      </Field>
    </Section>
  );
}

function FeelPrimitivesSection() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const warnFrom = 260 / 280;

  return (
    <Section title="Feel primitives">
      <Text variant="caption" color="textSecondary">
        Reduce motion: {reduceMotion ? "on" : "off"}
      </Text>
      <PressableScale
        onPress={() => undefined}
        testID="lab-pressable-scale"
        style={{
          alignSelf: "flex-start",
          backgroundColor: theme.color.primary,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.space[4],
          paddingVertical: theme.space[2],
        }}
      >
        <Text variant="labelStrong" color="onPrimary">
          Press and hold
        </Text>
      </PressableScale>
      <ComposerInput
        value={draft}
        onChangeText={setDraft}
        placeholder="What's happening?"
        testID="lab-composer-input"
      />
      <View style={styles.buttonRow}>
        <CounterRing value={0} max={280} warnFrom={warnFrom} testID="lab-counter-ring-hidden" />
        <CounterRing value={260} max={280} warnFrom={warnFrom} testID="lab-counter-ring-primary" />
        <CounterRing value={280} max={280} warnFrom={warnFrom} testID="lab-counter-ring-warning" />
        <CounterRing value={285} max={280} warnFrom={warnFrom} testID="lab-counter-ring-danger" />
      </View>
    </Section>
  );
}

function AvatarSection() {
  return (
    <Section title="Avatars">
      <View style={styles.buttonRow}>
        {([24, 32, 40, 48, 64, 96] as const).map((size) => (
          <Avatar key={size} displayName="Ada Lovelace" avatarUrl={null} size={size} />
        ))}
      </View>
    </Section>
  );
}

function BadgeSection() {
  return (
    <Section title="Badges">
      <View style={styles.buttonRow}>
        <Badge count={3} />
        <Badge count={150} tone="danger" />
        <Badge count={7} tone="neutral" />
        <Badge variant="dot" tone="danger" />
        <Badge variant="dot" tone="primary" />
        <Badge variant="dot" tone="neutral" />
      </View>
    </Section>
  );
}

function ListItemSection() {
  return (
    <Section title="List items">
      <Card padding={0}>
        <ListItem
          title="Settings"
          subtitle="Account, notifications, privacy"
          leading={<Icon name="settings" />}
          trailing={<Icon name="chevronRight" color="textTertiary" />}
          onPress={() => undefined}
          testID="lab-list-item"
        />
        <Divider inset={4} />
        <ListItem
          title="Static row"
          subtitle="Not pressable"
          leading={<Icon name="inbox" />}
        />
        <Divider inset={4} />
        <ListItem
          title="Ada Lovelace"
          subtitle="@ada"
          leading={<Avatar displayName="Ada Lovelace" avatarUrl={null} size={40} />}
          trailing={<Button title="Follow" size="sm" onPress={() => undefined} />}
          onPress={() => undefined}
        />
      </Card>
    </Section>
  );
}

function TabsSection() {
  const [underline, setUnderline] = useState("posts");
  const [segmented, setSegmented] = useState("top");
  return (
    <Section title="Tabs">
      <Tabs
        variant="underline"
        items={[
          { key: "posts", label: "Posts" },
          { key: "saved", label: "Saved" },
        ]}
        value={underline}
        onChange={setUnderline}
        testID="lab-tabs-underline"
      />
      <Tabs
        variant="segmented"
        items={[
          { key: "top", label: "Top" },
          { key: "latest", label: "Latest" },
          { key: "people", label: "People" },
        ]}
        value={segmented}
        onChange={setSegmented}
        testID="lab-tabs-segmented"
      />
    </Section>
  );
}

function StateSection() {
  return (
    <Section title="States">
      <EmptyState
        title="Nothing here yet"
        description="When there is something, it will show up here."
        actionLabel="Take me home"
        onAction={() => undefined}
        testID="lab-empty-state"
      />
      <ErrorState onRetry={() => undefined} testID="lab-error-state" />
      <LoadingState variant="spinner" testID="lab-loading-spinner" />
      <LoadingState variant="skeleton" rows={3} testID="lab-loading-skeleton" />
    </Section>
  );
}

function SkeletonSection() {
  const theme = useTheme();
  return (
    <Section title="Skeleton">
      <View style={{ gap: theme.space[3] }}>
        <Skeleton height={12} width="30%" />
        <Skeleton height={16} />
        <Skeleton height={16} width="80%" />
        <Skeleton height={96} radius="lg" />
      </View>
    </Section>
  );
}

function MiscSection() {
  return (
    <Section title="Misc">
      <Spinner testID="lab-spinner" accessibilityLabel="Loading" />
      <Spinner size="sm" />
      <Divider />
      <Card testID="lab-card">
        <Text variant="h3">Card</Text>
        <Text variant="body" color="textSecondary">
          Surface + border + radius lg, elevation card.
        </Text>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingVertical: 16,
  },
  section: {
    gap: 8,
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  swatchItem: {
    width: 96,
    gap: 4,
  },
  swatch: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  spaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  elevationBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconItem: {
    width: 72,
    alignItems: "center",
    gap: 4,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
});
