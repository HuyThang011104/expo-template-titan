/**
 * Account settings screen (G2.4, stack screen).
 *
 * Store-review required: password change, login sessions + remote logout,
 * language (vi/en), theme (sáng/tối), data export (profile + my posts),
 * deactivate (hidden until next login) and 2-step delete (local wipe +
 * back to sign-in). Sections stay independent — one mutation never blocks
 * another — and every failure surfaces inline with retry.
 */

import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import {
  useChangePassword,
  useDeactivateAccount,
  useDeleteAccount,
  useExportMyData,
  useRevokeSession,
  useSessions,
  type AccountSession,
} from "@/entities/account";
import { useMe } from "@/entities/user";
import { useSession } from "@/shared/auth";
import { setDeactivated } from "@/shared/account/deactivation";
import type { Locale } from "@/shared/i18n";
import { useLocale } from "@/shared/i18n/locale-provider";
import { formatRelative } from "@/shared/lib/date";
import { Button, Input, Screen, Text } from "@/shared/ui";
import { useThemePreference, type ThemePreference } from "@/shared/ui/theme/theme-preference";

import { logAccountSettingsOpen } from "../analytics";
import { AudienceOptionGroup } from "../components/audience-option-group";

function Section({ title, children, testID }: { title: string; children: ReactNode; testID: string }) {
  return (
    <View style={styles.section} testID={testID}>
      <Text variant="small" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function PasswordSection() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = (): void => {
    setError(null);
    setDone(false);
    if (next !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Couldn't change your password.");
        },
      },
    );
  };

  return (
    <Section title="Đổi mật khẩu" testID="account-password-section">
      <Input
        label="Mật khẩu hiện tại"
        value={current}
        onChangeText={(text) => {
          setCurrent(text);
          setError(null);
          setDone(false);
        }}
        secureTextEntry
        editable={!change.isPending}
        testID="account-current-password-input"
      />
      <Input
        label="Mật khẩu mới (từ 6 ký tự)"
        value={next}
        onChangeText={(text) => {
          setNext(text);
          setError(null);
          setDone(false);
        }}
        secureTextEntry
        editable={!change.isPending}
        testID="account-new-password-input"
      />
      <Input
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChangeText={(text) => {
          setConfirm(text);
          setError(null);
          setDone(false);
        }}
        secureTextEntry
        editable={!change.isPending}
        testID="account-confirm-password-input"
      />
      {error ? (
        <Text variant="caption" testID="account-password-error">
          {error}
        </Text>
      ) : null}
      {done ? (
        <Text variant="caption" testID="account-password-success">
          Đã đổi mật khẩu.
        </Text>
      ) : null}
      <Button
        title={change.isPending ? "Saving…" : "Đổi mật khẩu"}
        size="sm"
        testID="account-password-save-button"
        disabled={current.length === 0 || next.length === 0 || change.isPending}
        loading={change.isPending}
        onPress={save}
      />
    </Section>
  );
}

function SessionRow({
  session,
  onRevoke,
  revoking,
}: {
  session: AccountSession;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.sessionRow} testID={`account-session-${session.id}`}>
      <View style={styles.sessionTexts}>
        <Text variant="body" style={styles.sessionName}>
          {session.deviceName}{" "}
          {session.current ? (
            <Text variant="caption" color="textSecondary">
              • Thiết bị này
            </Text>
          ) : null}
        </Text>
        <Text variant="caption" color="textSecondary">
          {session.ipAddress} • {formatRelative(session.lastActiveAt)}
        </Text>
      </View>
      {session.current ? (
        confirming ? (
          <Button
            title="Xác nhận"
            variant="secondary"
            size="sm"
            testID={`account-session-revoke-confirm-${session.id}`}
            disabled={revoking}
            loading={revoking}
            onPress={onRevoke}
          />
        ) : (
          <Button
            title="Đăng xuất"
            variant="secondary"
            size="sm"
            testID={`account-session-revoke-${session.id}`}
            disabled={revoking}
            onPress={() => {
              setConfirming(true);
            }}
          />
        )
      ) : (
        <Button
          title="Đăng xuất"
          variant="secondary"
          size="sm"
          testID={`account-session-revoke-${session.id}`}
          disabled={revoking}
          loading={revoking}
          onPress={onRevoke}
        />
      )}
    </View>
  );
}

