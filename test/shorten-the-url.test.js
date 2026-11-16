const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  onCreated,
  getExtensionInfo,
  shortenURL,
} = require("../src/shorten-the-url");

function createMock(implementation = () => {}) {
  const calls = [];
  const mock = (...args) => {
    calls.push(args);
    return implementation(...args);
  };
  mock.calls = calls;
  mock.setImplementation = (nextImplementation) => {
    implementation = nextImplementation;
  };
  return mock;
}

global.browser = {
  runtime: {
    lastError: null,
  },
  i18n: {
    getMessage: createMock(() => "Shorten URL"),
  },
  tabs: {
    query: createMock(() => Promise.resolve([{ url: "https://example.com" }])),
  },
  storage: {
    local: {
      get: createMock(),
      set: createMock(),
    },
  },
  windows: {
    create: createMock(),
  },
  extension: {
    getURL: createMock(() => "icons/icon-48.png"),
  },
  notifications: {
    create: createMock(),
  },
};

const browserMocks = [
  browser.i18n.getMessage,
  browser.tabs.query,
  browser.storage.local.get,
  browser.storage.local.set,
  browser.windows.create,
  browser.extension.getURL,
  browser.notifications.create,
];

describe("shorten-the-url.js", () => {
  beforeEach(() => {
    browserMocks.forEach((mock) => {
      mock.calls.length = 0;
      mock.setImplementation(() => {});
    });
    browser.i18n.getMessage.setImplementation(() => "Shorten URL");
    browser.tabs.query.setImplementation(() =>
      Promise.resolve([{ url: "https://example.com" }]),
    );
    browser.extension.getURL.setImplementation(() => "icons/icon-48.png");
    browser.runtime.lastError = null;
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXMLHttpRequest;
  });

  let originalXMLHttpRequest;
  beforeEach(() => {
    originalXMLHttpRequest = global.XMLHttpRequest;
  });

  describe("onCreated", () => {
    it("logs success message when no error", () => {
      const originalLog = console.log;
      const logCalls = [];
      console.log = (...args) => logCalls.push(args);

      try {
        onCreated();
      } finally {
        console.log = originalLog;
      }

      assert.deepEqual(logCalls, [
        ["shorten-the-url item created successfully"],
      ]);
    });

    it("logs error message when lastError exists", () => {
      const originalLog = console.log;
      const logCalls = [];
      console.log = (...args) => logCalls.push(args);
      browser.runtime.lastError = "some error";

      try {
        onCreated();
      } finally {
        console.log = originalLog;
        browser.runtime.lastError = null;
      }

      assert.deepEqual(logCalls, [["Error: some error"]]);
    });
  });

  describe("getExtensionInfo", () => {
    it("returns correct info object", () => {
      assert.deepEqual(getExtensionInfo(), {
        id: "shorten-the-url",
        title: "Shorten URL",
        contexts: ["all"],
      });
    });
  });

  describe("shortenURL", () => {
    function mockXHR({
      status = 200,
      response = '{"link":"https://bit.ly/xyz"}',
      readyState = 4,
    } = {}) {
      const xhrMock = {
        open: createMock(),
        setRequestHeader: createMock(),
        send: createMock(),
        status,
        responseText: response,
        readyState,
        onreadystatechange: null,
      };
      function XMLHttpRequestMock() {
        XMLHttpRequestMock.calls.push([]);
        return xhrMock;
      }
      XMLHttpRequestMock.calls = [];
      global.XMLHttpRequest = XMLHttpRequestMock;
      return xhrMock;
    }

    it("sends request and handles success response", async () => {
      const xhr = mockXHR();
      browser.storage.local.get.setImplementation((key, callback) => {
        callback({ bitly: { api_key: "test-api-key" } });
      });

      shortenURL({ menuItemId: "shorten-the-url" });

      await Promise.resolve();
      xhr.onreadystatechange();

      assert.equal(global.XMLHttpRequest.calls.length, 1);
      assert.deepEqual(xhr.open.calls, [
        ["POST", "https://api-ssl.bitly.com/v4/shorten", true],
      ]);
      assert.deepEqual(xhr.setRequestHeader.calls, [
        ["Content-Type", "application/json"],
        ["Authorization", "Bearer test-api-key"],
      ]);
      assert.equal(browser.storage.local.set.calls.length, 1);
      assert.equal(browser.windows.create.calls.length, 1);

      const [notification] = browser.notifications.create.calls[0];
      assert.equal(notification.title, "Success from Bitly");
      assert.equal(notification.type, "basic");
      assert.equal(
        notification.message,
        "Please copy the URL displayed in another window.",
      );
    });

    it("shows error notification on API failure", async () => {
      const xhr = mockXHR({
        status: 400,
        response: '{"message":"Invalid token"}',
      });
      browser.storage.local.get.setImplementation((key, callback) => {
        callback({ bitly: { api_key: "invalid-key" } });
      });

      shortenURL({ menuItemId: "shorten-the-url" });

      await Promise.resolve();
      xhr.onreadystatechange();

      const [notificationId, notification] =
        browser.notifications.create.calls[0];
      assert.equal(notificationId, "shorten-the-url-notification");
      assert.equal(notification.title, "Error from Bitly");
      assert.equal(notification.message, "Invalid token");
    });

    it("does nothing if menuItemId is incorrect", () => {
      mockXHR();
      shortenURL({ menuItemId: "other-id" });
      assert.equal(global.XMLHttpRequest.calls.length, 0);
    });
  });
});
