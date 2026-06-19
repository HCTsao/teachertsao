(() => {
    var __webpack_modules__ = {
        "./src/extension-lib/Messaging/ContentScriptMessageProxy.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const MessageType = __webpack_require__("./src/wdm-common/Messaging/MessageType.js");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            class ContentScriptMessageProxy {
                constructor(wdmConfig, messenger) {
                    this.wdmConfig = wdmConfig;
                    this.messenger = messenger;
                    this.events = {
                        fromSite: [ MessageType.SHOULD_SYNC_FRIENDS, MessageType.REQUEST ],
                        fromBackground: [ MessageType.DID_LOAD_USER, MessageType.IS_SYNCING_FRIENDS, MessageType.FAILED_SYNCING_FRIENDS, MessageType.DID_SYNC_FRIENDS, MessageType.RESPONSE ]
                    };
                }
                init() {
                    this.registerMessageListeners();
                    this.registerEventListeners();
                    this.notifyInstalled();
                }
                cloneData(object) {
                    return JSON.parse(JSON.stringify(object));
                }
                registerMessageListeners() {
                    const messageToEvent = message => {
                        log.debug("Received message", message.type);
                        window.postMessage(message, "*");
                    };
                    this.events.fromBackground.forEach((eventName => {
                        this.messenger.registerHandler(eventName, messageToEvent);
                    }));
                }
                registerEventListeners() {
                    const eventToMessage = event => {
                        log.debug("Received event", event.type);
                        const type = event.type;
                        const data = event.detail ? event.detail : {};
                        this.messenger.sendToBackground(type, data);
                    };
                    this.events.fromSite.forEach((eventName => {
                        document.addEventListener(eventName, eventToMessage);
                    }));
                }
                notifyInstalled() {
                    window.postMessage({
                        type: MessageType.DID_LOAD,
                        data: {
                            config: this.wdmConfig
                        }
                    }, "*");
                }
            }
            module.exports = ContentScriptMessageProxy;
        },
        "./src/extension-lib/Messaging/Messenger.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const browser = __webpack_require__("webextension-polyfill");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            class Messenger {
                constructor() {
                    this.handlers = {};
                    this.init();
                }
                init() {
                    const self = this;
                    browser.runtime.onMessage.addListener(((request, sender, sendResponse) => {
                        log.debug("Received message", sender.tab ? "from a content script" : "from service worker", request);
                        if (request.hasOwnProperty("type")) {
                            const type = request.type;
                            if (self.handlers.hasOwnProperty(type)) {
                                const handlers = self.handlers[type];
                                for (let i = 0; i < handlers.length; i++) {
                                    const message = {
                                        type: request.type,
                                        data: request.data
                                    };
                                    handlers[i](message);
                                }
                            }
                        }
                    }));
                }
                registerHandler(type, handler) {
                    if (!this.handlers.hasOwnProperty(type)) {
                        this.handlers[type] = [];
                    }
                    this.handlers[type].push(handler);
                }
                unregisterAllHandlersForType(type) {
                    if (this.handlers.hasOwnProperty(type)) {
                        delete this.handlers[type];
                    }
                }
                sendToBackground(type, data) {
                    log.log("Sending message to background", type, data);
                    const message = {
                        type,
                        data
                    };
                    return browser.runtime.sendMessage(message).then((result => {})).catch((error => {}));
                }
                sendToAllTabs(type, data) {
                    log.log("Sending message to content scripts", type, data);
                    const message = {
                        type,
                        data
                    };
                    return browser.tabs.query({
                        url: "*://*.deleted.io/*"
                    }).then((tabs => tabs.map((tab => browser.tabs.sendMessage(tab.id, message).then((result => {})).catch((error => {}))))));
                }
            }
            module.exports = Messenger;
        },
        "./src/extension-lib/Wdm/Config/WdmExtensionConfig.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const WdmConfig = __webpack_require__("./src/wdm-common/Wdm/Config/WdmConfig.js");
            class WdmExtensionConfig extends WdmConfig {
                constructor() {
                    super();
                    this.env = "production";
                    this.appUrl = "https://www.deleted.io/";
                    this.apiUrl = "https://api.deleted.io/";
                    this.logsUrl = "https://l.deleted.io/";
                    this.platformType = "extension";
                    this.extBrowser = "chrome";
                    this.extVersion = "3.0.16";
                    this.userAgent = navigator.userAgent;
                }
            }
            module.exports = WdmExtensionConfig;
        },
        "./src/wdm-common/Logging/console-log.js": module => {
            module.exports = console;
        },
        "./src/wdm-common/Messaging/MessageType.js": module => {
            const MessageTypes = {
                DID_LOAD: "WdmExtDidLoad",
                DID_LOAD_USER: "WdmExtDidLoadUser",
                SHOULD_SYNC_FRIENDS: "WdmExtShouldSyncFriends",
                IS_SYNCING_FRIENDS: "WdmExtIsSyncingFriends",
                FAILED_SYNCING_FRIENDS: "WdmExtFailedSyncingFriends",
                DID_SYNC_FRIENDS: "WdmExtDidSyncFriends",
                REQUEST: "WdmExtShouldExecuteRequest",
                RESPONSE: "WdmExtDidExecuteRequest"
            };
            module.exports = MessageTypes;
        },
        "./src/wdm-common/Wdm/Config/WdmConfig.js": module => {
            class WdmConfig {
                constructor() {
                    this.env = "production";
                    this.appUrl = "https://www.deleted.io/";
                    this.apiUrl = "https://api.deleted.io/";
                    this.logsUrl = "https://l.deleted.io/";
                    this.platformType = null;
                    this.appOs = null;
                    this.appVersion = null;
                    this.appRemoteVersion = null;
                    this.extBrowser = null;
                    this.extVersion = null;
                }
                getVersion() {
                    return {
                        platformType: this.platformType,
                        appOs: this.appOs,
                        appVersion: this.appVersion,
                        appRemoteVersion: this.appRemoteVersion,
                        extBrowser: this.extBrowser,
                        extVersion: this.extVersion
                    };
                }
                getVersionString() {
                    const version = this.getVersion();
                    return Object.keys(version).filter((key => key !== "appRemoteVersion")).map((key => version[key])).filter((value => !!value)).join("-");
                }
            }
            module.exports = WdmConfig;
        },
        "webextension-polyfill": module => {
            "use strict";
            module.exports = browser;
        }
    };
    var __webpack_module_cache__ = {};
    function __webpack_require__(moduleId) {
        var cachedModule = __webpack_module_cache__[moduleId];
        if (cachedModule !== undefined) {
            return cachedModule.exports;
        }
        var module = __webpack_module_cache__[moduleId] = {
            exports: {}
        };
        __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
        return module.exports;
    }
    var __webpack_exports__ = {};
    (() => {
        const ContentScriptMessageProxy = __webpack_require__("./src/extension-lib/Messaging/ContentScriptMessageProxy.js");
        const Messenger = __webpack_require__("./src/extension-lib/Messaging/Messenger.js");
        const WdmExtensionConfig = __webpack_require__("./src/extension-lib/Wdm/Config/WdmExtensionConfig.js");
        const config = new WdmExtensionConfig;
        const messenger = new Messenger;
        const proxy = new ContentScriptMessageProxy(config, messenger);
        proxy.init();
    })();
})();