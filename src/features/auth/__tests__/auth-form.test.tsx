import { render, screen, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "../../../shared/ui/theme/theme-provider";
import { AuthForm } from "../components/auth-form";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock("../../../shared/auth", () => ({
  useSession: () => ({ signIn: jest.fn() }),
}));

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => children,
}));

async function renderForm(mode: "signIn" | "signUp", onSubmit: () => void) {
  await render(
    <ThemeProvider initialName="light">
      <AuthForm
        mode={mode}
        submitTestID={mode === "signIn" ? "sign-in-button" : "sign-up-button"}
        onSubmit={onSubmit}
        onSwitch={() => undefined}
      />
    </ThemeProvider>,
  );
  return userEvent.setup();
}

describe("AuthForm", () => {
  it("shows inline errors and blocks submit when invalid", async () => {
    const onSubmit = jest.fn();
    const user = await renderForm("signIn", onSubmit);

    await user.press(screen.getByTestId("sign-in-button"));

    expect(await screen.findByText("Please enter your email")).toBeOnTheScreen();
    expect(await screen.findByText("Please enter your password")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when email and password are valid", async () => {
    const onSubmit = jest.fn();
    const user = await renderForm("signUp", onSubmit);

    await user.type(screen.getByTestId("auth-signUp-email-input"), "ada@example.com");
    await user.type(screen.getByTestId("auth-signUp-password-input"), "longenough1");
    await user.press(screen.getByTestId("sign-up-button"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("clears an error after the field is corrected", async () => {
    const onSubmit = jest.fn();
    const user = await renderForm("signIn", onSubmit);

    await user.press(screen.getByTestId("sign-in-button"));
    expect(await screen.findByText("Please enter your email")).toBeOnTheScreen();

    await user.type(screen.getByTestId("auth-signIn-email-input"), "ada@example.com");
    expect(screen.queryByText("Please enter your email")).not.toBeOnTheScreen();
  });
});
