(function () {
  "use strict";

  const routes = {
    SUN_CITY: { label: "Sun City (Sun Village)", shortLabel: "Sun City" },
    RUSTENBURG: { label: "Rustenburg (Town)", shortLabel: "Rustenburg" }
  };

  function routeLabel(route) {
    return routes[route]?.label || "Unknown route";
  }

  function timeAgo(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value) || value <= 0) return "time unavailable";
    const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " hr ago";
    return Math.floor(hours / 24) + " days ago";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  window.ROUTES = routes;
  window.routeLabel = routeLabel;
  window.timeAgo = timeAgo;
  window.escapeHtml = escapeHtml;
})();