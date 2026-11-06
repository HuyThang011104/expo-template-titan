/**
 * Network reachability for UI that must not block cached content.
 * NetInfo also feeds TanStack `onlineManager`, but this hook is independent
 * so any component can render an offline affordance.
 */

import { useNetInfo } from "@react-native-community/netinfo";

export function useIsOffline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  if (isConnected === false) return true;
  return isInternetReachable === false;
}
