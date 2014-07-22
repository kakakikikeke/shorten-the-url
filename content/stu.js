var url = "";
var apiusername = "";
var apiKey = "";
var alertFlg = 0;

function shortenURL() {
    alertFlg = 0;
    initApiInfo();
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");
    var tabBrowser = mainWindow.getBrowser();
    var selectedText = tabBrowser.contentWindow.getSelection();
    url = myTrim(selectedText.toString());
    if (url != "") {
	if (!myStartsWith(url.toString(), "http:\/\/") && !myStartsWith(url.toString(), "https:\/\/")) {
	    url = "http://" + url;
	}
	doBitlyAPI();
	return;
    }
    url = myTrim(getURLOnHref().toString());
    if (url != "") {
	if (!myStartsWith(url.toString(), "http:\/\/") && !myStartsWith(url.toString(), "https:\/\/")) {
	    url = "http://" + url;
	}
	doBitlyAPI();
	return;
    }
    url = window.content.location.href;
    if (url != "") {
	if (!myStartsWith(url.toString(), "http:\/\/") && !myStartsWith(url.toString(), "https:\/\/")) {
	    url = "http://" + url;
	}
	doBitlyAPI();
	return;
    }
};

function doBitlyAPI() {
    var bitly = 'http://api.bit.ly/shorten' + '?version=2.0.1&format=json&login=' + apiusername + '&apiKey=' + apiKey + '&longUrl=' + encodeURIComponent(url);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', bitly, true);
    xmlhttp.onreadystatechange = function() {
	var response = xmlhttp.responseText;
	if (response != null && response != "") {
	    var responseAsJSON = JSON.stringify(response);
	    var data = JSON.parse(response);
	    if (data.errorCode != "500" || data.errorMessage != "INVALID_LOGIN") {
		if ((xmlhttp.readyState == 4 && xmlhttp.status == 200) && data.results[url] !== undefined) {
		    window.prompt("Success\nOriginal URL:" + url, data.results[url].shortUrl);
		}
		//else if (alertFlg == 0) {
		//    alertFlg = 1;
		//    Firebug.Console.log(bitly);
		//    window.alert("Your selected URL is bad\n" + bitly);
		//}
	    } else {
		window.alert("Invalid login, Not the corrent API username or key");
	    }
	}
    }
    xmlhttp.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    xmlhttp.send();
};

function getURLOnHref() {
    var urlOnHref = "";
    var tag = document.popupNode.tagName;
    if (tag.toString() == "A") {
	// urlOnHref = document.popupNode.getAttribute("href");
	urlOnHref = document.popupNode.href;
    }
    //	else {
    //		urlOnHref = document.popupNode.innerHTML;
    //	}
    return urlOnHref;
};

function initApiInfo() {
    var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    branch = pref.getBranch("extensions.stu.");
    if (!branch.prefHasUserValue("apiusername") || !branch.prefHasUserValue("apikey")) {
	apiusername = 'kakakikikeke4bitlyapi';
	apiKey = 'R_344ad8cbf73d813b1b28fa75a73ca60a';
    } else if (branch.getCharPref("apiusername") == "" || branch.getCharPref("apikey") == "") {
	apiusername = 'kakakikikeke4bitlyapi';
	apiKey = 'R_344ad8cbf73d813b1b28fa75a73ca60a';
    } else {
	apiusername = branch.getCharPref("apiusername");
	apiKey = branch.getCharPref("apikey");
    }
};

function myTrim(str) {
    return str.replace(/^[\s　]+|[\s　]+$|^[\s ]+|[\s ]+$|^[\n]+|[\n]+$|^[\r\n]+|[\r\n]+$|<.+?>/g, '');
};

function myStartsWith(str, target) {
    return str.indexOf(target) == 0;
};
