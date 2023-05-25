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

browser.menus.create({
  id: "shorten-the-url",
  title: browser.i18n.getMessage("menuItemShorten"),
  contexts: ["all"]
}, onCreated);

browser.menus.onClicked.addListener((info) => {
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
          var bitly = 'https://api-ssl.bitly.com/v4/shorten';
          var data = {
            'long_url': url
          }
          var cli = new XMLHttpRequest();
          cli.open('POST', bitly, true);
          cli.onreadystatechange = function() {
            var response = cli.responseText;
            var status_code = cli.status;
            if (response != null && response != "") {
              JSON.stringify(response);
              var ret = JSON.parse(response);
              if (status_code != 200) {
                browser.notifications.create({
                  "type": "basic",
                  "iconUrl": browser.extension.getURL("icons/icon-48.png"),
                  "title": "Error from Bitly",
                  "message": ret.message
                });
              } else if (status_code == 200 && cli.readyState == 4) {
                let short = ret.link;
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
                browser.windows.create(result);
                browser.notifications.create({
                  "type": "basic",
                  "iconUrl": browser.extension.getURL("icons/icon-48.png"),
                  "title": "Success from Bitly",
                  "message": "Please copy the URL displayed in another window."
                });
              }
            }
          }
          cli.setRequestHeader('Content-Type', 'application/json');
          cli.setRequestHeader('Authorization', `Bearer ${api_key}`);
          cli.send(JSON.stringify(data));
        });
      });
      break;
  }
});
