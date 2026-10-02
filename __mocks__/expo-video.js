/* global jest: readonly */
/**
 * Global Jest stub for `expo-video` (F7a).
 *
 * The real module touches native code at import time
 * (`VideoPlayer.tsx` extends a native class) which does not exist in Jest.
 * Any suite importing the `entities/post` barrel would crash without this.
 * Suites that assert play/pause behavior mock `expo-video` themselves
 * (per-file `jest.mock` wins over this root manual mock).
 */

const React = require("react");
const { View } = require("react-native");

const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  loop: false,
  muted: true,
  status: "readyToPlay",
};

module.exports = {
  useVideoPlayer: jest.fn(() => mockPlayer),
  VideoView: (props) => React.createElement(View, { testID: "stub-video-view", ...props }),
  __mockPlayer: mockPlayer,
};
