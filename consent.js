// ===================================================
//   COOKIE CONSENT + GOOGLE ANALYTICS
//   Analytics is only loaded after the visitor clicks
//   "Accept" (UK GDPR / PECR and EU GDPR / ePrivacy).
//   Choice can be changed via any [data-cookie-settings] link.
// ===================================================
(function () {
  var GA_ID = 'G-CR78ZZ0YES';
  var KEY = 'cookie-consent';
  var gaLoaded = false;

  function getConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function loadGA() {
    window['ga-disable-' + GA_ID] = false;
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function stopGA() {
    window['ga-disable-' + GA_ID] = true;
    // Remove any Google Analytics cookies already set (_ga, _ga_XXXX)
    var host = location.hostname;
    var domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') === 0) {
        domains.forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  function init() {
    var banner  = document.getElementById('cookie-banner');
    var accept  = document.getElementById('cookie-accept');
    var decline = document.getElementById('cookie-decline');
    var consent = getConsent();

    if (consent === 'accepted') loadGA();
    else window['ga-disable-' + GA_ID] = true;

    function show() { if (banner) banner.classList.remove('hidden'); }
    function hide() { if (banner) banner.classList.add('hidden'); }

    if (!consent) setTimeout(show, 800);

    if (accept) accept.addEventListener('click', function () {
      setConsent('accepted');
      hide();
      loadGA();
    });

    if (decline) decline.addEventListener('click', function () {
      setConsent('declined');
      hide();
      stopGA();
    });

    document.querySelectorAll('[data-cookie-settings]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        show();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
