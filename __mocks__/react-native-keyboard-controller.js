/**
 * Global Jest stub for `react-native-keyboard-controller` (G1.2).
 *
 * The real module touches native code at import time (`bindings.native`),
 * which does not exist in Jest. `KeyboardAvoidingView` becomes a plain
 * pass-through so composer tests render without native linking.
 */

const React = require("react");
const { View } = require("react-native");

module.exports = {
  KeyboardAvoidingView: ({ children, ...props }) =>
    React.createElement(View, { ...props }, children),
  KeyboardProvider: ({ children }) => React.createElement(React.Fragment, null, children),
};
