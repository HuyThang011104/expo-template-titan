import { Redirect } from "expo-router";

// Fallback for web / manual deep links.
// On native, Create is intercepted in `(app)/_layout.tsx`
// (`disabled` + `tabPress` → `/composer`), so this rarely shows.
export default function CreateIndex() {
  return <Redirect href="/composer" />;
}
