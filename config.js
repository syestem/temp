(function () {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const apiBaseUrl = params.get("apiBaseUrl") || hashParams.get("apiBaseUrl") || "https://billy-lactiferous-javier.ngrok-free.dev";

  window.MiniAppConfig = {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    appBackend: "local-api",
  };
})();
