// Public API for `features/composer`.
// Routes and outside code must import from here only — no deep imports.
export { ComposerScreen } from "./screens/composer-screen";
export {
  COMPOSER_MAX_LENGTH,
  COMPOSER_MAX_MEDIA,
  validateComposerBody,
  validateComposerInput,
  type ComposerValidation,
} from "./validation";
export {
  COMPOSER_DRAFT_KEY,
  useComposerDraft,
  type ComposerDraftShape,
} from "./hooks/use-composer-draft";
export {
  COMPOSER_OUTBOX_KIND,
  buildComposerOutboxPayload,
  useComposerCreatePost,
  type ComposerFetchOptions,
  type ComposerOutboxPayload,
  type ComposerSubmitResult,
} from "./mutations/use-create-post";
export {
  logComposerFail,
  logComposerOpen,
  logComposerPost,
  logComposerSuccess,
} from "./analytics";