function SessionsSection() {
  const { signOut } = useSession();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sessions.isPending) {
    return (
      <Section title="Phiên đăng nhập" testID="account-sessions-section">
        <Text variant="body">Loading sessions…</Text>
      </Section>
    );
  }

  if (sessions.isError || !sessions.data) {
    return (
      <Section title="Phiên đăng nhập" testID="account-sessions-section">
        <Text variant="body">Couldn&apos;t load sessions.</Text>
        <Button
          title="Retry"
          size="sm"
          variant="secondary"
          testID="account-sessions-retry-button"
          onPress={() => {
            void sessions.refetch();
          }}
        />
      </Section>
    );
  }

  const handleRevoke = (session: AccountSession): void => {
    setError(null);
    setRevokingId(session.id);
    revoke.mutate(session.id, {
      onSettled: () => {
        setRevokingId(null);
      },
      onSuccess: (result) => {
        // Revoking this device ends the local session too.
        if (result.revokedCurrent) signOut();
      },
      onError: () => {
        setError("Couldn't sign out that session. Tap to retry.");
      },
    });
  };

  return (
    <Section title="Phiên đăng nhập" testID="account-sessions-section">
      {sessions.data.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          revoking={revokingId === session.id}
          onRevoke={() => {
            handleRevoke(session);
          }}
        />
      ))}
      {error ? (
        <Text variant="caption" testID="account-sessions-error">
          {error}
        </Text>
      ) : null}
    </Section>
  );
}

function LanguageSection() {
  const { locale, setOverride } = useLocale();
  return (
    <Section title="Ngôn ngữ" testID="account-language-section">
      <AudienceOptionGroup<Locale>
        title="Ngôn ngữ hiển thị"
        options={[
          { value: "vi", label: "Tiếng Việt" },
          { value: "en", label: "English" },
        ]}
        selected={locale === "vi" ? "vi" : "en"}
        pending={false}
        testID="account-language"
        onSelect={(value) => {
          setOverride(value);
        }}
      />
    </Section>
  );
}

function ThemeSection() {
  const { preference, setPreference } = useThemePreference();
  return (
    <Section title="Giao diện" testID="account-theme-section">
      <AudienceOptionGroup<ThemePreference>
        title="Sáng / tối"
        options={[
          { value: "system", label: "Theo hệ thống" },
          { value: "light", label: "Sáng" },
          { value: "dark", label: "Tối" },
        ]}
        selected={preference}
        pending={false}
        testID="account-theme"
        onSelect={(value) => {
          setPreference(value);
        }}
      />
    </Section>
  );
}

function ExportSection() {
  const exportData = useExportMyData();
  const [error, setError] = useState<string | null>(null);

  return (
    <Section title="Xuất dữ liệu của tôi" testID="account-export-section">
      <Text variant="caption" color="textSecondary">
        Tải profile + bài viết của bạn (JSON).
      </Text>
      {exportData.data ? (
        <Text variant="body" testID="account-export-summary">
          {exportData.data.profile.displayName} (@{exportData.data.profile.handle}) •{" "}
          {exportData.data.posts.length} bài viết • {formatRelative(exportData.data.exportedAt)}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" testID="account-export-error">
          {error}
        </Text>
      ) : null}
      <Button
        title={exportData.isPending ? "Exporting…" : "Xuất JSON"}
        size="sm"
        variant="secondary"
        testID="account-export-button"
        disabled={exportData.isPending}
        loading={exportData.isPending}
        onPress={() => {
          setError(null);
          exportData.mutate(undefined, {
            onError: () => {
              setError("Couldn't export your data. Tap to retry.");
            },
          });
        }}
      />
    </Section>
  );
}

function DeactivateSection() {
  const { signOut } = useSession();
  const deactivate = useDeactivateAccount();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    setError(null);
    deactivate.mutate(undefined, {
      onSuccess: () => {
        // Hidden until the next login re-opens it (mock local semantics).
        setDeactivated();
        signOut();
      },
      onError: () => {
        setError("Couldn't deactivate your account. Tap to retry.");
      },
    });
  };

  return (
    <Section title="Vô hiệu hóa" testID="account-deactivate-section">
      <Text variant="caption" color="textSecondary">
        Ẩn tạm tài khoản. Đăng nhập lại sẽ mở.
      </Text>
      {error ? (
        <Text variant="caption" testID="account-deactivate-error">
          {error}
        </Text>
      ) : null}
      {confirming ? (
        <View style={styles.dangerRow}>
          <Button
            title="Hủy"
            variant="secondary"
            size="sm"
            testID="account-deactivate-cancel-button"
            disabled={deactivate.isPending}
            onPress={() => {
              setConfirming(false);
            }}
          />
          <Button
            title={deactivate.isPending ? "Saving…" : "Xác nhận vô hiệu hóa"}
            variant="primary"
            size="sm"
            testID="account-deactivate-confirm-button"
            disabled={deactivate.isPending}
            loading={deactivate.isPending}
            onPress={submit}
          />
        </View>
      ) : (
        <Button
          title="Vô hiệu hóa tài khoản"
          variant="secondary"
          size="sm"
          testID="account-deactivate-button"
          onPress={() => {
            setConfirming(true);
          }}
        />
      )}
    </Section>
  );
}

