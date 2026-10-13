// Resolves a path relative to the current page so the app works when hosted
// from the repository root or from a GitHub Pages subpath (e.g. /repo-name/).
export function basePath() {
  const path = window.location.pathname;
  if (/\/pages\/[^/]+\/[^/]+$/.test(path)) return "../../";
  if (/\/pages\/[^/]+\.html$/.test(path)) return "../";
  return "";
}

export function appPath(relativeFromRoot) {
  return basePath() + String(relativeFromRoot).replace(/^\/+/, "");
}
