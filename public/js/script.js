(function(i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  i[r] = i[r] || function() {
    (i[r].q = i[r].q || []).push(arguments)
  }, i[r].l = 1 * new Date();
  a = s.createElement(o),
    m = s.getElementsByTagName(o)[0];
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-58402989-1', 'auto');
ga('send', 'pageview');
supportsWebSockets = 'WebSocket' in window || 'MozWebSocket' in window;
if (!supportsWebSockets) {
  window.location = "/old";
}
// this fixes ios opening web app in safari
if (("standalone" in window.navigator) && window.navigator.standalone) {
  // For iOS Apps

  $(document).on('click', 'a', function(e) {
    var new_location = $(this).attr('href');
    if (new_location != undefined && new_location.substr(0, 1) != '#' && $(this).attr('data-method') == undefined && $(this).attr('target') != "_blank") {
      e.preventDefault();
      window.location = new_location;
    }
  });
}
addToHomescreen({
  // debug: 'ios',           // activate debug mode in ios emulation
  skipFirstVisit: false, // dont show at first access
  startDelay: 0, // display the message right away
  lifespan: 0, // do not automatically kill the call out
  displayPace: 0, // do not obey the display pace
  privateModeOverride: true, // show the message in private mode
  maxDisplayCount: 0 // do not obey the max display count
});
if (Modernizr.touch) {
  /* cache dom references */
  var $body = $('body');

  /* bind events */
  $(document)
    .on('focus', 'input', function(e) {
      $body.addClass('fixfixed');
      console.log("add");
    })
    .on('blur', 'input', function(e) {
      $body.removeClass('fixfixed');
      console.log("remove");
    });
}