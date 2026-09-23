/**
 * Wires NetInfo into the TanStack `onlineManager`.
 * Trusts `isConnected` while reachability is still unknown; returns unsubscribe.
 */

import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

import { logger } from "../observability/logger";

export function setupOnlineManager(): () => void {
  try {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected === true && (state.isInternetReachable ?? true));
    });
  } catch {
    logger.warn("[query] NetInfo unavailable, assuming online");
    onlineManager.setOnline(true);
    return () => {};
  }
}
