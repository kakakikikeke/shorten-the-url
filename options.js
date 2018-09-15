function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    bitly: {
      api_key: document.querySelector("#api_key").value
    }
  });
}

function restoreOptions() {
  function setCurrentChoice(result) {
    document.querySelector("#api_key").value = result.bitly.api_key || "";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.local.get("bitly");
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
