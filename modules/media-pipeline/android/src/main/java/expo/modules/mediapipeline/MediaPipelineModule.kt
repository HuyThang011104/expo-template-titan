package expo.modules.mediapipeline

import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MediaPipelineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MediaPipeline")

    // File dimensions / duration / size for upload validation.
    // Zeroes mean "provider gave nothing" (not an error); invalid URIs throw.
    // NOTE: verify on a real EAS dev build — native code is not compiled by CI here.
    AsyncFunction("getVideoMetadata") { uri: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("MediaPipeline: react context unavailable")
      val parsed = Uri.parse(uri)
      val retriever = MediaMetadataRetriever()
      try {
        retriever.setDataSource(context, parsed)
        val width =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 0
        val height =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 0
        val durationMs =
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
        mapOf(
          "width" to width,
          "height" to height,
          "durationMs" to durationMs,
          "fileSize" to queryFileSize(parsed)
        )
      } finally {
        try {
          retriever.release()
        } catch (_: Exception) {
          // Best effort — the retriever is unreachable either way.
        }
      }
    }
  }

  private fun queryFileSize(uri: Uri): Long? {
    return try {
      appContext.reactContext?.contentResolver?.query(uri, null, null, null, null)?.use { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (index != -1 && cursor.moveToFirst() && !cursor.isNull(index)) cursor.getLong(index) else null
      }
    } catch (_: Exception) {
      null
    }
  }
}
