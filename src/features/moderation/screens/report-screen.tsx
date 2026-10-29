/**
 * Report screen (F6, `formSheet`).
 *
 * - Target comes from route params (`targetType=post|user`, `targetId`).
 * - Reason radio + optional details → submit once → dismiss.
 * - Details are never logged (PII).
 */

import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Input, Screen, Text, useTheme } from "@/shared/ui";

import { logReportOpen, logReportSubmit } from "../analytics";
import { ReportReasonList } from "../components/report-reason-list";
import { REPORT_DETAILS_MAX_LENGTH, type ReportReason, type ReportTargetType } from "../model";
import { useSubmitReport } from "../mutations/use-safety";
import { validateReportInput } from "../validation";

export function handleReportDismiss(): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/");
}

export function ReportScreen() {
  const theme = useTheme();
  const { targetType, targetId } = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
  }>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submitMutation = useSubmitReport();

  const validTarget = targetType === "post" || targetType === "user";
  const typedTarget: ReportTargetType = targetType === "user" ? "user" : "post";

  useEffect(() => {
    if (validTarget) logReportOpen(typedTarget);
  }, [validTarget, typedTarget]);

  if (!validTarget || typeof targetId !== "string" || targetId.trim().length === 0) {
    return (
      <Screen style={styles.center} testID="report-screen">
        <Text variant="body">Missing report target.</Text>
        <Button
          title="Dismiss"
          variant="secondary"
          size="sm"
          testID="report-dismiss-button"
          onPress={handleReportDismiss}
        />
      </Screen>
    );
  }

  const busy = submitMutation.isPending;
  const canSubmit = reason !== null && !busy;

  async function handleSubmit(): Promise<void> {
    setError(null);
    const checked = validateReportInput({ targetType, targetId, reason, details });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    logReportSubmit(checked.value.targetType, checked.value.reason);
    try {
      await submitMutation.mutateAsync(checked.value);
      handleReportDismiss();
    } catch {
      setError("Couldn't send your report. Try again.");
    }
  }

  return (
    <Screen testID="report-screen">
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              title="Dismiss"
              variant="ghost"
              size="sm"
              testID="report-dismiss-button"
              onPress={handleReportDismiss}
            />
          ),
          headerRight: () => (
            <Button
              title={busy ? "Sending…" : "Submit"}
              variant="primary"
              size="sm"
              testID="report-submit-button"
              disabled={!canSubmit}
              loading={busy}
              style={{ borderRadius: theme.radius.full }}
              onPress={() => {
                void handleSubmit();
              }}
            />
          ),
        }}
      />
      <View style={styles.root}>
        <ReportReasonList
          selected={reason}
          onSelect={(next) => {
            setReason(next);
            if (error) setError(null);
          }}
        />

        <Input
          value={details}
          onChangeText={(next) => {
            setDetails(next);
            if (error) setError(null);
          }}
          placeholder="Details (optional)"
          multiline
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          editable={!busy}
          testID="report-input"
          accessibilityLabel="Report details"
        />
        <Text variant="caption" color="textSecondary" testID="report-counter">
          {`${details.length}/${REPORT_DETAILS_MAX_LENGTH}`}
        </Text>

        {error ? (
          <Text variant="label" color="danger" testID="report-error">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
