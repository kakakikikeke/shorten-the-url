browser.storage.local.get("bitly", function (value) {
  document.getElementById("result").value = value.bitly.latest;
});

function copySelection() {
  var result = document.getElementById("result");
  result.select();
  document.execCommand("copy");
}

document.getElementById("close").addEventListener("click", copySelection);
