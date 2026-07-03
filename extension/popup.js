const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(["rfBaseUrl", "rfToken"]).then(({ rfBaseUrl, rfToken }) => {
  $("base").value = rfBaseUrl || "http://localhost:3000";
  $("token").value = rfToken || "";
});

$("save").addEventListener("click", async () => {
  const rfBaseUrl = $("base").value.trim().replace(/\/$/, "") || "http://localhost:3000";
  const rfToken = $("token").value.trim();
  await chrome.storage.sync.set({ rfBaseUrl, rfToken });

  const status = $("status");
  status.className = "";
  status.style.display = "block";
  status.textContent = "Testing…";

  const r = await chrome.runtime.sendMessage({ type: "rf-ping" });
  if (r && r.ok) {
    status.className = "ok";
    const quota = r.quota && r.quota.limit === -1 ? "unlimited" : r.quota ? r.quota.used + "/" + r.quota.limit + " today" : "";
    status.textContent = "Connected as " + r.email + " (" + r.plan + ")" + (quota ? " — extension quota " + quota : "");
  } else if (r && r.error === "NO_TOKEN") {
    status.className = "bad";
    status.textContent = "Saved. No token set — free features still work on Etsy pages.";
  } else {
    status.className = "bad";
    status.textContent = (r && (r.message || r.error)) ? "Failed: " + (r.message || r.error) : "Could not reach RankForge — check the URL.";
  }
});
