/**
 * TextAreaExpander plugin for jQuery
 * v1.0
 * Expands or contracts a textarea height depending on the
 * quatity of content entered by the user in the box.
 *
 * By Craig Buckler, Optimalworks.net
 *
 * As featured on SitePoint.com:
 * http://www.sitepoint.com/blogs/2009/07/29/build-auto-expanding-textarea-1/
 *
 * Please use as you wish at your own risk.
 */

/**
 * Usage:
 *
 * From JavaScript, use:
 *     $(<node>).TextAreaExpander(<minHeight>, <maxHeight>);
 *     where:
 *       <node> is the DOM node selector, e.g. "textarea"
 *       <minHeight> is the minimum textarea height in pixels (optional)
 *       <maxHeight> is the maximum textarea height in pixels (optional)
 *
 * Alternatively, in you HTML:
 *     Assign a class of "expand" to any <textarea> tag.
 *     e.g. <textarea name="textarea1" rows="3" cols="40" class="expand"></textarea>
 *
 *     Or assign a class of "expandMIN-MAX" to set the <textarea> minimum and maximum height.
 *     e.g. <textarea name="textarea1" rows="3" cols="40" class="expand50-200"></textarea>
 *     The textarea will use an appropriate height between 50 and 200 pixels.
 */

(function($) {

  // jQuery plugin definition
  $.fn.TextAreaExpander = function(minHeight, maxHeight) {


    // resize a textarea
    function ResizeTextarea(e) {
      if (e.keyCode == 13 && !e.ctrlKey && !e.altKey && !Modernizr.touch)
        return;
      // event or initialize element?
      e = e.target || e;

      // find content length and box width
      var vlen = e.value.length,
        ewidth = e.offsetWidth;
      if (vlen != e.valLength || ewidth != e.boxWidth) {

        e.style.height = "0px";
        var windowH = window.innerHeight ||
          html.clientHeight ||
          body.clientHeight ||
          screen.availHeight;
        var h = Math.max(0, Math.min(e.scrollHeight, Math.min((windowH - 150), 190)));

        e.style.overflow = (e.scrollHeight > h ? "auto" : "hidden");
        e.style.height = (h - 20) + "px";

        e.valLength = vlen;
        e.boxWidth = ewidth;
        $("#send-button").css("margin-top", $("#message-input").height() - $("#send-button").height());
      }

      return true;
    };

    // initialize
    this.each(function() {

      // is a textarea?
      if (this.nodeName.toLowerCase() != "textarea") return;

      // set height restrictions
      var p = this.className.match(/expand(\d+)\-*(\d+)*/i);
      // initial resize
      ResizeTextarea(this);

      // zero vertical padding and add events
      if (!this.Initialized) {
        this.Initialized = true;
        $(this).bind("keyup", ResizeTextarea).bind("focus", ResizeTextarea);
      }
    });

    return this;
  };

})(jQuery);


// initialize all expanding textareas
jQuery(document).ready(function() {
  jQuery("textarea[class*=expand]").TextAreaExpander();
});