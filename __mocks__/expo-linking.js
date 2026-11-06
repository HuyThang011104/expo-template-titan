/* global jest: readonly */
/**
 * Jest stub for `expo-linking` (G1.4+).
 *
 * Only `createURL` (scheme resolution) and `openURL` are used. Real link
 * handling stays native-only and is covered on device.
 */

module.exports = {
  createURL: (path) => `titan-dev://${path}`,
  openURL: jest.fn(async () => {}),
};
