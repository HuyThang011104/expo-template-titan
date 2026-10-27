import { Redirect } from "expo-router";

import { DesignLabScreen } from "@/shared/ui/lab/design-lab-screen";

/** Dev-only gallery route (spec §11); redirects home in release builds. */
export default function DesignLabRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DesignLabScreen />;
}
