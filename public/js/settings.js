$(document).on('submit', 'form', function(e) {
  e.preventDefault();
  $.ajax({
    url: $(this).attr("action"),
    type: $(this).attr("method"),
    data: $(this).serialize(),
    timeout: 30000,
    success: function(data, textStatus) {
      if (data["success"] == false)
        alert("Error: " + data["error"]["message"]);
      else
        alert("Success: true");
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log(errorThrown);
    },
  });
});