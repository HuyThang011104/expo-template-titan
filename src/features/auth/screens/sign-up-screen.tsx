import { router } from "expo-router";

import { useSession } from "@/shared/auth";

import { AuthForm } from "../components/auth-form";

/**
 * Mock sign-up screen mirroring sign-in; creating an account signs in directly.
 * TODO: add a real API replacing `signIn()` and server-side validation.
 */
export function SignUpScreen() {
  const { signIn } = useSession();

  return (
    <AuthForm
      mode="signUp"
      submitTestID="sign-up-button"
      onSubmit={() => {
        signIn();
        router.replace("/");
      }}
      onSwitch={() => {
        router.push("../sign-in");
      }}
    />
  );
}
