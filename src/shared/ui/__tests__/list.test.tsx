import { render, screen } from "@testing-library/react-native";

import { AppList } from "../list";

jest.mock("@shopify/flash-list", () => {
  const { View } = jest.requireActual("react-native");
  return {
    FlashList: (props: Record<string, unknown>) => <View testID="flash-list" {...props} />,
  };
});

describe("AppList", () => {
  it("passes scroll props through without changing list behavior", async () => {
    const onScroll = jest.fn();
    const onEndReached = jest.fn();
    const onRefresh = jest.fn();

    await render(
      <AppList
        testID="list"
        data={["a"]}
        renderItem={() => null}
        keyExtractor={(item) => item}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={onEndReached}
        refreshing
        onRefresh={onRefresh}
      />,
    );

    const list = screen.getByTestId("list");
    expect(list.props.onScroll).toBe(onScroll);
    expect(list.props.scrollEventThrottle).toBe(16);
    expect(list.props.onEndReached).toBe(onEndReached);
    expect(list.props.refreshing).toBe(true);
    expect(list.props.onRefresh).toBe(onRefresh);
  });
});
