import type { MouseEvent } from "react";

export function navigateTo(path: string, replace = false): void {
  if (replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function handleClientNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  path: string,
): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  navigateTo(path);
}