function DeleteSection({ handle }: { handle: string }) {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const remove = useDeleteAccount();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim().replace(/^@/, "").toLowerCase() === handle.toLowerCase();

  const submit = (): void => {
    setError(null);
    remove.mutate(undefined, {
      onSuccess: () => {
        // Mock wipe: drop every cached entity + local history, then sign-in.
        qc.clear();
        signOut();
      },
      onError: () => {
        setError("Couldn't delete your account. Tap to retry.");
      },
    });
  };

  return (
    <Section title="Xóa tài khoản" testID="account-delete-section">
      <Text variant="caption" color="textSecondary">
        Không thể hoàn tác. Cần xác nhận 2 bước.
      </Text>
      {error ? (
        <Text variant="caption" testID="account-delete-error">
          {error}
        </Text>
      ) : null}
      {step === 0 ? (
        <Button
          title="Xóa tài khoản"
          variant="secondary"
          size="sm"
          testID="account-delete-button"
          onPress={() => {
            setStep(1);
          }}
        />
      ) : step === 1 ? (
        <View style={styles.dangerColumn}>
          <Text variant="body">
            Tài khoản và dữ liệu local sẽ bị xóa. Bạn có chắc chắn?
          </Text>
          <View style={styles.dangerRow}>
            <Button
              title="Hủy"
              variant="secondary"
              size="sm"
              testID="account-delete-cancel-button"
              onPress={() => {
                setStep(0);
              }}
            />
            <Button
              title="Tôi hiểu, tiếp tục"
              variant="primary"
              size="sm"
              testID="account-delete-continue-button"
              onPress={() => {
                setStep(2);
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.dangerColumn}>
          <Input
            label={`Nhập @${handle} để xác nhận`}
            value={confirmation}
            onChangeText={(text) => {
              setConfirmation(text);
              setError(null);
            }}
            autoCapitalize="none"
            editable={!remove.isPending}
            testID="account-delete-confirm-input"
          />
          <View style={styles.dangerRow}>
            <Button
              title="Hủy"
              variant="secondary"
              size="sm"
              testID="account-delete-back-button"
              disabled={remove.isPending}
              onPress={() => {
                setStep(1);
              }}
            />
            <Button
              title={remove.isPending ? "Deleting…" : "Xác nhận xóa"}
              variant="primary"
              size="sm"
              testID="account-delete-confirm-button"
              disabled={!matches || remove.isPending}
              loading={remove.isPending}
              onPress={submit}
            />
          </View>
        </View>
      )}
    </Section>
  );
}

export function AccountSettingsScreen() {
  const me = useMe();

  useEffect(() => {
    logAccountSettingsOpen();
  }, []);

  if (me.isPending) {
    return (
      <Screen style={styles.center} testID="account-settings-screen">
        <Text variant="body">Loading account settings…</Text>
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen style={styles.center} testID="account-settings-screen">
        <Text variant="title">Tài khoản</Text>
        <Text variant="body">Couldn&apos;t load your account.</Text>
        <Button
          title="Retry"
          testID="account-settings-retry-button"
          onPress={() => {
            void me.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="account-settings-screen">
      <ScrollView>
        <PasswordSection />
        <SessionsSection />
        <LanguageSection />
        <ThemeSection />
        <ExportSection />
        <DeactivateSection />
        <DeleteSection handle={me.data.handle} />
        <View style={styles.bottomPad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  section: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: "700",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  sessionTexts: {
    flex: 1,
    gap: 2,
  },
  sessionName: {
    fontWeight: "700",
  },
  dangerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  dangerColumn: {
    gap: 8,
  },
  bottomPad: {
    height: 24,
  },
});
