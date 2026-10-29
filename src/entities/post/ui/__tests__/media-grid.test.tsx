import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "@/shared/ui";

import type { PostMedia } from "../../model";
import { MediaGrid } from "../media-grid";

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) => <View testID="media-image" {...props} />,
  };
});

jest.mock("expo-symbols", () => {
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: Record<string, unknown>) => <View testID="symbol-view" {...props} />,
  };
});

function image(url: string): PostMedia {
  return { kind: "image", url };
}

function renderGrid(
  media: PostMedia[],
  props: Partial<React.ComponentProps<typeof MediaGrid>> = {},
) {
  return render(<MediaGrid media={media} testID="grid" {...props} />, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialName="light">{children}</ThemeProvider>
    ),
  });
}

function styleOf(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("MediaGrid", () => {
  it("renders nothing for an empty media array", async () => {
    await renderGrid([]);
    expect(screen.queryByTestId("grid")).toBeNull();
  });

  it("renders one image at 4:5 with the height cap", async () => {
    await renderGrid([image("https://example.com/a.jpg")]);

    const style = styleOf("grid-0");
    expect(style.aspectRatio).toBe(4 / 5);
    expect(style.maxHeight).toBe(420);
    expect(screen.getByTestId("grid-0").props.accessibilityRole).toBe("image");
    expect(screen.getByTestId("grid-0").props.accessibilityLabel).toBe("Media 1 of 1");
  });

  it("renders two square columns", async () => {
    await renderGrid([image("https://example.com/a.jpg"), image("https://example.com/b.jpg")]);

    for (const id of ["grid-0", "grid-1"]) {
      const style = styleOf(id);
      expect(style.flex).toBe(1);
      expect(style.aspectRatio).toBe(1);
    }
  });

  it("renders one large cell and two small ones for three items", async () => {
    await renderGrid([
      image("https://example.com/a.jpg"),
      image("https://example.com/b.jpg"),
      image("https://example.com/c.jpg"),
    ]);

    expect(styleOf("grid-0").flex).toBe(2);
    expect(styleOf("grid-0").aspectRatio).toBe(1);
    expect(styleOf("grid-1").flex).toBe(1);
    expect(styleOf("grid-2").flex).toBe(1);
  });

  it("renders a 2x2 grid for four items", async () => {
    await renderGrid([
      image("https://example.com/a.jpg"),
      image("https://example.com/b.jpg"),
      image("https://example.com/c.jpg"),
      image("https://example.com/d.jpg"),
    ]);

    expect(screen.getAllByTestId(/^grid-[0-3]$/)).toHaveLength(4);
  });

  it("renders a video as a dark tile with a play badge", async () => {
    await renderGrid([
      image("https://example.com/a.jpg"),
      { kind: "video", url: "https://example.com/clip.mp4" },
    ]);

    expect(screen.getByTestId("grid-1-video")).toBeTruthy();
    expect(screen.getByTestId("symbol-view").props.name).toEqual({
      ios: "play.fill",
      android: "play_arrow",
      web: "play_arrow",
    });
    expect(screen.getByTestId("grid-1").props.accessibilityLabel).toBe("Video 2 of 2");
  });

  it("renders a lone video too, so the grid stays safe when reused", async () => {
    await renderGrid([{ kind: "video", url: "https://example.com/clip.mp4" }]);

    expect(screen.getByTestId("grid-0-video")).toBeTruthy();
  });

  it("calls back with the pressed index", async () => {
    const onPress = jest.fn();
    await renderGrid(
      [
        image("https://example.com/a.jpg"),
        image("https://example.com/b.jpg"),
        image("https://example.com/c.jpg"),
      ],
      { onPress },
    );

    fireEvent.press(screen.getByTestId("grid-2"));
    expect(onPress).toHaveBeenCalledWith(2);
  });
});
