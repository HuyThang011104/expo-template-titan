/**
 * Jest stub for `expo-linking` (G1.4).
 *
 * Only `createURL` is used (scheme resolution for share links). Real
 * link handling stays native-only and is covered on device.
 */

module.exports = {
  createURL: (path) => `titan-dev://${path}`,
};
