/**
 * UX gating only — the backend (Backend/src/utils/instagramUrl.js) is the
 * real enforcement point. Keep the regex in sync manually; no shared package
 * between Frontend/Backend in this repo.
 */
export const INSTAGRAM_URL_REGEX = /^https:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/i;

export const isInstagramUrl = (url: string): boolean => INSTAGRAM_URL_REGEX.test(url.trim());
