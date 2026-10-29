import { render, screen } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";

import { ThemeProvider } from "../../theme/theme-provider";
import { Icon } from "../icon";
import { iconMap, iconNames } from "../icon-map";

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: jest.fn((props: Record<string, unknown>) => (
      <View testID="symbol-view" {...props} />
    )),
  };
});

const SymbolViewMock = SymbolView as unknown as jest.Mock;

describe("icon map", () => {
  it("declares iOS, Android, and web names for every semantic icon", () => {
    for (const name of iconNames) {
      expect(iconMap[name].ios).toBeTruthy();
      expect(iconMap[name].android).toBeTruthy();
      expect(iconMap[name].web).toBeTruthy();
    }
  });

  it("maps the media controls and flag on every platform", () => {
    expect(iconMap.play).toEqual({
      ios: "play.fill",
      android: "play_arrow",
      web: "play_arrow",
    });
    expect(iconMap.pause).toEqual({
      ios: "pause.fill",
      android: "pause",
      web: "pause",
    });
    expect(iconMap.volume).toEqual({
      ios: "speaker.wave.2.fill",
      android: "volume_up",
      web: "volume_up",
    });
    expect(iconMap.volumeOff).toEqual({
      ios: "speaker.slash.fill",
      android: "volume_off",
      web: "volume_off",
    });
    expect(iconMap.flag).toEqual({ ios: "flag", android: "flag", web: "flag" });
  });

  it("renders a per-platform name object with the token size and color", async () => {
    SymbolViewMock.mockClear();

    await render(
      <ThemeProvider initialName="light">
        <Icon name="heart" size="lg" color="danger" accessibilityLabel="Like" />
      </ThemeProvider>,
    );

    const symbol = screen.getByTestId("symbol-view");
    expect(symbol.props.name).toEqual({
      ios: "heart",
      android: "favorite_border",
      web: "favorite_border",
    });
    expect(symbol.props.size).toBe(24);
    expect(symbol.props.tintColor).toBe("#DC2626");
    expect(symbol.props.accessibilityLabel).toBe("Like");
  });
});
