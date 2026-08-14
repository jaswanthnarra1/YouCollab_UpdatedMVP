/**
 * HTTPS-only by construction — there is no protocol group to exploit, so
 * javascript:/data: links never match.
 */
const INSTAGRAM_URL_REGEX = /^https:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/i;

const isInstagramUrl = (url) => typeof url === 'string' && INSTAGRAM_URL_REGEX.test(url.trim());

module.exports = { INSTAGRAM_URL_REGEX, isInstagramUrl };
