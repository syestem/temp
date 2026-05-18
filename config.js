(function () {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const apiBaseUrl = params.get("apiBaseUrl") || hashParams.get("apiBaseUrl") || "https://max-abonements-api-syestem.amvera.io";

  window.MiniAppConfig = {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    appBackend: "api",
  };
})();
