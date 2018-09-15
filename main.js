function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("shorten-the-url item created successfully");
  }
}

function getCurrentWindowTabs() {
  return browser.tabs.query({currentWindow: true, active: true});
}

function onError(error) {
  console.log(`Error: ${error}`);
}

browser.menus.create({
  id: "shorten-the-url",
  title: browser.i18n.getMessage("menuItemShorten"),
  contexts: ["all"]
}, onCreated);

browser.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "shorten-the-url":
      browser.storage.local.get("bitly", function(value) {
        var api_key = value.bitly.api_key;
        getCurrentWindowTabs().then(tabs => {
          let url = tabs[0].url;
          if (info.linkUrl !== undefined) {
            url = info.linkUrl;
          }
          if (info.selectionText !== undefined) {
            url = info.selectionText;
          }
          var bitly = 'https://api-ssl.bitly.com/v3/shorten?access_token=' + api_key + '&longUrl=' + encodeURIComponent(url);
          var cli = new XMLHttpRequest();
          cli.open('GET', bitly, true);
          cli.onreadystatechange = function() {
            var response = cli.responseText;
            if (response != null && response != "") {
              var responseAsJSON = JSON.stringify(response);
              var ret = JSON.parse(response);
              if (ret.status_code != 200) {
                browser.notifications.create({
                  "type": "basic",
                  "iconUrl": browser.extension.getURL("icons/icon-48.png"),
                  "title": "Error from Bitly",
                  "message": ret.status_txt
                });
              } else if (ret.status_code == 200 && cli.readyState == 4) {
                let short = ret.data.url;
                console.log(short);
                browser.storage.local.set({
                  bitly: {
                    api_key: api_key,
                    latest: short
                  }
                });
                var result = {
                  type: "popup",
                  url: "result.html",
                  width: 250,
                  height: 100
                };
                var creating = browser.windows.create(result);
                browser.notifications.create({
                  "type": "basic",
                  "iconUrl": browser.extension.getURL("icons/icon-48.png"),
                  "title": "Success from Bitly",
                  "message": "Please copy the URL displayed in another window."
                });
              }
            }
          }
          cli.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
          cli.send();
        });
      });
      break;
  }
});
