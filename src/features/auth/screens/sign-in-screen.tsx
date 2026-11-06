import { router } from "expo-router";

import { useSession } from "@/shared/auth";

import { AuthForm } from "../components/auth-form";

/**
 * Mock sign-in screen.
 * TODO: add a real API replacing `signIn()` and server-side validation.
 */
export function SignInScreen() {
  const { signIn } = useSession();

  return (
    <AuthForm
      mode="signIn"
      submitTestID="sign-in-button"
      onSubmit={() => {
        signIn();
        router.replace("/");
      }}
      onSwitch={() => {
        router.push("../sign-up");
      }}
    />
  );
}
