/**
 * Service worker: proxies API calls so content scripts never hold the token
 * in page context. Base URL + token live in chrome.storage.sync.
 */
async function getConfig() {
  const { rfBaseUrl, rfToken } = await chrome.storage.sync.get(["rfBaseUrl", "rfToken"]);
  return { baseUrl: (rfBaseUrl || "http://localhost:3000").replace(/\/$/, ""), token: rfToken || "" };
}

async function api(path) {
  const { baseUrl, token } = await getConfig();
  if (!token) return { error: "NO_TOKEN" };
  try {
    const res = await fetch(baseUrl + path, { headers: { authorization: "Bearer " + token } });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ...body };
  } catch (e) {
    return { error: "NETWORK", message: String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "rf-ping") {
    api("/api/ext/ping").then(sendResponse);
    return true;
  }
  if (msg.type === "rf-tag-report") {
    api("/api/ext/tag-report?q=" + encodeURIComponent(msg.q)).then(sendResponse);
    return true;
  }
  if (msg.type === "rf-open") {
    getConfig().then(({ baseUrl }) => {
      chrome.tabs.create({ url: baseUrl + msg.path });
      sendResponse({ ok: true });
    });
    return true;
  }
});
