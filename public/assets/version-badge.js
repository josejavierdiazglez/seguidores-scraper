(function () {
  function packageJsonUrl() {
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/package.json';
    }
    return 'https://raw.githubusercontent.com/josejavierdiazglez/seguidores-scraper/main/package.json';
  }

  fetch(packageJsonUrl(), { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('package.json ' + res.status);
      return res.json();
    })
    .then(function (pkg) {
      var version = pkg && pkg.version;
      if (!version) return;
      var label = String(version).indexOf('v') === 0 ? String(version) : 'v' + version;
      document.querySelectorAll('.logo-text__version').forEach(function (el) {
        el.textContent = label;
      });
    })
    .catch(function () {
      /* silencioso */
    });
})();
