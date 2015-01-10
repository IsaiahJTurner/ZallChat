supportsWebSockets = 'WebSocket' in window || 'MozWebSocket' in window;
if (!supportsWebSockets) {
  window.location = "/old";
}
// this fixes ios opening web app in safari
if (("standalone" in window.navigator) && window.navigator.standalone) {
      // For iOS Apps
      $('a').on('click', function(e){
        e.preventDefault();
        var new_location = $(this).attr('href');
        if (new_location != undefined && new_location.substr(0, 1) != '#' && $(this).attr('data-method') == undefined && $(this).attr('target') != "_blank"){
          window.location = new_location;
        }
      });
    }