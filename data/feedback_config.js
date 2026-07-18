/**
 * Feedback delivery — clients do NOT need GitHub (or any) login.
 *
 * 1) ntfy (always on): free pub/sub. You read messages at the topic URL.
 * 2) email (optional): FormSubmit.co copies each message to your inbox.
 *    After first deploy, open Gmail and confirm FormSubmit’s one-time activation.
 *
 * Note: this file is public on GitHub Pages (static SPA). Email is visible in source.
 */
window.SDLE_FEEDBACK = {
  /** Public topic — change the random tail if you get spam */
  ntfyTopic: "sdle-study-path-feedback-xxxova2-k7m9",
  /**
   * Owner inbox for permanent copies (FormSubmit).
   * Students never log in; only you receive mail after activation.
   */
  email: "0xcydia@gmail.com",
  /** Shown in the app under “How the owner reads feedback” */
  ownerReadHint:
    "ntfy topic (phone bookmark) + email copies via FormSubmit after you activate once in Gmail.",
};
