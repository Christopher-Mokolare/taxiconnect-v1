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

  function hasLiveConnection(sessions, now = Date.now(), staleMs = 90000) {
    return Object.values(sessions || {}).some(session => {
      const seen = Number(session?.lastSeen || session?.connectedAt || 0);
      return seen > 0 && now - seen <= staleMs;
    });
  }

  function taxiConnectionLabel(taxi, sessions, now = Date.now()) {
    if (taxi?.status === "offline") return "Offline";
    if (taxi?.status === "breakdown") return "Breakdown";
    if (hasLiveConnection(sessions, now)) return "Connected";
    return "Connection lost · last confirmed " + timeAgo(taxi?.lastUpdated);
  }

  function waitingRequestExpiry(record) {
    const explicit = Number(record?.expiresAt || 0);
    if (explicit > 0) return explicit;
    const created = Number(record?.timestamp || 0);
    return created > 0 ? created + 45 * 60 * 1000 : 0;
  }

  function isWaitingRequestActive(record, now = Date.now()) {
    return Boolean(record && record.status === "waiting" && waitingRequestExpiry(record) > now);
  }

  function demandByPickup(waiting, now = Date.now()) {
    const grouped = {};
    for (const [id, record] of Object.entries(waiting || {})) {
      if (!isWaitingRequestActive(record, now)) continue;
      const route = String(record.route || "UNKNOWN");
      const pickupPoint = String(record.pickupPoint || "Pickup point not specified").trim();
      const key = route + "::" + pickupPoint.toLowerCase();
      if (!grouped[key]) grouped[key] = { route, pickupPoint, people: 0, requests: 0, ids: [] };
      grouped[key].people += Math.max(1, Number(record.groupSize || 1));
      grouped[key].requests += 1;
      grouped[key].ids.push(id);
    }
    return Object.values(grouped).sort((a, b) => b.people - a.people);
  }

  window.ROUTES = routes;
  window.routeLabel = routeLabel;
  window.timeAgo = timeAgo;
  window.escapeHtml = escapeHtml;
  window.hasLiveConnection = hasLiveConnection;
  window.taxiConnectionLabel = taxiConnectionLabel;
  window.waitingRequestExpiry = waitingRequestExpiry;
  window.isWaitingRequestActive = isWaitingRequestActive;
  window.demandByPickup = demandByPickup;
})();