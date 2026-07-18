/**
 * Feedback delivery — clients do NOT need GitHub (or any) login.
 *
 * 1) ntfy (always on): free pub/sub. You read messages at the topic URL.
 * 2) email (optional): FormSubmit.co copies each message to your inbox.
 *    Put your real email below, push, then confirm the one-time activation mail.
 */
window.SDLE_FEEDBACK = {
  /** Public topic — change the random tail if you get spam */
  ntfyTopic: "sdle-study-path-feedback-xxxova2-k7m9",
  /**
   * Your real email for permanent copies (Gmail, etc.).
   * Leave "" to use ntfy only. Example: "you@gmail.com"
   */
  email: "",
  /** Shown in the app under “How the owner reads feedback” */
  ownerReadHint:
    "Open the ntfy link on your phone (bookmark it). Optional: set email in data/feedback_config.js for inbox copies.",
};
