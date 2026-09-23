import ExpoModulesCore
import AVFoundation

public class MediaPipelineModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaPipeline")

    // File dimensions / duration / size for upload validation.
    // Accepts file:// picker URIs and remote https:// URLs (streams headers).
    // NOTE: verify on a real EAS dev build — native code is not compiled by CI here.
    AsyncFunction("getVideoMetadata") { (uri: String) async throws -> [String: Any] in
      guard let url = URL(string: uri) else {
        throw MediaPipelineError.invalidUri(uri)
      }
      let asset = AVURLAsset(url: url)
      let duration = try await asset.load(.duration)
      let tracks = try await asset.loadTracks(withMediaType: .video)
      guard let track = tracks.first else {
        throw MediaPipelineError.noVideoTrack
      }
      let size = try await track.load(.naturalSize)
      let fileSize = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? nil
      return [
        "width": Int(size.width),
        "height": Int(size.height),
        "durationMs": Int(CMTimeGetSeconds(duration) * 1000),
        "fileSize": fileSize ?? NSNull()
      ]
    }
  }
}

enum MediaPipelineError: Error, LocalizedError {
  case invalidUri(String)
  case noVideoTrack

  var errorDescription: String? {
    switch self {
    case .invalidUri(let uri): return "MediaPipeline: invalid URI \(uri)"
    case .noVideoTrack: return "MediaPipeline: asset has no video track"
    }
  }
}
