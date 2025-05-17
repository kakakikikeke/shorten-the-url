const {
  onCreated,
  getExtensionInfo,
  shortenURL,
} = require("../src/shorten-the-url");

global.browser = {
  runtime: {
    lastError: null,
  },
  i18n: {
    getMessage: jest.fn(() => "Shorten URL"),
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([{ url: "https://example.com" }])),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  windows: {
    create: jest.fn(),
  },
  extension: {
    getURL: jest.fn(() => "icons/icon-48.png"),
  },
  notifications: {
    create: jest.fn(),
  },
};

describe("shorten-the-url.js", () => {
  describe("onCreated", () => {
    test("logs success message when no error", () => {
      console.log = jest.fn();
      onCreated();
      expect(console.log).toHaveBeenCalledWith(
        "shorten-the-url item created successfully",
      );
    });

    test("logs error message when lastError exists", () => {
      console.log = jest.fn();
      global.browser.runtime.lastError = "some error";
      onCreated();
      expect(console.log).toHaveBeenCalledWith("Error: some error");
      global.browser.runtime.lastError = null; // reset
    });
  });

  describe("getExtensionInfo", () => {
    test("returns correct info object", () => {
      const info = getExtensionInfo();
      expect(info).toEqual({
        id: "shorten-the-url",
        title: "Shorten URL",
        contexts: ["all"],
      });
    });
  });

  describe("shortenURL", () => {
    let originalXMLHttpRequest;
    beforeEach(() => {
      jest.clearAllMocks();
      originalXMLHttpRequest = global.XMLHttpRequest;
    });

    afterEach(() => {
      global.XMLHttpRequest = originalXMLHttpRequest;
    });

    function mockXHR({
      status = 200,
      response = '{"link":"https://bit.ly/xyz"}',
      readyState = 4,
    } = {}) {
      const xhrMock = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn(),
        status,
        responseText: response,
        readyState,
        onreadystatechange: null,
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock);
      return xhrMock;
    }

    test("sends request and handles success response", async () => {
      const xhr = mockXHR();

      global.browser.storage.local.get.mockImplementation((key, cb) => {
        cb({ bitly: { api_key: "test-api-key" } });
      });

      shortenURL({ menuItemId: "shorten-the-url" });

      await Promise.resolve();
      xhr.onreadystatechange();

      expect(global.XMLHttpRequest).toHaveBeenCalled();
      expect(xhr.open).toHaveBeenCalledWith(
        "POST",
        "https://api-ssl.bitly.com/v4/shorten",
        true,
      );
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer test-api-key",
      );
      expect(global.browser.storage.local.set).toHaveBeenCalled();
      expect(global.browser.windows.create).toHaveBeenCalled();

      const call = global.browser.notifications.create.mock.calls[0];
      expect(typeof call[0]).toBe("object");
      expect(call[0]).toMatchObject({
        title: "Success from Bitly",
        type: "basic",
        message: "Please copy the URL displayed in another window.",
      });
    });

    test("shows error notification on API failure", async () => {
      const xhr = mockXHR({
        status: 400,
        response: '{"message":"Invalid token"}',
      });

      global.browser.storage.local.get.mockImplementation((key, cb) => {
        cb({ bitly: { api_key: "invalid-key" } });
      });

      shortenURL({ menuItemId: "shorten-the-url" });

      await Promise.resolve();
      xhr.onreadystatechange();

      expect(global.browser.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: "Error from Bitly",
          message: "Invalid token",
        }),
      );
    });

    test("does nothing if menuItemId is incorrect", () => {
      mockXHR();
      shortenURL({ menuItemId: "other-id" });
      expect(global.XMLHttpRequest).not.toHaveBeenCalled();
    });
  });
});
