(() => {
    var __webpack_modules__ = {
        "./src/extension-lib/BackgroundServices/index.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const DexieDataStore = __webpack_require__("./src/wdm-common/Storage/DexieDataStore.js");
            const ExtensionSyncObserver = __webpack_require__("./src/extension-lib/Syncing/ExtensionSyncObserver.js");
            const Fb = __webpack_require__("./src/wdm-common/Fb/Fb.js");
            const FetchHttpClient = __webpack_require__("./src/wdm-common/Http/FetchHttpClient.js");
            const FriendRepository = __webpack_require__("./src/wdm-common/Friends/FriendRepository.js");
            const FriendStatus = __webpack_require__("./src/wdm-common/Friends/FriendStatus.js");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            const MessageType = __webpack_require__("./src/wdm-common/Messaging/MessageType.js");
            const Messenger = __webpack_require__("./src/extension-lib/Messaging/Messenger.js");
            const RequestType = __webpack_require__("./src/wdm-common/Messaging/RequestType.js");
            const Syncer = __webpack_require__("./src/wdm-common/Syncing/Syncer.js");
            const UserRepository = __webpack_require__("./src/wdm-common/Users/UserRepository.js");
            const WdmApi = __webpack_require__("./src/wdm-common/Wdm/WdmApi.js");
            const WdmError = __webpack_require__("./src/wdm-common/Errors/WdmError.js");
            const WdmExtensionConfig = __webpack_require__("./src/extension-lib/Wdm/Config/WdmExtensionConfig.js");
            const WdmLogger = __webpack_require__("./src/wdm-common/Wdm/WdmLogger.js");
            const FriendImporter = __webpack_require__("./src/wdm-common/Friends/FriendImporter.js");
            const DexieFriendQueryAdapter = __webpack_require__("./src/wdm-common/Friends/DexieFriendQueryAdapter.js");
            const initBackgroundServices = async () => {
                const config = new WdmExtensionConfig;
                const api = new WdmApi(config);
                const dataStore = new DexieDataStore;
                await dataStore.init();
                const friendQueryAdapter = new DexieFriendQueryAdapter(dataStore);
                const friendRepository = new FriendRepository(dataStore, friendQueryAdapter);
                const userRepository = new UserRepository(dataStore);
                const friendImporter = new FriendImporter(api, friendRepository, userRepository);
                const wdmLogger = new WdmLogger(config);
                const httpClient = new FetchHttpClient(wdmLogger);
                const fb = new Fb(httpClient, wdmLogger);
                const messenger = new Messenger;
                const syncObserver = new ExtensionSyncObserver(messenger);
                const syncer = new Syncer(api, fb, friendImporter, friendRepository, syncObserver, userRepository, wdmLogger);
                messenger.registerHandler(MessageType.SHOULD_SYNC_FRIENDS, (() => {
                    syncer.sync("message");
                }));
                const getUserRequestHandler = async ({userId}) => {
                    let user;
                    if (userId) {
                        user = await userRepository.getUser(userId);
                    } else {
                        user = await userRepository.getLastSyncedUser();
                    }
                    return {
                        user: user ? user.toJson() : null
                    };
                };
                const getFriendsRequestHandler = async ({userId, status, offset, limit}) => {
                    const user = await userRepository.getUserForRequestOrFail(userId);
                    if (!status || !FriendStatus.hasOwnProperty(status)) {
                        throw new WdmError(`Invalid friend status requested ${status}`, "INVALID_STATUS");
                    }
                    const {total, friends} = await friendRepository.findFriendsByFriendStatus(user.userId, status, offset, limit);
                    return {
                        userId: user.userId,
                        status,
                        total,
                        friends
                    };
                };
                const setFriendDeletedByUserHandler = async ({userId, friendId, value}) => {
                    const user = await userRepository.getUserForRequestOrFail(userId);
                    const friend = await friendRepository.setFriendDeletedByUser(user.userId, friendId, value);
                    return {
                        friend
                    };
                };
                const forgetFriendHandler = async ({userId, friendId}) => {
                    const user = await userRepository.getUserForRequestOrFail(userId);
                    const result = await friendRepository.deleteFriend(user.userId, friendId);
                    return {
                        success: result > 0
                    };
                };
                const setFriendsSeenHandler = async ({userId, friendIds}) => {
                    const user = await userRepository.getUserForRequestOrFail(userId);
                    if (!friendIds || friendIds.length < 1) {
                        throw new WdmError("No friendIds supplied.", "NO_FRIEND_IDS");
                    }
                    const friends = await friendRepository.setFriendsSeen(user.userId, friendIds);
                    return {
                        success: friends.length
                    };
                };
                const requestHandlers = {
                    [RequestType.GET_USER]: getUserRequestHandler,
                    [RequestType.GET_FRIENDS]: getFriendsRequestHandler,
                    [RequestType.SET_FRIEND_DELETED_BY_USER]: setFriendDeletedByUserHandler,
                    [RequestType.FORGET_FRIEND]: forgetFriendHandler,
                    [RequestType.SET_FRIENDS_SEEN]: setFriendsSeenHandler
                };
                messenger.registerHandler(MessageType.REQUEST, (async ({data}) => {
                    const {requestId, requestType, requestPayload} = data;
                    log.debug("Handling request", requestId, requestType, requestPayload);
                    try {
                        if (!requestHandlers.hasOwnProperty(requestType)) {
                            throw new WdmError(`No handler for request type ${requestType}`, "NO_HANDLER");
                        }
                        const responsePayload = await requestHandlers[requestType](requestPayload);
                        messenger.sendToAllTabs(MessageType.RESPONSE, {
                            requestId,
                            requestType,
                            responsePayload
                        });
                    } catch (e) {
                        log.error(e);
                        wdmLogger.logError("request", e, {
                            requestType,
                            requestPayload
                        });
                        messenger.sendToAllTabs(MessageType.RESPONSE, {
                            requestId,
                            requestType,
                            errorMessage: e.message,
                            errorCode: e.code
                        });
                    }
                }));
                return {
                    config,
                    syncer
                };
            };
            module.exports = {
                initBackgroundServices
            };
        },
        "./src/extension-lib/Functions/alarms.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const browser = __webpack_require__("webextension-polyfill");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            const ensureAlarmIsSet = async (name, periodInMinutes, reason) => {
                log.log("Ensuring alarm is set due to", reason);
                const alarm = await browser.alarms.get(name);
                if (alarm) {
                    log.log("Found existing alarm", alarm);
                    if (alarm.periodInMinutes === periodInMinutes) {
                        log.log("Existing alarm is correct", alarm);
                        return;
                    }
                    log.log("Deleting existing alarm", alarm);
                    await browser.alarms.clear(name);
                } else {
                    log.log("No existing alarm found");
                }
                log.log("Scheduling new alarm");
                await browser.alarms.create(name, {
                    periodInMinutes
                });
            };
            module.exports = {
                ensureAlarmIsSet
            };
        },
        "./src/extension-lib/Functions/badge.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const browser = __webpack_require__("webextension-polyfill");
            const setBadge = (type, text) => {
                const action = browser.action || browser.browserAction;
                switch (type) {
                  case "deleted":
                    action.setBadgeText({
                        text: String(text)
                    });
                    action.setBadgeBackgroundColor({
                        color: "#d9534f"
                    });
                    break;

                  case "deactivated":
                    action.setBadgeText({
                        text: String(text)
                    });
                    action.setBadgeBackgroundColor({
                        color: "#f0ad4e"
                    });
                    break;

                  case "new":
                    action.setBadgeBackgroundColor({
                        color: "#5cb85c"
                    });
                    action.setBadgeText({
                        text: String(text)
                    });
                    break;
                }
            };
            const clearBadge = () => {
                const action = browser.action || browser.browserAction;
                action.setBadgeText({
                    text: ""
                });
            };
            const setBadgeFromFriendCounts = results => {
                if (results.unseenDeletedFriends) {
                    setBadge("deleted", results.unseenDeletedFriends);
                } else if (results.unseenDeactivatedFriends) {
                    setBadge("deactivated", results.unseenDeactivatedFriends);
                } else if (results.newFriends) {
                    setBadge("new", results.newFriends);
                } else {
                    clearBadge();
                }
            };
            module.exports = {
                clearBadge,
                setBadge,
                setBadgeFromFriendCounts
            };
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
        "./src/extension-lib/Syncing/ExtensionSyncObserver.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const AbstractSyncObserver = __webpack_require__("./src/wdm-common/Syncing/AbstractSyncObserver.js");
            const MessageType = __webpack_require__("./src/wdm-common/Messaging/MessageType.js");
            const {setBadgeFromFriendCounts} = __webpack_require__("./src/extension-lib/Functions/badge.js");
            class ExtensionSyncObserver extends AbstractSyncObserver {
                constructor(messenger) {
                    super();
                    this.messenger = messenger;
                }
                onError(error, type) {
                    this.messenger.sendToAllTabs(MessageType.FAILED_SYNCING_FRIENDS, {
                        type,
                        message: error ? error.message : null
                    });
                }
                onFinish(result) {
                    this.messenger.sendToAllTabs(MessageType.DID_SYNC_FRIENDS, result);
                    setBadgeFromFriendCounts(result.results);
                }
                onProgress(state, data = {}) {
                    this.messenger.sendToAllTabs(MessageType.IS_SYNCING_FRIENDS, {
                        state,
                        data
                    });
                }
                onUser(user) {
                    this.messenger.sendToAllTabs(MessageType.DID_LOAD_USER, {
                        user: user ? user.toJson() : null
                    });
                }
            }
            module.exports = ExtensionSyncObserver;
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
        "./src/wdm-common/Api/AbstractApi.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const ConsoleLogger = __webpack_require__("./src/wdm-common/Logging/ConsoleLogger.js");
            class AbstractApi {
                constructor(name, url) {
                    this.url = url;
                    this.log = new ConsoleLogger(name);
                }
                getDefaultData() {
                    return {};
                }
                request(method, endpoint, data = {}) {
                    const url = this.url + endpoint;
                    data = {
                        ...this.getDefaultData(),
                        ...data
                    };
                    this.log.debug("➡️ Request", method, url, data);
                    const body = method !== "GET" ? JSON.stringify(data) : null;
                    return fetch(url, {
                        method,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body
                    }).then((async response => {
                        if (![ 200, 201 ].includes(response.status)) {
                            const err = new Error("Request failed: " + response.status + " " + response.statusText);
                            err.responseBody = await response.text();
                            throw err;
                        }
                        const json = await response.json();
                        this.log.debug("⬅️ Response", method, url, response, json);
                        return json;
                    })).catch((err => {
                        this.log.error("Error", method, url, err, err.responseBody);
                        throw err;
                    }));
                }
            }
            module.exports = AbstractApi;
        },
        "./src/wdm-common/Errors/FBNotLoggedInError.js": module => {
            class FBNotLoggedInError extends Error {
                constructor() {
                    super("User is not logged in to FB.");
                }
            }
            module.exports = FBNotLoggedInError;
        },
        "./src/wdm-common/Errors/UserFacingError.js": module => {
            class UserFacingError extends Error {
                constructor(message, userFacingMessage) {
                    super(message);
                    this.userFacingMessage = userFacingMessage;
                }
            }
            module.exports = UserFacingError;
        },
        "./src/wdm-common/Errors/WdmError.js": module => {
            class WdmError extends Error {
                constructor(message, code) {
                    super(message);
                    this.code = code;
                }
            }
            module.exports = WdmError;
        },
        "./src/wdm-common/Errors/index.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const UserFacingError = __webpack_require__("./src/wdm-common/Errors/UserFacingError.js");
            function createUserFacingError(message, userFacingMessage, cause) {
                const err = new UserFacingError(message, userFacingMessage);
                if (cause) {
                    err.cause = cause;
                    if (cause.stack) {
                        err.stack += `\nCaused by: ${cause.stack}`;
                    }
                }
                return err;
            }
            module.exports = {
                createUserFacingError
            };
        },
        "./src/wdm-common/Fb/Fb.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const FBNotLoggedInError = __webpack_require__("./src/wdm-common/Errors/FBNotLoggedInError.js");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            const MainSiteUserLoader = __webpack_require__("./src/wdm-common/Fb/UserLoaders/MainSiteUserLoader.js");
            const MainSiteFriendLoader = __webpack_require__("./src/wdm-common/Fb/FriendLoaders/MainSiteFriendLoader.js");
            const {createUserFacingError} = __webpack_require__("./src/wdm-common/Errors/index.js");
            class Fb {
                constructor(httpClient, wdmLogger) {
                    this.httpClient = httpClient;
                    this.wdmLogger = wdmLogger;
                    this.userLoader = new MainSiteUserLoader(this.httpClient, this.wdmLogger);
                    this.friendLoader = new MainSiteFriendLoader(this.httpClient, this.wdmLogger);
                }
                setUserLoader(userLoader) {
                    this.userLoader = userLoader;
                }
                setFriendLoader(friendLoader) {
                    this.friendLoader = friendLoader;
                }
                async getUserInfo() {
                    try {
                        return await this.userLoader.readUserInfo();
                    } catch (e) {
                        if (e instanceof FBNotLoggedInError) {
                            throw e;
                        }
                        throw createUserFacingError("Failed to get user info. " + e.message, "We had a problem reading your Facebook user information. Please ensure you are logged in and try again.");
                    }
                }
                async getFriends(user, onChunkLoaded = () => {}) {
                    console.debug("Loading friends using", this.friendLoader.getName());
                    return this.friendLoader.setOnChunkLoaded(onChunkLoaded).getFriends(user);
                }
                async checkFacebookConnectivity() {
                    const url = "https://m.facebook.com/help";
                    return this.httpClient.fetch("GET", url).then((response => response.status === 200));
                }
            }
            module.exports = Fb;
        },
        "./src/wdm-common/Fb/FriendLoaders/AbstractFriendLoader.js": module => {
            class AbstractFriendLoader {
                constructor(httpClient, wdmLogger) {
                    this.httpClient = httpClient;
                    this.wdmLogger = wdmLogger;
                    this.onChunkLoaded = null;
                }
                getName() {
                    return this.constructor.name;
                }
                setOnChunkLoaded(func) {
                    this.onChunkLoaded = func;
                    return this;
                }
                async getFriends(user) {
                    return Promise.resolve([]);
                }
                getUrl(url) {
                    return this.httpClient.fetch("GET", url).then((response => response.text));
                }
                postUrl(url, params) {
                    const headers = {
                        "Content-Type": "application/x-www-form-urlencoded"
                    };
                    return this.httpClient.fetch("POST", url, headers, params).then((response => response.text));
                }
            }
            module.exports = AbstractFriendLoader;
        },
        "./src/wdm-common/Fb/FriendLoaders/MainSiteFriendLoader.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const AbstractFriendLoader = __webpack_require__("./src/wdm-common/Fb/FriendLoaders/AbstractFriendLoader.js");
            const {getIdFromUrl} = __webpack_require__("./src/wdm-common/Fb/functions.js");
            const docAcceptHeaderValue = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";
            class MainSiteFriendLoader extends AbstractFriendLoader {
                async getFriends(user) {
                    const friends = [];
                    const page1Result = await this.loadInitialFriendsPage();
                    console.debug(`Loaded ${page1Result.friends.length} friends from the first page.`, page1Result.friends);
                    friends.push(...page1Result.friends);
                    this.onChunkLoaded(friends.length);
                    let dtsg = page1Result.dtsg;
                    let hasNextPage = page1Result.hasNextPage;
                    let endCursor = page1Result.endCursor;
                    while (hasNextPage) {
                        if (!dtsg) {
                            throw new Error("Next friends page is available but no DTSG token was found.");
                        }
                        if (!endCursor) {
                            throw new Error("Next friends page is available but no endCursor was found.");
                        }
                        const nextPageResult = await this.loadAdditionalFriends(endCursor, dtsg, user.userId);
                        console.debug(`Loaded ${nextPageResult.friends.length} friends from additional page.`, nextPageResult.friends);
                        if (!nextPageResult) {
                            break;
                        }
                        friends.push(...nextPageResult.friends);
                        this.onChunkLoaded(friends.length);
                        hasNextPage = nextPageResult.hasNextPage;
                        endCursor = nextPageResult.endCursor;
                    }
                    return Promise.resolve(friends);
                }
                async loadInitialFriendsPage() {
                    const htmlString = await this.fetchInitialFriendsPage();
                    return this.parseInitialFriendsPage(htmlString);
                }
                async fetchInitialFriendsPage() {
                    const result = await this.httpClient.fetch("GET", "https://www.facebook.com/friends/list", {
                        accept: docAcceptHeaderValue,
                        dpr: 1
                    });
                    return result.text;
                }
                parseInitialFriendsPage(htmlString) {
                    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
                    let match;
                    let allFriends;
                    function findKey(obj, key) {
                        if (obj && typeof obj === "object") {
                            for (const k in obj) {
                                if (k === key) {
                                    return obj[k];
                                }
                                const found = findKey(obj[k], key);
                                if (found) {
                                    return found;
                                }
                            }
                        }
                        return null;
                    }
                    while ((match = scriptRegex.exec(htmlString)) !== null) {
                        const scriptContent = match[1].trim();
                        if (scriptContent.includes('"all_friends"')) {
                            try {
                                const jsonData = JSON.parse(scriptContent);
                                allFriends = findKey(jsonData, "all_friends");
                                if (!allFriends) {
                                    return null;
                                }
                            } catch (e) {
                                console.error("Failed to parse all_friends JSON:", e, scriptContent);
                                throw new Error("Failed to parse all_friends JSON. " + e.message);
                            }
                        }
                    }
                    if (!allFriends) {
                        throw new Error("all_friends not found in response.");
                    }
                    const dtsgRegex = /"DTSGInitialData".*?"token":\s*"([^"]+)"/s;
                    const dtsgMatch = htmlString.match(dtsgRegex);
                    let dtsg;
                    if (dtsgMatch) {
                        dtsg = dtsgMatch[1];
                        console.log("Extracted DTSGInitialData Token:", dtsg);
                    } else {
                        console.log("DTSGInitialData token not found.");
                    }
                    return {
                        ...this.parseAllFriendsJson(allFriends),
                        dtsg
                    };
                }
                edgeToFriend(edge) {
                    return {
                        ...this.nodeToFriend(edge.node)
                    };
                }
                nodeToFriend(node) {
                    const url = node.url || null;
                    const urlId = url ? getIdFromUrl(new URL(url)) : null;
                    const friend = {
                        friendId: node.id || null,
                        urlId,
                        url,
                        name: node.name || null,
                        pictureUrl: node.profile_picture?.uri || null
                    };
                    if (node.__isFriendNode === "RestrictedUser" || node.__isNode === "RestrictedUser" || node.__typename === "RestrictedUser") {
                        friend.deactivated = 1;
                    } else {
                        friend.deactivated = 0;
                    }
                    return friend;
                }
                async loadAdditionalFriends(cursor, dtsg, userId) {
                    const responseString = await this.fetchAdditionalFriends(cursor, dtsg, userId);
                    return this.parseAdditionalFriendsPage(responseString);
                }
                async fetchAdditionalFriends(cursor, dtsg, userId) {
                    const headers = {
                        accept: "*/*",
                        referer: "https://www.facebook.com/friends/list",
                        "X-Fb-Friendly-Name": "FriendingCometFriendsListPaginationQuery"
                    };
                    const body = {
                        av: userId,
                        __aaid: "0",
                        __user: userId,
                        __a: "1",
                        __req: "10",
                        __hs: "20029.HYP:comet_pkg.2.1..2.1",
                        dpr: "1",
                        __ccg: "EXCELLENT",
                        __comet_req: "15",
                        fb_dtsg: dtsg,
                        __spin_b: "trunk",
                        fb_api_caller_class: "RelayModern",
                        fb_api_req_friendly_name: "FriendingCometFriendsListPaginationQuery",
                        variables: JSON.stringify({
                            count: 30,
                            cursor,
                            name: null,
                            scale: 1
                        }),
                        server_timestamps: "true",
                        doc_id: "27405320069114034"
                    };
                    const result = await this.httpClient.fetch("POST", "https://www.facebook.com/api/graphql/", headers, body);
                    return result.text;
                }
                parseAdditionalFriendsPage(responseString) {
                    let responseJson;
                    try {
                        responseJson = JSON.parse(responseString);
                    } catch (e) {
                        console.error("Failed to parse additional friends JSON:", e, responseString);
                        throw new Error("Failed to parse additional friends JSON. " + e.message);
                    }
                    const allFriends = responseJson.data?.viewer?.all_friends;
                    if (!allFriends) {
                        console.error("all_friends not found in response.", responseString);
                        throw new Error("all_friends not found in response.");
                    }
                    return this.parseAllFriendsJson(allFriends);
                }
                parseAllFriendsJson(allFriends) {
                    let hasNextPage = false;
                    let lastCursor = null;
                    let endCursor = null;
                    if (!allFriends.edges) {
                        console.error("all_friends.edges not found in response.", allFriends);
                        throw new Error("all_friends.edges not found in response.");
                    }
                    const friends = [];
                    allFriends.edges.forEach((responseFriend => {
                        friends.push(this.edgeToFriend(responseFriend));
                        lastCursor = responseFriend.cursor;
                    }));
                    if (!allFriends.page_info) {
                        console.error("all_friends.page_info not found in response.");
                    } else {
                        hasNextPage = allFriends.page_info.has_next_page;
                        endCursor = allFriends.page_info.end_cursor;
                    }
                    return {
                        friends,
                        lastCursor,
                        hasNextPage,
                        endCursor
                    };
                }
            }
            module.exports = MainSiteFriendLoader;
        },
        "./src/wdm-common/Fb/UserLoaders/AbstractUserLoader.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const FBNotLoggedInError = __webpack_require__("./src/wdm-common/Errors/FBNotLoggedInError.js");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            class AbstractUserLoader {
                constructor(httpClient, wdmLogger) {
                    this.httpClient = httpClient;
                    this.wdmLogger = wdmLogger;
                }
                getName() {
                    return this.constructor.name;
                }
                async readUserInfo() {
                    return Promise.resolve({
                        userId: null,
                        fullName: null,
                        shortName: null,
                        pictureUrl: null
                    });
                }
                requestAndParseUserInfo(url) {
                    console.debug("GET", url);
                    return this.httpClient.fetch("GET", url).then((async response => {
                        this.checkForNotLoggedInResponse(response);
                        return response.text;
                    })).then((html => {
                        const data = this.extractUserInfoFromHtml(html);
                        if (!data.userId) {
                            throw new Error("Failed to read user ID from URL:" + url);
                        }
                        return data;
                    })).catch((e => {
                        log.warn(e);
                        throw e;
                    }));
                }
                extractUserInfoFromHtml(html) {
                    return {};
                }
                checkForNotLoggedInResponse(response) {
                    const redirectedUrl = new URL(response.url);
                    if (redirectedUrl.pathname === "/" || redirectedUrl.pathname === "/login.php") {
                        throw new FBNotLoggedInError;
                    }
                }
                extractJsonValueFromHtml(html, key) {
                    const startKey = `"${key}":`;
                    const startPos = html.indexOf(startKey);
                    if (startPos === -1) {
                        return null;
                    }
                    let value = html.substring(startPos + startKey.length);
                    if (value[0] === '"') {
                        value = value.substring(1);
                        value = value.substring(0, value.indexOf('"'));
                    } else if (value[0] === "{") {
                        value = value.substring(0, value.indexOf("}") + 1);
                    }
                    return value || null;
                }
            }
            module.exports = AbstractUserLoader;
        },
        "./src/wdm-common/Fb/UserLoaders/MainSiteUserLoader.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const AbstractUserLoader = __webpack_require__("./src/wdm-common/Fb/UserLoaders/AbstractUserLoader.js");
            const {parse} = __webpack_require__("./node_modules/node-html-parser/dist/index.js");
            class MainSiteUserLoader extends AbstractUserLoader {
                async readUserInfo() {
                    return this.requestAndParseUserInfo("https://www.facebook.com/settings/?tab=your_facebook_information");
                }
                extractUserInfoFromHtml(html) {
                    let userId = this.extractJsonValueFromHtml(html, "USER_ID");
                    if (!userId) {
                        userId = this.extractJsonValueFromHtml(html, "ACCOUNT_ID");
                    }
                    let fullName = this.extractJsonValueFromHtml(html, "NAME");
                    let shortName = this.extractJsonValueFromHtml(html, "SHORT_NAME");
                    if (!shortName) {
                        const parsedHtml = parse(html);
                        const firstNameEl = parsedHtml.querySelector("[name=primary_first_name]");
                        if (firstNameEl) {
                            shortName = firstNameEl.value;
                        }
                        if (!shortName) {
                            const shortNameRegex = /SHORT_NAME":"(\w+)"/gm;
                            const regexResult = shortNameRegex.exec(html);
                            if (regexResult && regexResult.length >= 2) {
                                shortName = regexResult[1];
                            }
                        }
                    }
                    return {
                        fullName,
                        pictureUrl: null,
                        shortName,
                        userId
                    };
                }
            }
            module.exports = MainSiteUserLoader;
        },
        "./src/wdm-common/Fb/functions.js": module => {
            const getFirstFriendsPageUrlFromMBasicMeHtml = parsedHtml => {
                const friendLinks = parsedHtml.querySelectorAll('a[href*="/friends"],a[href*="v=friends"]').filter((el => el.attrs.href && el.attrs.href.indexOf("friendship") === -1));
                if (friendLinks[1]) {
                    return "https://mbasic.facebook.com" + friendLinks[1].attrs.href;
                } else if (friendLinks[0]) {
                    return "https://mbasic.facebook.com" + friendLinks[0].attrs.href;
                }
                return null;
            };
            const findDtsg = html => {
                const dtsgRegex = new RegExp(/\"dtsg_ag\"\:\{(.+?)\}/);
                const dtsgMatches = html.match(dtsgRegex);
                if (!dtsgMatches || !dtsgMatches.hasOwnProperty(1)) {
                    return null;
                }
                const tokenRegex = new RegExp(/\"token\"\:\"(.+?)\"/);
                const tokenMatches = dtsgMatches[1].match(tokenRegex);
                if (!tokenMatches || !tokenMatches.hasOwnProperty(1)) {
                    return null;
                }
                return tokenMatches[1].toString();
            };
            const getIdFromUrl = url => {
                if (url.searchParams && url.searchParams.get("uid")) {
                    return url.searchParams.get("uid");
                }
                if (url.pathname.indexOf("profile.php") !== -1) {
                    if (url.searchParams.get("id")) {
                        return url.searchParams.get("id");
                    }
                    let pathname = url.pathname;
                    pathname = pathname.replace(/[^0-9]/g, "");
                    if (pathname) {
                        return pathname;
                    }
                    return "";
                }
                return url.pathname.substr(1);
            };
            const getProfileUrl = userIdOrUsername => {
                if (/\D/.test(userIdOrUsername)) {
                    return "https://www.facebook.com/" + userIdOrUsername;
                }
                return "https://www.facebook.com/profile.php?id=" + userIdOrUsername;
            };
            module.exports = {
                getFirstFriendsPageUrlFromMBasicMeHtml,
                getIdFromUrl,
                getProfileUrl,
                findDtsg
            };
        },
        "./src/wdm-common/Friends/AbstractFriendQueryAdapter.js": module => {
            class AbstractFriendQueryAdapter {
                getQueryForFriendStatus(userId, friendStatus, offset = null, limit = null) {
                    return {
                        count: async () => {},
                        toArray: async () => {}
                    };
                }
            }
            module.exports = AbstractFriendQueryAdapter;
        },
        "./src/wdm-common/Friends/DexieFriendQueryAdapter.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const FriendStatus = __webpack_require__("./src/wdm-common/Friends/FriendStatus.js");
            const AbstractFriendQueryAdapter = __webpack_require__("./src/wdm-common/Friends/AbstractFriendQueryAdapter.js");
            class DexieFriendQueryAdapter extends AbstractFriendQueryAdapter {
                constructor(dataStore) {
                    super();
                    this.dataStore = dataStore;
                    this.table = dataStore.getTable("friends");
                }
                getQueryForFriendStatus(userId, friendStatus, offset = null, limit = null) {
                    let query;
                    switch (friendStatus) {
                      case FriendStatus.CURRENT:
                        query = this.table.where("[userId+deleted+deactivated+seen+name]").between([ userId, 0, 0, this.dataStore.dexieMinKey(), this.dataStore.dexieMinKey() ], [ userId, 0, 0, this.dataStore.dexieMaxKey(), this.dataStore.dexieMaxKey() ]);
                        break;

                      case FriendStatus.DELETED__UNSEEN:
                        query = this.table.where("[userId+deleted+deactivated+seen+name]").between([ userId, 1, 0, 0, this.dataStore.dexieMinKey() ], [ userId, 1, 0, 0, this.dataStore.dexieMaxKey() ]);
                        break;

                      case FriendStatus.DEACTIVATED__UNSEEN:
                        query = this.table.where("[userId+deleted+deactivated+seen+name]").between([ userId, 1, 1, 0, this.dataStore.dexieMinKey() ], [ userId, 1, 1, 0, this.dataStore.dexieMaxKey() ]);
                        break;

                      case FriendStatus.DELETED:
                        query = this.table.where("[userId+deleted+deactivated+deletedByUser+lastSeen]").between([ userId, 1, 0, 0, this.dataStore.dexieMinKey() ], [ userId, 1, 0, 0, this.dataStore.dexieMaxKey() ]).reverse();
                        break;

                      case FriendStatus.DEACTIVATED:
                        query = this.table.where("[userId+deleted+deactivated+deletedByUser+lastSeen]").between([ userId, 1, 1, 0, this.dataStore.dexieMinKey() ], [ userId, 1, 1, 0, this.dataStore.dexieMaxKey() ]).reverse();
                        break;

                      case FriendStatus.DELETED_BY_USER:
                        query = this.table.where("[userId+deleted+deactivated+deletedByUser+lastSeen]").between([ userId, 1, 0, 1, this.dataStore.dexieMinKey() ], [ userId, 1, 0, 1, this.dataStore.dexieMaxKey() ]).reverse();
                        break;

                      case FriendStatus.NEW:
                        query = this.table.where({
                            userId,
                            new: 1
                        });
                        break;

                      default:
                        throw new Error("friendStatus must be specified.");
                    }
                    if (offset) {
                        query = query.offset(offset);
                    }
                    if (limit) {
                        query = query.limit(limit);
                    }
                    return query;
                }
            }
            module.exports = DexieFriendQueryAdapter;
        },
        "./src/wdm-common/Friends/Friend.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const {populate} = __webpack_require__("./src/wdm-common/Functions/objects.js");
            class Friend {
                constructor(data = {}) {
                    this.userId = null;
                    this.friendId = null;
                    this.name = null;
                    this.firstSeen = null;
                    this.lastSeen = null;
                    this.urlId = null;
                    this.pictureUrl = null;
                    this.deleted = 0;
                    this.deactivated = 0;
                    this.deletedByUser = 0;
                    this.seen = 0;
                    this.new = 0;
                    this.history = [];
                    populate(this, data);
                    if (this.firstSeen && typeof this.firstSeen === "string") {
                        this.firstSeen = new Date(this.firstSeen);
                    }
                    if (this.lastSeen && typeof this.lastSeen === "string") {
                        this.lastSeen = new Date(this.lastSeen);
                    }
                    if (typeof this.history === "string") {
                        try {
                            this.history = JSON.parse(this.history);
                        } catch (e) {
                            console.warn("Friend: failed to parse history JSON, resetting to []", this.friendId, e);
                            this.history = [];
                        }
                    }
                    if (!Array.isArray(this.history)) {
                        this.history = [];
                    }
                }
            }
            module.exports = Friend;
        },
        "./src/wdm-common/Friends/FriendImporter.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const ConsoleLogger = __webpack_require__("./src/wdm-common/Logging/ConsoleLogger.js");
            const User = __webpack_require__("./src/wdm-common/Users/User.js");
            const Friend = __webpack_require__("./src/wdm-common/Friends/Friend.js");
            class FriendImporter {
                constructor(api, friendRepository, userRepository) {
                    this.api = api;
                    this.friendRepository = friendRepository;
                    this.userRepository = userRepository;
                    this.log = new ConsoleLogger("FriendImporter");
                }
                async getRemoteFriendFile(userId) {
                    const friends = await this.api.request("GET", `user/fb/${userId}/friends`);
                    this.log.debug("Fetched remote friends", friends);
                    return friends;
                }
                async deleteRemoteFriendFile(userId) {
                    await this.api.request("DELETE", `user/fb/${userId}/friends`);
                }
                parseFriendFile(friendFile) {
                    const result = {
                        user: null,
                        friends: []
                    };
                    result.user = this.createUserFromFile(friendFile.usr);
                    result.friends = friendFile.f.map((f => this.createFriendFromFile(result.user.userId, f)));
                    return result;
                }
                createUserFromFile(usr) {
                    const user = new User;
                    user.userId = usr.i;
                    user.fullName = usr.fn;
                    user.shortName = usr.sn;
                    user.pictureUrl = usr.pu;
                    user.firstSync = usr.fs ? new Date(usr.fs).getTime() : null;
                    user.lastSync = usr.ls ? new Date(usr.ls).getTime() : null;
                    return user;
                }
                createFriendFromFile(userId, f) {
                    const friend = new Friend;
                    friend.userId = userId;
                    friend.friendId = f.i;
                    friend.name = f.n;
                    friend.firstSeen = f.f ? new Date(f.f) : null;
                    friend.lastSeen = f.l ? new Date(f.l) : null;
                    friend.deleted = f.d ? 1 : 0;
                    friend.deactivated = f.e ? 1 : 0;
                    friend.deletedByUser = f.b ? 1 : 0;
                    friend.seen = f.s ? 1 : 0;
                    friend.new = f.w ? 1 : 0;
                    friend.history = f.h || [];
                    return friend;
                }
                async createFriendFile(userId) {
                    this.log.debug("Creating friend file for user", userId);
                    const user = await this.userRepository.getUser(userId);
                    const friends = await this.friendRepository.getAllUserFriends(userId);
                    const result = {
                        u: null,
                        usr: this.createFileUser(user),
                        f: friends.map((friend => this.createFileFriend(friend)))
                    };
                    this.log.log("Created friend file", result);
                    return result;
                }
                createFileUser(user) {
                    return {
                        i: user.userId,
                        fn: user.fullName,
                        sn: user.shortName,
                        pu: user.pictureUrl,
                        fs: user.firstSync ? new Date(user.firstSync).toISOString() : null,
                        ls: user.lastSync ? new Date(user.lastSync).toISOString() : null
                    };
                }
                createFileFriend(friend) {
                    return {
                        i: friend.friendId,
                        n: friend.name,
                        f: friend.firstSeen ? new Date(friend.firstSeen).toISOString() : null,
                        l: friend.lastSeen ? new Date(friend.lastSeen).toISOString() : null,
                        b: friend.deletedByUser ? 1 : 0,
                        s: friend.seen ? 1 : 0,
                        d: friend.deleted ? 1 : 0,
                        w: friend.new ? 1 : 0,
                        e: friend.deactivated ? 1 : 0,
                        h: friend.history || []
                    };
                }
                async importFriendFile(friendFile, importUser = true) {
                    this.log.log("Importing backup for user ID", friendFile.u);
                    this.log.log("Friend file", friendFile);
                    const parsedFriendFile = await this.parseFriendFile(friendFile);
                    this.log.log("Parsed friend file", parsedFriendFile);
                    if (importUser) {
                        this.log.log("Importing user", parsedFriendFile.user);
                        await this.userRepository.persist(parsedFriendFile.user);
                    }
                    this.log.log(`Importing ${parsedFriendFile.friends.length} friends for user ${parsedFriendFile.user.userId}`);
                    await this.friendRepository.persistFriends(parsedFriendFile.friends);
                    return parsedFriendFile;
                }
            }
            module.exports = FriendImporter;
        },
        "./src/wdm-common/Friends/FriendRepository.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const Friend = __webpack_require__("./src/wdm-common/Friends/Friend.js");
            const FriendStatus = __webpack_require__("./src/wdm-common/Friends/FriendStatus.js");
            const ConsoleLogger = __webpack_require__("./src/wdm-common/Logging/ConsoleLogger.js");
            const {addToFriendHistory} = __webpack_require__("./src/wdm-common/Friends/index.js");
            const WdmError = __webpack_require__("./src/wdm-common/Errors/WdmError.js");
            class FriendRepository {
                constructor(dataStore, queryAdapter) {
                    this.dataStore = dataStore;
                    this.queryAdapter = queryAdapter;
                    this.log = new ConsoleLogger("FriendRepository");
                }
                async getFriend(userId, friendId) {
                    const friend = await this.dataStore.findOneWhere("friends", {
                        userId,
                        friendId
                    });
                    return friend ? new Friend(friend) : null;
                }
                async getFriends(userId, friendIds) {
                    const friends = {};
                    await Promise.all(friendIds.map((friendId => this.getFriend(userId, friendId).then((friend => {
                        if (friend) {
                            friends[friend.friendId] = friend;
                        }
                    })))));
                    return friends;
                }
                async getAllUserFriends(userId) {
                    const friendsData = await this.getAllUserFriendsData(userId);
                    return this.mapFriendsDataToArray(friendsData);
                }
                async getAllUserFriendsData(userId) {
                    return this.dataStore.findWhere("friends", {
                        userId
                    });
                }
                async deleteFriend(userId, friendId) {
                    return this.dataStore.deleteWhere("friends", {
                        userId,
                        friendId
                    });
                }
                async setFriendDeletedByUser(userId, friendId, value) {
                    const friend = await this.getFriend(userId, friendId);
                    if (!friend) {
                        throw new WdmError("Friend not found.", "FRIEND_NOT_FOUND");
                    }
                    if (!friend.deleted) {
                        throw new WdmError("Cannot set deleted-by-user status on a friend that is not deleted.", "INVALID_FRIEND_STATUS");
                    }
                    let newValue;
                    let newHistoryStatus;
                    if (value) {
                        newValue = 1;
                        newHistoryStatus = FriendStatus.DELETED_BY_USER;
                    } else if (friend.deactivated) {
                        newValue = 0;
                        newHistoryStatus = FriendStatus.DEACTIVATED;
                    } else {
                        newValue = 0;
                        newHistoryStatus = FriendStatus.DELETED;
                    }
                    if (friend.deletedByUser === newValue) {
                        return friend;
                    }
                    friend.deletedByUser = newValue;
                    addToFriendHistory(friend, newHistoryStatus);
                    await this.persistFriends([ friend ]);
                    return friend;
                }
                async setFriendsSeen(userId, friendIds) {
                    let friends = await this.getFriends(userId, friendIds);
                    let persistFriends = [];
                    friends = Object.values(friends);
                    friends.forEach((friend => {
                        if (friend.new) {
                            friend.seen = 1;
                            friend.new = 0;
                            addToFriendHistory(friend, FriendStatus.CURRENT);
                            persistFriends.push(friend);
                        } else if (friend.deactivated && !friend.seen) {
                            friend.seen = 1;
                            friend.new = 0;
                            addToFriendHistory(friend, FriendStatus.DEACTIVATED);
                            persistFriends.push(friend);
                        } else if (friend.deleted && !friend.seen) {
                            friend.seen = 1;
                            friend.new = 0;
                            addToFriendHistory(friend, FriendStatus.DELETED);
                            persistFriends.push(friend);
                        }
                    }));
                    await this.persistFriends(persistFriends);
                    return friends;
                }
                async getExistingMissingFriends(userId) {
                    const [deleted, deactivated, deletedByUser] = await Promise.all([ this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DELETED).toArray(), this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DEACTIVATED).toArray(), this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DELETED_BY_USER).toArray() ]);
                    return this.mapFriendsToObject(this.mapFriendsDataToArray([ ...deleted, ...deactivated, ...deletedByUser ]));
                }
                async getActiveFriends(userId) {
                    const friends = await this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.CURRENT).toArray();
                    return this.mapFriendsToObject(this.mapFriendsDataToArray(friends));
                }
                async getDeactivatedFriends(userId) {
                    const friends = await this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DEACTIVATED).toArray();
                    return this.mapFriendsToObject(this.mapFriendsDataToArray(friends));
                }
                async findFriendsByFriendStatus(userId, friendStatus, offset = null, limit = null) {
                    const result = {
                        total: null,
                        friends: null
                    };
                    const countQuery = this.queryAdapter.getQueryForFriendStatus(userId, friendStatus);
                    const friendsQuery = this.queryAdapter.getQueryForFriendStatus(userId, friendStatus, offset, limit);
                    await Promise.all([ countQuery.count().then((count => {
                        result.total = count;
                    })), friendsQuery.toArray().then((results => {
                        result.friends = this.mapFriendsDataToArray(results);
                    })) ]);
                    return result;
                }
                async countActiveFriends(userId) {
                    return this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.CURRENT).count();
                }
                async countUnseenDeletedFriends(userId) {
                    return this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DELETED__UNSEEN).count();
                }
                async countUnseenDeactivatedFriends(userId) {
                    return this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.DEACTIVATED__UNSEEN).count();
                }
                async countNewFriends(userId) {
                    return this.queryAdapter.getQueryForFriendStatus(userId, FriendStatus.NEW).count();
                }
                async getUserFriendCounts(userId) {
                    const friendCounts = {
                        activeFriends: 0,
                        unseenDeletedFriends: 0,
                        unseenDeactivatedFriends: 0,
                        unseenNewFriends: 0
                    };
                    await Promise.all([ this.countActiveFriends(userId).then((c => {
                        friendCounts.activeFriends = c;
                    })), this.countUnseenDeletedFriends(userId).then((c => {
                        friendCounts.unseenDeletedFriends = c;
                    })), this.countUnseenDeactivatedFriends(userId).then((c => {
                        friendCounts.unseenDeactivatedFriends = c;
                    })), this.countNewFriends(userId).then((c => {
                        friendCounts.unseenNewFriends = c;
                    })) ]);
                    return friendCounts;
                }
                mapFriendsDataToArray(friendsData, additionalData = {}) {
                    return friendsData.map((d => new Friend({
                        ...d,
                        ...additionalData
                    })));
                }
                mapFriendsToObject(friends) {
                    const sortedFriends = {};
                    friends.forEach((f => {
                        sortedFriends[f.friendId] = f;
                    }));
                    return sortedFriends;
                }
                async persistFriends(friends) {
                    friends.forEach((friend => {
                        if (!friend.userId || !friend.friendId) {
                            throw new Error("Cannot persist friend due to missing key data: " + JSON.stringify(friend));
                        }
                    }));
                    return this.dataStore.persistMany("friends", friends);
                }
                async deleteFriendsForUser(userId) {
                    this.log.debug(`Deleting all friends for user ${userId}`);
                    const friendsData = await this.getAllUserFriendsData(userId);
                    this.log.debug(`Found ${friendsData.length} friends to delete for user ${userId}`);
                    for (let i = 0; i < friendsData.length; i++) {
                        await this.deleteFriend(userId, friendsData[i].friendId);
                        this.log.debug(`Deleted friend ${friendsData[i].friendId} for user ${userId}`);
                    }
                }
            }
            module.exports = FriendRepository;
        },
        "./src/wdm-common/Friends/FriendStatus.js": module => {
            const FriendStatus = {
                DELETED: "DELETED",
                DELETED__UNSEEN: "DELETED__UNSEEN",
                DEACTIVATED: "DEACTIVATED",
                DEACTIVATED__UNSEEN: "DEACTIVATED__UNSEEN",
                DELETED_BY_USER: "DELETED_BY_USER",
                NEW: "NEW",
                CURRENT: "CURRENT"
            };
            module.exports = FriendStatus;
        },
        "./src/wdm-common/Friends/index.js": module => {
            const addToFriendHistory = (friend, status) => {
                if (!friend.history) {
                    friend.history = [];
                }
                const lastEntry = friend.history[friend.history.length - 1];
                if (lastEntry && lastEntry.status === status) {
                    return;
                }
                friend.history.push({
                    status,
                    recordedAt: (new Date).toISOString()
                });
            };
            module.exports = {
                addToFriendHistory
            };
        },
        "./src/wdm-common/Functions/hash.js": module => {
            async function sha256(source) {
                const sourceBytes = (new TextEncoder).encode(source);
                const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
                const resultBytes = [ ...new Uint8Array(digest) ];
                return resultBytes.map((x => x.toString(16).padStart(2, "0"))).join("");
            }
            module.exports = {
                sha256
            };
        },
        "./src/wdm-common/Functions/objects.js": module => {
            const populate = (entity, data) => {
                if (!data) {
                    return;
                }
                Object.keys(data).forEach((key => {
                    if (entity.hasOwnProperty(key)) {
                        entity[key] = data[key];
                    }
                }));
            };
            const flip = data => Object.fromEntries(Object.entries(data).map((([key, value]) => [ value, key ])));
            module.exports = {
                flip,
                populate
            };
        },
        "./src/wdm-common/Functions/sessions.js": (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                getSessionID: () => getSessionID,
                getVisitID: () => getVisitID
            });
            const getSessionID = () => typeof window !== "undefined" ? window.umi_sid || null : null;
            const getVisitID = () => typeof window !== "undefined" ? window.umi_vid || null : null;
        },
        "./src/wdm-common/Functions/uuids.js": module => {
            const generateUUID = () => {
                let d = (new Date).getTime();
                return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c => {
                    const r = (d + Math.random() * 16) % 16 | 0;
                    d = Math.floor(d / 16);
                    return (c === "x" ? r : r & 3 | 8).toString(16);
                }));
            };
            module.exports = {
                generateUUID
            };
        },
        "./src/wdm-common/Http/AbstractHttpClient.js": module => {
            class AbstractHttpClient {
                constructor(wdmLogger) {
                    this.wdmLogger = wdmLogger;
                }
                async fetch(method, url, headers = {}, body = {}) {
                    throw new Error("Method fetch must be implemented.");
                }
            }
            module.exports = AbstractHttpClient;
        },
        "./src/wdm-common/Http/FetchHttpClient.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const AbstractHttpClient = __webpack_require__("./src/wdm-common/Http/AbstractHttpClient.js");
            class FetchHttpClient extends AbstractHttpClient {
                async fetch(method, url, headers = {}, body = {}) {
                    const options = {
                        method,
                        headers
                    };
                    if (method !== "GET") {
                        const bodySearchParams = new URLSearchParams(body);
                        options.body = bodySearchParams.toString();
                        headers["content-type"] = "application/x-www-form-urlencoded;charset=UTF-8";
                        headers["content-length"] = options.body.length;
                    }
                    return fetch(url, options).then((async response => {
                        const responseText = await response.text();
                        this.wdmLogger.addRequest(url, method, response.url, response.status, responseText);
                        return {
                            status: response.status,
                            url: response.url,
                            text: responseText
                        };
                    })).catch((error => {
                        this.wdmLogger.addRequest(url, method, null, 0, `Error: ${error.message}`);
                        throw error;
                    }));
                }
            }
            module.exports = FetchHttpClient;
        },
        "./src/wdm-common/Logging/ConsoleLogger.js": module => {
            const ConsoleLogger = function(name, debugEnabled) {
                if (debugEnabled === undefined) {
                    debugEnabled = typeof window !== "undefined" && !!window.debug;
                }
                this.name = name;
                const logName = `[${name}]`;
                this.error = function() {
                    return Function.prototype.bind.call(console.error, console, logName);
                }();
                this.log = function() {
                    return Function.prototype.bind.call(console.log, console, logName);
                }();
                this.warn = function() {
                    return Function.prototype.bind.call(console.warn, console, logName);
                }();
                this.setDebugEnabled = enabled => {
                    if (enabled) {
                        this.debug = function() {
                            return Function.prototype.bind.call(console.debug, console, logName);
                        }();
                    } else {
                        this.debug = () => {};
                    }
                };
                this.setDebugEnabled(debugEnabled);
            };
            module.exports = ConsoleLogger;
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
        "./src/wdm-common/Messaging/RequestType.js": module => {
            const RequestType = {
                GET_USER: "GetUser",
                DELETE_USER: "DeleteUser",
                UPDATE_USER: "UpdateUser",
                GET_FRIENDS: "GetFriends",
                SET_FRIEND_DELETED_BY_USER: "SetFriendDeletedByUser",
                FORGET_FRIEND: "ForgetFriend",
                SET_FRIENDS_SEEN: "SetFriendsSeen"
            };
            module.exports = RequestType;
        },
        "./src/wdm-common/Storage/AbstractDataStore.js": module => {
            class AbstractDataStore {
                async init() {}
                async persist(storeName, data) {}
                async persistMany(storeName, dataArray) {
                    for (let i = 0; i < dataArray.length; i++) {
                        await this.persist(storeName, dataArray[i]);
                    }
                }
                async findWhere(storeName, where) {}
                async findOneWhere(storeName, where) {
                    const results = await this.findWhere(storeName, where);
                    return results.length > 0 ? results[0] : null;
                }
                async findAll(storeName, orderBy) {}
                async findLatest(storeName, orderBy) {}
                async deleteWhere(storeName, where) {}
                async clear(storeName) {}
                async upgrade() {}
            }
            module.exports = AbstractDataStore;
        },
        "./src/wdm-common/Storage/DexieDataStore.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            const AbstractDataStore = __webpack_require__("./src/wdm-common/Storage/AbstractDataStore.js");
            let Dexie = __webpack_require__("dexie");
            if (Dexie.default) {
                Dexie = Dexie.default;
            }
            class DexieDataStore extends AbstractDataStore {
                constructor() {
                    super();
                    this.db = null;
                }
                async init() {
                    this.db = new Dexie("wdm");
                    this.db.version(1).stores({
                        friends: [ "[userId+friendId]", "[userId+deleted+deactivated+seen+name]", "[userId+deleted+deactivated+deletedByUser+lastSeen]", "[userId+new]" ].join(","),
                        users: "userId,lastSync"
                    });
                    await this.upgrade();
                }
                getTable(storeName) {
                    return this.db.table(storeName);
                }
                async persist(storeName, data) {
                    try {
                        JSON.stringify(data);
                    } catch (e) {
                        log.error(`Failed to convert to JSON to persist to store '${storeName}'`, data);
                        console.trace();
                        throw e;
                    }
                    try {
                        data = Dexie.deepClone(data);
                    } catch (e) {
                        log.error(`Failed to clone data to persist to store '${storeName}'`, data);
                        console.trace();
                        throw e;
                    }
                    try {
                        return await this.getTable(storeName).put(data);
                    } catch (e) {
                        e.message = `Failed to put data to store '${storeName}'. Data: ` + JSON.stringify(data) + ". Message: " + e.message;
                        throw e;
                    }
                }
                async persistMany(storeName, dataArray) {
                    const started = new Date;
                    return this.getTable(storeName).bulkPut(dataArray).then((() => {
                        log.debug(`Persisted ${dataArray.length} items to ${storeName}`, `in ${(new Date).getTime() - started.getTime()}ms`);
                    }));
                }
                async findWhere(storeName, where) {
                    const started = new Date;
                    return this.getTable(storeName).where(where).toArray().then((data => {
                        log.debug(`Loaded ${data.length} items from ${storeName} where ${JSON.stringify(where)}`, `in ${(new Date).getTime() - started.getTime()}ms`);
                        return data;
                    }));
                }
                async findAll(storeName, orderBy) {
                    return this.getTable(storeName).orderBy(orderBy).toArray();
                }
                async findLatest(storeName, orderBy) {
                    return this.getTable(storeName).orderBy(orderBy).reverse().limit(1).first();
                }
                async deleteWhere(storeName, where) {
                    return this.getTable(storeName).where(where).delete();
                }
                async clear(storeName) {
                    return this.getTable(storeName).clear();
                }
                dexieMinKey() {
                    return Dexie.minKey;
                }
                dexieMaxKey() {
                    return Dexie.maxKey;
                }
                async upgrade() {
                    const users = await this.getTable("users").toArray();
                    for (let i = 0; i < users.length; i++) {
                        const user = users[i];
                        if (user.firstSync) {
                            if (typeof user.firstSync === "string") {
                                user.firstSync = new Date(user.firstSync).getTime();
                            } else if (user.firstSync instanceof Date) {
                                user.firstSync = user.firstSync.getTime();
                            }
                        }
                        if (user.lastSync) {
                            if (typeof user.lastSync === "string") {
                                user.lastSync = new Date(user.lastSync).getTime();
                            } else if (user.lastSync instanceof Date) {
                                user.lastSync = user.lastSync.getTime();
                            }
                        }
                        await this.persist("users", user);
                    }
                }
            }
            module.exports = DexieDataStore;
        },
        "./src/wdm-common/Syncing/AbstractSyncObserver.js": module => {
            class AbstractSyncObserver {
                onError(error, type) {}
                onFinish(result) {}
                onProgress(state, data = {}) {}
                onUser(user) {}
            }
            module.exports = AbstractSyncObserver;
        },
        "./src/wdm-common/Syncing/SyncError.js": module => {
            class SyncError extends Error {
                constructor(previous, type) {
                    super(previous.message, {
                        cause: previous
                    });
                    this.name = this.constructor.name;
                    this.type = type;
                }
            }
            module.exports = SyncError;
        },
        "./src/wdm-common/Syncing/SyncErrorType.js": module => {
            const SyncErrorType = {
                FB_OFFLINE: "FB_OFFLINE",
                API_OFFLINE: "API_OFFLINE",
                FB_NOT_LOGGED_IN: "FB_NOT_LOGGED_IN",
                NO_FB_USER: "NO_FB_USER",
                READ_FB_USER_FAILED: "READ_FB_USER_FAILED",
                LOGIN_WDM_FAILED: "LOGIN_WDM_FAILED",
                IMPORT_FRIENDS_FAILED: "IMPORT_FRIENDS_FAILED",
                FETCH_FRIENDS_FAILED: "FETCH_FRIENDS_FAILED",
                SAVE_FRIENDS_FAILED: "SAVE_FRIENDS_FAILED",
                CALCULATE_FRIENDS_FAILED: "CALCULATE_FRIENDS_FAILED",
                SEND_RESULTS_FAILED: "SEND_RESULTS_FAILED",
                SAVE_RESULTS_FAILED: "SAVE_RESULTS_FAILED",
                API_ERROR: "API_ERROR",
                NO_EXTENSION: "NO_EXTENSION",
                TIMEOUT: "TIMEOUT"
            };
            module.exports = SyncErrorType;
        },
        "./src/wdm-common/Syncing/SyncState.js": module => {
            const SyncState = {
                STARTED: "STARTED",
                CHECK_CONNECTIVITY: "CHECK_CONNECTIVITY",
                LOGIN_FB: "LOGIN_FB",
                LOGIN_WDM: "LOGIN_WDM",
                IMPORT_FRIENDS: "IMPORT_FRIENDS",
                FETCH_FRIENDS: "FETCH_FRIENDS",
                SAVE_FRIENDS: "SAVE_FRIENDS",
                CALCULATE_FRIENDS: "CALCULATE_FRIENDS",
                SAVE_RESULTS: "SAVE_RESULTS",
                SEND_RESULTS: "SEND_RESULTS",
                COMPLETE: "COMPLETE",
                FAILED: "FAILED"
            };
            module.exports = SyncState;
        },
        "./src/wdm-common/Syncing/Syncer.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const FBNotLoggedInError = __webpack_require__("./src/wdm-common/Errors/FBNotLoggedInError.js");
            const log = __webpack_require__("./src/wdm-common/Logging/console-log.js");
            const SyncState = __webpack_require__("./src/wdm-common/Syncing/SyncState.js");
            const User = __webpack_require__("./src/wdm-common/Users/User.js");
            const SyncErrorType = __webpack_require__("./src/wdm-common/Syncing/SyncErrorType.js");
            const SyncError = __webpack_require__("./src/wdm-common/Syncing/SyncError.js");
            const {generateUUID} = __webpack_require__("./src/wdm-common/Functions/uuids.js");
            const FriendStatus = __webpack_require__("./src/wdm-common/Friends/FriendStatus.js");
            const {addToFriendHistory} = __webpack_require__("./src/wdm-common/Friends/index.js");
            class Syncer {
                constructor(api, fb, friendImporter, friendRepository, observer, userRepository, wdmLogger) {
                    this.api = api;
                    this.fb = fb;
                    this.friendImporter = friendImporter;
                    this.friendRepository = friendRepository;
                    this.observer = observer;
                    this.userRepository = userRepository;
                    this.wdmLogger = wdmLogger;
                    this.isSyncing = false;
                    this.lastSyncedAt = null;
                    this.log = log;
                }
                async sync(syncTrigger) {
                    this.log.debug("Sync requested from trigger:", syncTrigger);
                    if (this.isSyncing) {
                        this.log.debug(`Ignoring sync request from ${syncTrigger} because sync is already in progress.`);
                        return Promise.reject(new Error("Sync already in progress."));
                    }
                    this.isSyncing = true;
                    this.wdmLogger.reset();
                    const syncId = generateUUID();
                    this.wdmLogger.setSync(syncId, syncTrigger);
                    this.log.log("Starting sync from trigger", syncTrigger, "with sync ID", syncId);
                    this.wdmLogger.logSyncEvent(SyncState.STARTED);
                    const promise = this.doSync(syncId, syncTrigger);
                    promise.then((result => {
                        this.wdmLogger.logSyncEvent(SyncState.COMPLETE, {
                            isFirstSync: result?.isFirstSync ? 1 : 0,
                            isReturningSync: result?.isReturningSync ? 1 : 0,
                            friendCount: result ? result.syncResults.fetchedActiveFriends : 0,
                            missingFriendCount: result ? result.syncResults.newlyDeletedFriends : 0,
                            newFriendCount: result ? result.syncResults.newFriends : 0,
                            returningFriendCount: result ? result.syncResults.returningFriends : 0
                        });
                        this.lastSyncedAt = new Date;
                    })).catch((err => {
                        this.wdmLogger.logSyncEvent(SyncState.FAILED, {
                            errorMessage: err.message
                        });
                        this.onError(err, err.type);
                        throw err;
                    })).finally((() => {
                        this.isSyncing = false;
                    }));
                    return promise;
                }
                async doSync(syncId, syncTrigger) {
                    this.observer.onProgress(SyncState.LOGIN_FB);
                    let user;
                    try {
                        user = await this.fb.getUserInfo();
                        this.wdmLogger.setUser(user);
                    } catch (e) {
                        if (e instanceof FBNotLoggedInError) {
                            throw new SyncError(e, SyncErrorType.FB_NOT_LOGGED_IN);
                        }
                        throw new SyncError(e, SyncErrorType.READ_FB_USER_FAILED);
                    }
                    try {
                        user = await this.saveUser(user);
                        this.observer.onUser(user);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.LOGIN_WDM_FAILED);
                    }
                    let isFirstSync = user.isFirstSync();
                    let isReturningSync = false;
                    this.log.debug("Is first sync?", isFirstSync);
                    if (isFirstSync) {
                        this.observer.onProgress(SyncState.IMPORT_FRIENDS);
                        try {
                            const importResult = await this.importFriends(user);
                            this.log.debug("Import result", importResult);
                            if (importResult && importResult.user && importResult.user.firstSync) {
                                user.firstSync = importResult.user.firstSync;
                                isFirstSync = user.isFirstSync();
                                isReturningSync = true;
                            }
                        } catch (e) {
                            throw new SyncError(e, SyncErrorType.IMPORT_FRIENDS_FAILED);
                        }
                    }
                    this.observer.onProgress(SyncState.FETCH_FRIENDS, {
                        loaded: 0
                    });
                    let friends;
                    try {
                        friends = await this.getFriends(user);
                        this.log.log("friends", friends);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.FETCH_FRIENDS_FAILED);
                    }
                    this.observer.onProgress(SyncState.SAVE_FRIENDS);
                    let syncResults;
                    try {
                        syncResults = await this.processFriends(user.userId, friends);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.SAVE_FRIENDS_FAILED);
                    }
                    let friendCounts;
                    try {
                        this.observer.onProgress(SyncState.CALCULATE_FRIENDS);
                        friendCounts = await this.friendRepository.getUserFriendCounts(user.userId);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.CALCULATE_FRIENDS_FAILED);
                    }
                    try {
                        this.observer.onProgress(SyncState.SAVE_RESULTS);
                        user = await this.updateUserLastSync(user, friendCounts);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.SAVE_FRIENDS_FAILED);
                    }
                    let result;
                    try {
                        result = {
                            user: user.toJson(),
                            isFirstSync,
                            isReturningSync,
                            syncResults,
                            friendCounts,
                            syncTrigger,
                            results: friendCounts
                        };
                        this.observer.onProgress(SyncState.SEND_RESULTS);
                        this.observer.onFinish(result);
                    } catch (e) {
                        throw new SyncError(e, SyncErrorType.SEND_RESULTS_FAILED);
                    }
                    return result;
                }
                onError(error, type) {
                    if (error instanceof FBNotLoggedInError) {
                        this.log.warn("Sync failed", type, error);
                    } else {
                        this.log.error("Sync failed", type, error);
                        this.wdmLogger.logError("sync", error, {
                            type
                        });
                    }
                    this.observer.onError(error, type);
                }
                async importFriends(user) {
                    this.log.debug("Importing previous WDM friends for user", user.userId);
                    let friendFile;
                    try {
                        friendFile = await this.friendImporter.getRemoteFriendFile(user.userId);
                    } catch (e) {
                        this.log.log("No existing friend file found for user", user.userId);
                        return null;
                    }
                    return await this.friendImporter.importFriendFile(friendFile, false);
                }
                getFriends(user) {
                    return this.fb.getFriends(user, (loaded => {
                        this.observer.onProgress(SyncState.FETCH_FRIENDS, {
                            loaded
                        });
                    })).then((data => this.friendRepository.mapFriendsToObject(this.friendRepository.mapFriendsDataToArray(data, {
                        userId: user.userId
                    })))).then((friends => {
                        if (Object.values(friends).length < 1) {
                            throw new Error("No friends were found.");
                        }
                        return friends;
                    }));
                }
                async processFriends(userId, fetchedFriends) {
                    const now = new Date;
                    const fetchedActiveFriends = {};
                    const fetchedDeactivatedFriends = {};
                    Object.values(fetchedFriends).forEach((f => {
                        if (f.deactivated) {
                            fetchedDeactivatedFriends[f.friendId] = f;
                        } else {
                            fetchedActiveFriends[f.friendId] = f;
                        }
                    }));
                    const fetchedActiveFriendsByUrlId = {};
                    Object.values(fetchedActiveFriends).forEach((f => {
                        fetchedActiveFriendsByUrlId[f.urlId] = f;
                    }));
                    const [savedFriends, savedMissingFriends] = await Promise.all([ this.friendRepository.getActiveFriends(userId), this.friendRepository.getExistingMissingFriends(userId) ]);
                    const savedMissingFriendsByUrlId = {};
                    Object.values(savedMissingFriends).forEach((f => {
                        if (f.urlId) savedMissingFriendsByUrlId[f.urlId] = f;
                    }));
                    const friendIdsToDelete = [];
                    const returningFriends = [];
                    const newFriends = [];
                    Object.values(fetchedActiveFriends).filter((f => !savedFriends.hasOwnProperty(f.friendId) && !savedFriends.hasOwnProperty(f.urlId))).forEach((f => {
                        const existingMissing = savedMissingFriends[f.friendId] || savedMissingFriendsByUrlId[f.urlId];
                        if (existingMissing) {
                            if (existingMissing.friendId !== f.friendId) {
                                friendIdsToDelete.push(existingMissing.friendId);
                                existingMissing.friendId = f.friendId;
                            }
                            existingMissing.urlId = f.urlId;
                            existingMissing.name = f.name;
                            existingMissing.pictureUrl = f.pictureUrl;
                            existingMissing.deleted = 0;
                            existingMissing.deactivated = 0;
                            existingMissing.deletedByUser = 0;
                            existingMissing.seen = 0;
                            existingMissing.new = 1;
                            existingMissing.lastSeen = now;
                            addToFriendHistory(existingMissing, FriendStatus.NEW);
                            returningFriends.push(existingMissing);
                        } else {
                            f.new = 1;
                            f.firstSeen = now;
                            f.lastSeen = now;
                            addToFriendHistory(f, FriendStatus.NEW);
                            newFriends.push(f);
                        }
                    }));
                    await this.friendRepository.persistFriends([ ...returningFriends, ...newFriends ]);
                    const newlyDeletedFriends = Object.values(savedFriends).filter((f => {
                        if (fetchedActiveFriends.hasOwnProperty(f.friendId)) {
                            return false;
                        }
                        if (fetchedActiveFriendsByUrlId.hasOwnProperty(f.friendId)) {
                            return false;
                        }
                        return true;
                    })).map((f => {
                        f.deleted = 1;
                        f.seen = 0;
                        f.new = 0;
                        addToFriendHistory(f, FriendStatus.DELETED__UNSEEN);
                        return f;
                    }));
                    await this.friendRepository.persistFriends(newlyDeletedFriends);
                    const remainingFriends = [];
                    Object.values(savedFriends).forEach((savedFriend => {
                        const freshlyLoadedFriend = fetchedActiveFriends[savedFriend.friendId] || fetchedActiveFriendsByUrlId[savedFriend.friendId];
                        if (!freshlyLoadedFriend) {
                            return;
                        }
                        if (savedFriend.friendId !== freshlyLoadedFriend.friendId) {
                            friendIdsToDelete.push(savedFriend.friendId);
                            savedFriend.friendId = freshlyLoadedFriend.friendId;
                        }
                        savedFriend.urlId = freshlyLoadedFriend.urlId;
                        savedFriend.deleted = 0;
                        savedFriend.deletedByUser = 0;
                        savedFriend.seen = 0;
                        savedFriend.lastSeen = now;
                        savedFriend.name = freshlyLoadedFriend.name;
                        savedFriend.pictureUrl = freshlyLoadedFriend.pictureUrl;
                        remainingFriends.push(savedFriend);
                    }));
                    await this.friendRepository.persistFriends(remainingFriends);
                    for (let i = 0; i < friendIdsToDelete.length; i++) {
                        await this.friendRepository.deleteFriend(userId, friendIdsToDelete[i]);
                    }
                    return {
                        fetchedActiveFriends: Object.values(fetchedActiveFriends).length,
                        fetchedDeactivatedFriends: Object.values(fetchedDeactivatedFriends).length,
                        newlyDeletedFriends: newlyDeletedFriends.length,
                        newlyDeactivatedFriends: 0,
                        newFriends: newFriends.length,
                        returningFriends: returningFriends.length
                    };
                }
                async saveUser(userData) {
                    let user = await this.userRepository.getUser(userData.userId);
                    if (!user) {
                        user = new User(userData);
                    }
                    user.update(userData);
                    await this.userRepository.persist(user);
                    return user;
                }
                async updateUserLastSync(user, friendCounts) {
                    const now = new Date;
                    if (!user.firstSync) {
                        user.firstSync = now.getTime();
                    }
                    user.lastSync = now.getTime();
                    user.friendCounts = friendCounts;
                    await this.userRepository.persist(user);
                    return user;
                }
            }
            module.exports = Syncer;
        },
        "./src/wdm-common/Users/User.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const {populate} = __webpack_require__("./src/wdm-common/Functions/objects.js");
            const {sha256} = __webpack_require__("./src/wdm-common/Functions/hash.js");
            class User {
                constructor(data = {}) {
                    this.userId = null;
                    this.fullName = null;
                    this.shortName = null;
                    this.pictureUrl = null;
                    this.firstSync = null;
                    this.lastSync = null;
                    this.friendCounts = null;
                    this.firstMBasicFriendsPageUrl = null;
                    this.ratingPromptedAt = null;
                    populate(this, data);
                }
                isFirstSync() {
                    return !this.firstSync;
                }
                get isNew() {
                    if (this.firstSync === null) {
                        return true;
                    }
                    const oneHourMs = 1e3 * 60 * 60;
                    return this.firstSync > Date.now() - oneHourMs;
                }
                toJson() {
                    return {
                        userId: this.userId,
                        fullName: this.fullName,
                        shortName: this.shortName,
                        pictureUrl: this.pictureUrl,
                        firstSync: this.firstSync,
                        lastSync: this.lastSync,
                        isNew: this.isNew
                    };
                }
                update(newUserData) {
                    if (newUserData.fullName) {
                        this.fullName = newUserData.fullName;
                    }
                    if (newUserData.shortName) {
                        this.shortName = newUserData.shortName;
                    }
                    if (newUserData.pictureUrl) {
                        this.pictureUrl = newUserData.pictureUrl;
                    }
                    if (newUserData.firstMBasicFriendsPageUrl) {
                        this.firstMBasicFriendsPageUrl = newUserData.firstMBasicFriendsPageUrl;
                    }
                }
                async getHashedUserId() {
                    return sha256(this.userId);
                }
            }
            module.exports = User;
        },
        "./src/wdm-common/Users/UserRepository.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const User = __webpack_require__("./src/wdm-common/Users/User.js");
            const WdmError = __webpack_require__("./src/wdm-common/Errors/WdmError.js");
            const ConsoleLogger = __webpack_require__("./src/wdm-common/Logging/ConsoleLogger.js");
            class UserRepository {
                constructor(dataStore) {
                    this.dataStore = dataStore;
                    this.log = new ConsoleLogger("UserRepository");
                }
                async getUser(userId) {
                    const user = await this.dataStore.findOneWhere("users", {
                        userId
                    });
                    return user ? new User(user) : null;
                }
                async getLastSyncedUser() {
                    const user = await this.dataStore.findLatest("users", "lastSync");
                    return user ? new User(user) : null;
                }
                async getAllUsers() {
                    const rows = await this.dataStore.findAll("users", "fullName");
                    return rows.map((row => new User(row)));
                }
                async getUserForRequestOrFail(requestedUserId) {
                    if (requestedUserId) {
                        const user = await this.getUser(requestedUserId);
                        if (!user) {
                            throw new WdmError(`User ID supplied in request (${requestedUserId}) was not found.`, "NO_USER");
                        }
                        return user;
                    }
                    const user = await this.getLastSyncedUser();
                    if (!user) {
                        throw new WdmError("No user ID in request payload and no last synced user.", "NO_USER");
                    }
                    return user;
                }
                async persist(userData) {
                    const dataToStore = {
                        ...userData
                    };
                    delete dataToStore.firstMBasicFriendsPageUrl;
                    return this.dataStore.persist("users", dataToStore);
                }
                async deleteUser(userId) {
                    this.log.debug(`Deleting user ${userId}`);
                    await this.dataStore.deleteWhere("users", {
                        userId
                    });
                    this.log.debug(`Deleted user ${userId}`);
                }
            }
            module.exports = UserRepository;
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
        "./src/wdm-common/Wdm/WdmApi.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const {getSessionID, getVisitID} = __webpack_require__("./src/wdm-common/Functions/sessions.js");
            const AbstractApi = __webpack_require__("./src/wdm-common/Api/AbstractApi.js");
            class WdmApi extends AbstractApi {
                constructor(config) {
                    super("WdmApi", config.apiUrl);
                    this.config = config;
                }
                getDefaultData() {
                    return {
                        platformType: this.config.platformType,
                        appOs: this.config.appOs,
                        appVersion: this.config.appVersion,
                        appRemoteVersion: this.config.appRemoteVersion,
                        extBrowser: this.config.extBrowser,
                        extVersion: this.config.extVersion,
                        umi_sid: getSessionID(),
                        umi_vid: getVisitID()
                    };
                }
                savePushToken(userID, platform, type, token) {
                    const data = {
                        fbUserID: userID,
                        platform,
                        type,
                        token
                    };
                    return this.request("POST", "push-tokens", data);
                }
                deletePushToken(platform, token) {
                    const data = {
                        platform,
                        token
                    };
                    return this.request("DELETE", "push-tokens", data);
                }
            }
            module.exports = WdmApi;
        },
        "./src/wdm-common/Wdm/WdmLogger.js": (module, __unused_webpack_exports, __webpack_require__) => {
            const {getSessionID, getVisitID} = __webpack_require__("./src/wdm-common/Functions/sessions.js");
            const AbstractApi = __webpack_require__("./src/wdm-common/Api/AbstractApi.js");
            const SyncState = __webpack_require__("./src/wdm-common/Syncing/SyncState.js");
            class WdmLogger extends AbstractApi {
                constructor(config) {
                    super("WdmLogger", config.logsUrl);
                    this.config = config;
                    this.logDetails = [];
                    this.syncTrigger = null;
                    this.user = null;
                }
                setSync(syncId, syncTrigger) {
                    this.syncId = syncId;
                    this.syncTrigger = syncTrigger;
                }
                setUser(user) {
                    this.user = user;
                }
                reset() {
                    this.logDetails = [];
                    this.syncId = null;
                    this.syncTrigger = null;
                    this.user = null;
                }
                addDetail(type, data) {
                    this.logDetails.push({
                        type,
                        data,
                        timestamp: (new Date).getTime()
                    });
                }
                addRequest(requestedUrl, requestMethod, loadedUrl, responseCode, responseText) {
                    if (responseText && responseText.length > 1e4) {
                        responseText = responseText.substring(0, 1e4) + "... [truncated]";
                    }
                    this.addDetail("request", {
                        requestedUrl,
                        requestMethod,
                        loadedUrl,
                        responseCode,
                        responseText
                    });
                }
                getDefaultData() {
                    return {
                        ...this.config.getVersion(),
                        sessionId: getSessionID(),
                        visitId: getVisitID(),
                        syncId: this.syncId,
                        syncTrigger: this.syncTrigger,
                        fbUserId: this.user ? this.user.userId : null
                    };
                }
                logSyncEvent(syncState, data = {}) {
                    if (![ SyncState.STARTED, SyncState.COMPLETE, SyncState.FAILED ].includes(syncState)) {
                        console.log("Skipping logSyncEvent for state", syncState);
                        return;
                    }
                    this.request("POST", "logs/sync-events", {
                        ...this.getDefaultData(),
                        syncState: syncState ? syncState.toLowerCase() : null,
                        ...data
                    }).catch((e => {
                        console.warn("Logging sync failed", e);
                    }));
                }
                logError(action, error, data = {}) {
                    data["stack"] = error.stack;
                    this.request("POST", "logs/error", {
                        ...this.getDefaultData(),
                        action,
                        message: error ? error.message : null,
                        data
                    }).then((async response => {
                        if (response && response.errorId && response.logDetails) {
                            await this.sendLogDetails(response.errorId);
                        }
                    })).catch((err => {
                        console.warn("Logging error failed", err);
                    }));
                }
                async sendLogDetails(errorLogId) {
                    for (let i = 0; i < this.logDetails.length; i++) {
                        const logDetail = this.logDetails[i];
                        try {
                            await this.request("POST", "logs/error-detail", {
                                errorLogId,
                                ...logDetail
                            });
                        } catch (err) {
                            console.warn("Logging error detail failed", err);
                        }
                    }
                    this.logDetails = [];
                }
            }
            module.exports = WdmLogger;
        },
        "./node_modules/boolbase/index.js": module => {
            module.exports = {
                trueFunc: function trueFunc() {
                    return true;
                },
                falseFunc: function falseFunc() {
                    return false;
                }
            };
        },
        "./node_modules/css-select/lib/attributes.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.attributeRules = void 0;
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            var reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
            function escapeRegex(value) {
                return value.replace(reChars, "\\$&");
            }
            var caseInsensitiveAttributes = new Set([ "accept", "accept-charset", "align", "alink", "axis", "bgcolor", "charset", "checked", "clear", "codetype", "color", "compact", "declare", "defer", "dir", "direction", "disabled", "enctype", "face", "frame", "hreflang", "http-equiv", "lang", "language", "link", "media", "method", "multiple", "nohref", "noresize", "noshade", "nowrap", "readonly", "rel", "rev", "rules", "scope", "scrolling", "selected", "shape", "target", "text", "type", "valign", "valuetype", "vlink" ]);
            function shouldIgnoreCase(selector, options) {
                return typeof selector.ignoreCase === "boolean" ? selector.ignoreCase : selector.ignoreCase === "quirks" ? !!options.quirksMode : !options.xmlMode && caseInsensitiveAttributes.has(selector.name);
            }
            exports.attributeRules = {
                equals: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name;
                    var value = data.value;
                    if (shouldIgnoreCase(data, options)) {
                        value = value.toLowerCase();
                        return function(elem) {
                            var attr = adapter.getAttributeValue(elem, name);
                            return attr != null && attr.length === value.length && attr.toLowerCase() === value && next(elem);
                        };
                    }
                    return function(elem) {
                        return adapter.getAttributeValue(elem, name) === value && next(elem);
                    };
                },
                hyphen: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name;
                    var value = data.value;
                    var len = value.length;
                    if (shouldIgnoreCase(data, options)) {
                        value = value.toLowerCase();
                        return function hyphenIC(elem) {
                            var attr = adapter.getAttributeValue(elem, name);
                            return attr != null && (attr.length === len || attr.charAt(len) === "-") && attr.substr(0, len).toLowerCase() === value && next(elem);
                        };
                    }
                    return function hyphen(elem) {
                        var attr = adapter.getAttributeValue(elem, name);
                        return attr != null && (attr.length === len || attr.charAt(len) === "-") && attr.substr(0, len) === value && next(elem);
                    };
                },
                element: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name, value = data.value;
                    if (/\s/.test(value)) {
                        return boolbase_1.falseFunc;
                    }
                    var regex = new RegExp("(?:^|\\s)".concat(escapeRegex(value), "(?:$|\\s)"), shouldIgnoreCase(data, options) ? "i" : "");
                    return function element(elem) {
                        var attr = adapter.getAttributeValue(elem, name);
                        return attr != null && attr.length >= value.length && regex.test(attr) && next(elem);
                    };
                },
                exists: function(next, _a, _b) {
                    var name = _a.name;
                    var adapter = _b.adapter;
                    return function(elem) {
                        return adapter.hasAttrib(elem, name) && next(elem);
                    };
                },
                start: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name;
                    var value = data.value;
                    var len = value.length;
                    if (len === 0) {
                        return boolbase_1.falseFunc;
                    }
                    if (shouldIgnoreCase(data, options)) {
                        value = value.toLowerCase();
                        return function(elem) {
                            var attr = adapter.getAttributeValue(elem, name);
                            return attr != null && attr.length >= len && attr.substr(0, len).toLowerCase() === value && next(elem);
                        };
                    }
                    return function(elem) {
                        var _a;
                        return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.startsWith(value)) && next(elem);
                    };
                },
                end: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name;
                    var value = data.value;
                    var len = -value.length;
                    if (len === 0) {
                        return boolbase_1.falseFunc;
                    }
                    if (shouldIgnoreCase(data, options)) {
                        value = value.toLowerCase();
                        return function(elem) {
                            var _a;
                            return ((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.substr(len).toLowerCase()) === value && next(elem);
                        };
                    }
                    return function(elem) {
                        var _a;
                        return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.endsWith(value)) && next(elem);
                    };
                },
                any: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name, value = data.value;
                    if (value === "") {
                        return boolbase_1.falseFunc;
                    }
                    if (shouldIgnoreCase(data, options)) {
                        var regex_1 = new RegExp(escapeRegex(value), "i");
                        return function anyIC(elem) {
                            var attr = adapter.getAttributeValue(elem, name);
                            return attr != null && attr.length >= value.length && regex_1.test(attr) && next(elem);
                        };
                    }
                    return function(elem) {
                        var _a;
                        return !!((_a = adapter.getAttributeValue(elem, name)) === null || _a === void 0 ? void 0 : _a.includes(value)) && next(elem);
                    };
                },
                not: function(next, data, options) {
                    var adapter = options.adapter;
                    var name = data.name;
                    var value = data.value;
                    if (value === "") {
                        return function(elem) {
                            return !!adapter.getAttributeValue(elem, name) && next(elem);
                        };
                    } else if (shouldIgnoreCase(data, options)) {
                        value = value.toLowerCase();
                        return function(elem) {
                            var attr = adapter.getAttributeValue(elem, name);
                            return (attr == null || attr.length !== value.length || attr.toLowerCase() !== value) && next(elem);
                        };
                    }
                    return function(elem) {
                        return adapter.getAttributeValue(elem, name) !== value && next(elem);
                    };
                }
            };
        },
        "./node_modules/css-select/lib/compile.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.compileToken = exports.compileUnsafe = exports.compile = void 0;
            var css_what_1 = __webpack_require__("./node_modules/css-what/lib/es/index.js");
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            var sort_1 = __importDefault(__webpack_require__("./node_modules/css-select/lib/sort.js"));
            var procedure_1 = __webpack_require__("./node_modules/css-select/lib/procedure.js");
            var general_1 = __webpack_require__("./node_modules/css-select/lib/general.js");
            var subselects_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/subselects.js");
            function compile(selector, options, context) {
                var next = compileUnsafe(selector, options, context);
                return (0, subselects_1.ensureIsTag)(next, options.adapter);
            }
            exports.compile = compile;
            function compileUnsafe(selector, options, context) {
                var token = typeof selector === "string" ? (0, css_what_1.parse)(selector) : selector;
                return compileToken(token, options, context);
            }
            exports.compileUnsafe = compileUnsafe;
            function includesScopePseudo(t) {
                return t.type === "pseudo" && (t.name === "scope" || Array.isArray(t.data) && t.data.some((function(data) {
                    return data.some(includesScopePseudo);
                })));
            }
            var DESCENDANT_TOKEN = {
                type: css_what_1.SelectorType.Descendant
            };
            var FLEXIBLE_DESCENDANT_TOKEN = {
                type: "_flexibleDescendant"
            };
            var SCOPE_TOKEN = {
                type: css_what_1.SelectorType.Pseudo,
                name: "scope",
                data: null
            };
            function absolutize(token, _a, context) {
                var adapter = _a.adapter;
                var hasContext = !!(context === null || context === void 0 ? void 0 : context.every((function(e) {
                    var parent = adapter.isTag(e) && adapter.getParent(e);
                    return e === subselects_1.PLACEHOLDER_ELEMENT || parent && adapter.isTag(parent);
                })));
                for (var _i = 0, token_1 = token; _i < token_1.length; _i++) {
                    var t = token_1[_i];
                    if (t.length > 0 && (0, procedure_1.isTraversal)(t[0]) && t[0].type !== "descendant") {} else if (hasContext && !t.some(includesScopePseudo)) {
                        t.unshift(DESCENDANT_TOKEN);
                    } else {
                        continue;
                    }
                    t.unshift(SCOPE_TOKEN);
                }
            }
            function compileToken(token, options, context) {
                var _a;
                token = token.filter((function(t) {
                    return t.length > 0;
                }));
                token.forEach(sort_1.default);
                context = (_a = options.context) !== null && _a !== void 0 ? _a : context;
                var isArrayContext = Array.isArray(context);
                var finalContext = context && (Array.isArray(context) ? context : [ context ]);
                absolutize(token, options, finalContext);
                var shouldTestNextSiblings = false;
                var query = token.map((function(rules) {
                    if (rules.length >= 2) {
                        var first = rules[0], second = rules[1];
                        if (first.type !== "pseudo" || first.name !== "scope") {} else if (isArrayContext && second.type === "descendant") {
                            rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
                        } else if (second.type === "adjacent" || second.type === "sibling") {
                            shouldTestNextSiblings = true;
                        }
                    }
                    return compileRules(rules, options, finalContext);
                })).reduce(reduceRules, boolbase_1.falseFunc);
                query.shouldTestNextSiblings = shouldTestNextSiblings;
                return query;
            }
            exports.compileToken = compileToken;
            function compileRules(rules, options, context) {
                var _a;
                return rules.reduce((function(previous, rule) {
                    return previous === boolbase_1.falseFunc ? boolbase_1.falseFunc : (0, general_1.compileGeneralSelector)(previous, rule, options, context, compileToken);
                }), (_a = options.rootFunc) !== null && _a !== void 0 ? _a : boolbase_1.trueFunc);
            }
            function reduceRules(a, b) {
                if (b === boolbase_1.falseFunc || a === boolbase_1.trueFunc) {
                    return a;
                }
                if (a === boolbase_1.falseFunc || b === boolbase_1.trueFunc) {
                    return b;
                }
                return function combine(elem) {
                    return a(elem) || b(elem);
                };
            }
        },
        "./node_modules/css-select/lib/general.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.compileGeneralSelector = void 0;
            var attributes_1 = __webpack_require__("./node_modules/css-select/lib/attributes.js");
            var pseudo_selectors_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/index.js");
            var css_what_1 = __webpack_require__("./node_modules/css-what/lib/es/index.js");
            function compileGeneralSelector(next, selector, options, context, compileToken) {
                var adapter = options.adapter, equals = options.equals;
                switch (selector.type) {
                  case css_what_1.SelectorType.PseudoElement:
                    {
                        throw new Error("Pseudo-elements are not supported by css-select");
                    }

                  case css_what_1.SelectorType.ColumnCombinator:
                    {
                        throw new Error("Column combinators are not yet supported by css-select");
                    }

                  case css_what_1.SelectorType.Attribute:
                    {
                        if (selector.namespace != null) {
                            throw new Error("Namespaced attributes are not yet supported by css-select");
                        }
                        if (!options.xmlMode || options.lowerCaseAttributeNames) {
                            selector.name = selector.name.toLowerCase();
                        }
                        return attributes_1.attributeRules[selector.action](next, selector, options);
                    }

                  case css_what_1.SelectorType.Pseudo:
                    {
                        return (0, pseudo_selectors_1.compilePseudoSelector)(next, selector, options, context, compileToken);
                    }

                  case css_what_1.SelectorType.Tag:
                    {
                        if (selector.namespace != null) {
                            throw new Error("Namespaced tag names are not yet supported by css-select");
                        }
                        var name_1 = selector.name;
                        if (!options.xmlMode || options.lowerCaseTags) {
                            name_1 = name_1.toLowerCase();
                        }
                        return function tag(elem) {
                            return adapter.getName(elem) === name_1 && next(elem);
                        };
                    }

                  case css_what_1.SelectorType.Descendant:
                    {
                        if (options.cacheResults === false || typeof WeakSet === "undefined") {
                            return function descendant(elem) {
                                var current = elem;
                                while (current = adapter.getParent(current)) {
                                    if (adapter.isTag(current) && next(current)) {
                                        return true;
                                    }
                                }
                                return false;
                            };
                        }
                        var isFalseCache_1 = new WeakSet;
                        return function cachedDescendant(elem) {
                            var current = elem;
                            while (current = adapter.getParent(current)) {
                                if (!isFalseCache_1.has(current)) {
                                    if (adapter.isTag(current) && next(current)) {
                                        return true;
                                    }
                                    isFalseCache_1.add(current);
                                }
                            }
                            return false;
                        };
                    }

                  case "_flexibleDescendant":
                    {
                        return function flexibleDescendant(elem) {
                            var current = elem;
                            do {
                                if (adapter.isTag(current) && next(current)) return true;
                            } while (current = adapter.getParent(current));
                            return false;
                        };
                    }

                  case css_what_1.SelectorType.Parent:
                    {
                        return function parent(elem) {
                            return adapter.getChildren(elem).some((function(elem) {
                                return adapter.isTag(elem) && next(elem);
                            }));
                        };
                    }

                  case css_what_1.SelectorType.Child:
                    {
                        return function child(elem) {
                            var parent = adapter.getParent(elem);
                            return parent != null && adapter.isTag(parent) && next(parent);
                        };
                    }

                  case css_what_1.SelectorType.Sibling:
                    {
                        return function sibling(elem) {
                            var siblings = adapter.getSiblings(elem);
                            for (var i = 0; i < siblings.length; i++) {
                                var currentSibling = siblings[i];
                                if (equals(elem, currentSibling)) break;
                                if (adapter.isTag(currentSibling) && next(currentSibling)) {
                                    return true;
                                }
                            }
                            return false;
                        };
                    }

                  case css_what_1.SelectorType.Adjacent:
                    {
                        if (adapter.prevElementSibling) {
                            return function adjacent(elem) {
                                var previous = adapter.prevElementSibling(elem);
                                return previous != null && next(previous);
                            };
                        }
                        return function adjacent(elem) {
                            var siblings = adapter.getSiblings(elem);
                            var lastElement;
                            for (var i = 0; i < siblings.length; i++) {
                                var currentSibling = siblings[i];
                                if (equals(elem, currentSibling)) break;
                                if (adapter.isTag(currentSibling)) {
                                    lastElement = currentSibling;
                                }
                            }
                            return !!lastElement && next(lastElement);
                        };
                    }

                  case css_what_1.SelectorType.Universal:
                    {
                        if (selector.namespace != null && selector.namespace !== "*") {
                            throw new Error("Namespaced universal selectors are not yet supported by css-select");
                        }
                        return next;
                    }
                }
            }
            exports.compileGeneralSelector = compileGeneralSelector;
        },
        "./node_modules/css-select/lib/index.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                var desc = Object.getOwnPropertyDescriptor(m, k);
                if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                    desc = {
                        enumerable: true,
                        get: function() {
                            return m[k];
                        }
                    };
                }
                Object.defineProperty(o, k2, desc);
            } : function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                o[k2] = m[k];
            });
            var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
                Object.defineProperty(o, "default", {
                    enumerable: true,
                    value: v
                });
            } : function(o, v) {
                o["default"] = v;
            });
            var __importStar = this && this.__importStar || function(mod) {
                if (mod && mod.__esModule) return mod;
                var result = {};
                if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
                __setModuleDefault(result, mod);
                return result;
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.aliases = exports.pseudos = exports.filters = exports.is = exports.selectOne = exports.selectAll = exports.prepareContext = exports._compileToken = exports._compileUnsafe = exports.compile = void 0;
            var DomUtils = __importStar(__webpack_require__("./node_modules/domutils/lib/index.js"));
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            var compile_1 = __webpack_require__("./node_modules/css-select/lib/compile.js");
            var subselects_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/subselects.js");
            var defaultEquals = function(a, b) {
                return a === b;
            };
            var defaultOptions = {
                adapter: DomUtils,
                equals: defaultEquals
            };
            function convertOptionFormats(options) {
                var _a, _b, _c, _d;
                var opts = options !== null && options !== void 0 ? options : defaultOptions;
                (_a = opts.adapter) !== null && _a !== void 0 ? _a : opts.adapter = DomUtils;
                (_b = opts.equals) !== null && _b !== void 0 ? _b : opts.equals = (_d = (_c = opts.adapter) === null || _c === void 0 ? void 0 : _c.equals) !== null && _d !== void 0 ? _d : defaultEquals;
                return opts;
            }
            function wrapCompile(func) {
                return function addAdapter(selector, options, context) {
                    var opts = convertOptionFormats(options);
                    return func(selector, opts, context);
                };
            }
            exports.compile = wrapCompile(compile_1.compile);
            exports._compileUnsafe = wrapCompile(compile_1.compileUnsafe);
            exports._compileToken = wrapCompile(compile_1.compileToken);
            function getSelectorFunc(searchFunc) {
                return function select(query, elements, options) {
                    var opts = convertOptionFormats(options);
                    if (typeof query !== "function") {
                        query = (0, compile_1.compileUnsafe)(query, opts, elements);
                    }
                    var filteredElements = prepareContext(elements, opts.adapter, query.shouldTestNextSiblings);
                    return searchFunc(query, filteredElements, opts);
                };
            }
            function prepareContext(elems, adapter, shouldTestNextSiblings) {
                if (shouldTestNextSiblings === void 0) {
                    shouldTestNextSiblings = false;
                }
                if (shouldTestNextSiblings) {
                    elems = appendNextSiblings(elems, adapter);
                }
                return Array.isArray(elems) ? adapter.removeSubsets(elems) : adapter.getChildren(elems);
            }
            exports.prepareContext = prepareContext;
            function appendNextSiblings(elem, adapter) {
                var elems = Array.isArray(elem) ? elem.slice(0) : [ elem ];
                var elemsLength = elems.length;
                for (var i = 0; i < elemsLength; i++) {
                    var nextSiblings = (0, subselects_1.getNextSiblings)(elems[i], adapter);
                    elems.push.apply(elems, nextSiblings);
                }
                return elems;
            }
            exports.selectAll = getSelectorFunc((function(query, elems, options) {
                return query === boolbase_1.falseFunc || !elems || elems.length === 0 ? [] : options.adapter.findAll(query, elems);
            }));
            exports.selectOne = getSelectorFunc((function(query, elems, options) {
                return query === boolbase_1.falseFunc || !elems || elems.length === 0 ? null : options.adapter.findOne(query, elems);
            }));
            function is(elem, query, options) {
                var opts = convertOptionFormats(options);
                return (typeof query === "function" ? query : (0, compile_1.compile)(query, opts))(elem);
            }
            exports.is = is;
            exports["default"] = exports.selectAll;
            var pseudo_selectors_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/index.js");
            Object.defineProperty(exports, "filters", {
                enumerable: true,
                get: function() {
                    return pseudo_selectors_1.filters;
                }
            });
            Object.defineProperty(exports, "pseudos", {
                enumerable: true,
                get: function() {
                    return pseudo_selectors_1.pseudos;
                }
            });
            Object.defineProperty(exports, "aliases", {
                enumerable: true,
                get: function() {
                    return pseudo_selectors_1.aliases;
                }
            });
        },
        "./node_modules/css-select/lib/procedure.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.isTraversal = exports.procedure = void 0;
            exports.procedure = {
                universal: 50,
                tag: 30,
                attribute: 1,
                pseudo: 0,
                "pseudo-element": 0,
                "column-combinator": -1,
                descendant: -1,
                child: -1,
                parent: -1,
                sibling: -1,
                adjacent: -1,
                _flexibleDescendant: -1
            };
            function isTraversal(t) {
                return exports.procedure[t.type] < 0;
            }
            exports.isTraversal = isTraversal;
        },
        "./node_modules/css-select/lib/pseudo-selectors/aliases.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.aliases = void 0;
            exports.aliases = {
                "any-link": ":is(a, area, link)[href]",
                link: ":any-link:not(:visited)",
                disabled: ":is(\n        :is(button, input, select, textarea, optgroup, option)[disabled],\n        optgroup[disabled] > option,\n        fieldset[disabled]:not(fieldset[disabled] legend:first-of-type *)\n    )",
                enabled: ":not(:disabled)",
                checked: ":is(:is(input[type=radio], input[type=checkbox])[checked], option:selected)",
                required: ":is(input, select, textarea)[required]",
                optional: ":is(input, select, textarea):not([required])",
                selected: "option:is([selected], select:not([multiple]):not(:has(> option[selected])) > :first-of-type)",
                checkbox: "[type=checkbox]",
                file: "[type=file]",
                password: "[type=password]",
                radio: "[type=radio]",
                reset: "[type=reset]",
                image: "[type=image]",
                submit: "[type=submit]",
                parent: ":not(:empty)",
                header: ":is(h1, h2, h3, h4, h5, h6)",
                button: ":is(button, input[type=button])",
                input: ":is(input, textarea, select, button)",
                text: "input:is(:not([type!='']), [type=text])"
            };
        },
        "./node_modules/css-select/lib/pseudo-selectors/filters.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.filters = void 0;
            var nth_check_1 = __importDefault(__webpack_require__("./node_modules/nth-check/lib/index.js"));
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            function getChildFunc(next, adapter) {
                return function(elem) {
                    var parent = adapter.getParent(elem);
                    return parent != null && adapter.isTag(parent) && next(elem);
                };
            }
            exports.filters = {
                contains: function(next, text, _a) {
                    var adapter = _a.adapter;
                    return function contains(elem) {
                        return next(elem) && adapter.getText(elem).includes(text);
                    };
                },
                icontains: function(next, text, _a) {
                    var adapter = _a.adapter;
                    var itext = text.toLowerCase();
                    return function icontains(elem) {
                        return next(elem) && adapter.getText(elem).toLowerCase().includes(itext);
                    };
                },
                "nth-child": function(next, rule, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var func = (0, nth_check_1.default)(rule);
                    if (func === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                    if (func === boolbase_1.trueFunc) return getChildFunc(next, adapter);
                    return function nthChild(elem) {
                        var siblings = adapter.getSiblings(elem);
                        var pos = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            if (equals(elem, siblings[i])) break;
                            if (adapter.isTag(siblings[i])) {
                                pos++;
                            }
                        }
                        return func(pos) && next(elem);
                    };
                },
                "nth-last-child": function(next, rule, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var func = (0, nth_check_1.default)(rule);
                    if (func === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                    if (func === boolbase_1.trueFunc) return getChildFunc(next, adapter);
                    return function nthLastChild(elem) {
                        var siblings = adapter.getSiblings(elem);
                        var pos = 0;
                        for (var i = siblings.length - 1; i >= 0; i--) {
                            if (equals(elem, siblings[i])) break;
                            if (adapter.isTag(siblings[i])) {
                                pos++;
                            }
                        }
                        return func(pos) && next(elem);
                    };
                },
                "nth-of-type": function(next, rule, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var func = (0, nth_check_1.default)(rule);
                    if (func === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                    if (func === boolbase_1.trueFunc) return getChildFunc(next, adapter);
                    return function nthOfType(elem) {
                        var siblings = adapter.getSiblings(elem);
                        var pos = 0;
                        for (var i = 0; i < siblings.length; i++) {
                            var currentSibling = siblings[i];
                            if (equals(elem, currentSibling)) break;
                            if (adapter.isTag(currentSibling) && adapter.getName(currentSibling) === adapter.getName(elem)) {
                                pos++;
                            }
                        }
                        return func(pos) && next(elem);
                    };
                },
                "nth-last-of-type": function(next, rule, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var func = (0, nth_check_1.default)(rule);
                    if (func === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                    if (func === boolbase_1.trueFunc) return getChildFunc(next, adapter);
                    return function nthLastOfType(elem) {
                        var siblings = adapter.getSiblings(elem);
                        var pos = 0;
                        for (var i = siblings.length - 1; i >= 0; i--) {
                            var currentSibling = siblings[i];
                            if (equals(elem, currentSibling)) break;
                            if (adapter.isTag(currentSibling) && adapter.getName(currentSibling) === adapter.getName(elem)) {
                                pos++;
                            }
                        }
                        return func(pos) && next(elem);
                    };
                },
                root: function(next, _rule, _a) {
                    var adapter = _a.adapter;
                    return function(elem) {
                        var parent = adapter.getParent(elem);
                        return (parent == null || !adapter.isTag(parent)) && next(elem);
                    };
                },
                scope: function(next, rule, options, context) {
                    var equals = options.equals;
                    if (!context || context.length === 0) {
                        return exports.filters.root(next, rule, options);
                    }
                    if (context.length === 1) {
                        return function(elem) {
                            return equals(context[0], elem) && next(elem);
                        };
                    }
                    return function(elem) {
                        return context.includes(elem) && next(elem);
                    };
                },
                hover: dynamicStatePseudo("isHovered"),
                visited: dynamicStatePseudo("isVisited"),
                active: dynamicStatePseudo("isActive")
            };
            function dynamicStatePseudo(name) {
                return function dynamicPseudo(next, _rule, _a) {
                    var adapter = _a.adapter;
                    var func = adapter[name];
                    if (typeof func !== "function") {
                        return boolbase_1.falseFunc;
                    }
                    return function active(elem) {
                        return func(elem) && next(elem);
                    };
                };
            }
        },
        "./node_modules/css-select/lib/pseudo-selectors/index.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.compilePseudoSelector = exports.aliases = exports.pseudos = exports.filters = void 0;
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            var css_what_1 = __webpack_require__("./node_modules/css-what/lib/es/index.js");
            var filters_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/filters.js");
            Object.defineProperty(exports, "filters", {
                enumerable: true,
                get: function() {
                    return filters_1.filters;
                }
            });
            var pseudos_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/pseudos.js");
            Object.defineProperty(exports, "pseudos", {
                enumerable: true,
                get: function() {
                    return pseudos_1.pseudos;
                }
            });
            var aliases_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/aliases.js");
            Object.defineProperty(exports, "aliases", {
                enumerable: true,
                get: function() {
                    return aliases_1.aliases;
                }
            });
            var subselects_1 = __webpack_require__("./node_modules/css-select/lib/pseudo-selectors/subselects.js");
            function compilePseudoSelector(next, selector, options, context, compileToken) {
                var name = selector.name, data = selector.data;
                if (Array.isArray(data)) {
                    return subselects_1.subselects[name](next, data, options, context, compileToken);
                }
                if (name in aliases_1.aliases) {
                    if (data != null) {
                        throw new Error("Pseudo ".concat(name, " doesn't have any arguments"));
                    }
                    var alias = (0, css_what_1.parse)(aliases_1.aliases[name]);
                    return subselects_1.subselects.is(next, alias, options, context, compileToken);
                }
                if (name in filters_1.filters) {
                    return filters_1.filters[name](next, data, options, context);
                }
                if (name in pseudos_1.pseudos) {
                    var pseudo_1 = pseudos_1.pseudos[name];
                    (0, pseudos_1.verifyPseudoArgs)(pseudo_1, name, data);
                    return pseudo_1 === boolbase_1.falseFunc ? boolbase_1.falseFunc : next === boolbase_1.trueFunc ? function(elem) {
                        return pseudo_1(elem, options, data);
                    } : function(elem) {
                        return pseudo_1(elem, options, data) && next(elem);
                    };
                }
                throw new Error("unmatched pseudo-class :".concat(name));
            }
            exports.compilePseudoSelector = compilePseudoSelector;
        },
        "./node_modules/css-select/lib/pseudo-selectors/pseudos.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.verifyPseudoArgs = exports.pseudos = void 0;
            exports.pseudos = {
                empty: function(elem, _a) {
                    var adapter = _a.adapter;
                    return !adapter.getChildren(elem).some((function(elem) {
                        return adapter.isTag(elem) || adapter.getText(elem) !== "";
                    }));
                },
                "first-child": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var firstChild = adapter.getSiblings(elem).find((function(elem) {
                        return adapter.isTag(elem);
                    }));
                    return firstChild != null && equals(elem, firstChild);
                },
                "last-child": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var siblings = adapter.getSiblings(elem);
                    for (var i = siblings.length - 1; i >= 0; i--) {
                        if (equals(elem, siblings[i])) return true;
                        if (adapter.isTag(siblings[i])) break;
                    }
                    return false;
                },
                "first-of-type": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var siblings = adapter.getSiblings(elem);
                    var elemName = adapter.getName(elem);
                    for (var i = 0; i < siblings.length; i++) {
                        var currentSibling = siblings[i];
                        if (equals(elem, currentSibling)) return true;
                        if (adapter.isTag(currentSibling) && adapter.getName(currentSibling) === elemName) {
                            break;
                        }
                    }
                    return false;
                },
                "last-of-type": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var siblings = adapter.getSiblings(elem);
                    var elemName = adapter.getName(elem);
                    for (var i = siblings.length - 1; i >= 0; i--) {
                        var currentSibling = siblings[i];
                        if (equals(elem, currentSibling)) return true;
                        if (adapter.isTag(currentSibling) && adapter.getName(currentSibling) === elemName) {
                            break;
                        }
                    }
                    return false;
                },
                "only-of-type": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    var elemName = adapter.getName(elem);
                    return adapter.getSiblings(elem).every((function(sibling) {
                        return equals(elem, sibling) || !adapter.isTag(sibling) || adapter.getName(sibling) !== elemName;
                    }));
                },
                "only-child": function(elem, _a) {
                    var adapter = _a.adapter, equals = _a.equals;
                    return adapter.getSiblings(elem).every((function(sibling) {
                        return equals(elem, sibling) || !adapter.isTag(sibling);
                    }));
                }
            };
            function verifyPseudoArgs(func, name, subselect) {
                if (subselect === null) {
                    if (func.length > 2) {
                        throw new Error("pseudo-selector :".concat(name, " requires an argument"));
                    }
                } else if (func.length === 2) {
                    throw new Error("pseudo-selector :".concat(name, " doesn't have any arguments"));
                }
            }
            exports.verifyPseudoArgs = verifyPseudoArgs;
        },
        "./node_modules/css-select/lib/pseudo-selectors/subselects.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __spreadArray = this && this.__spreadArray || function(to, from, pack) {
                if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
                    if (ar || !(i in from)) {
                        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                        ar[i] = from[i];
                    }
                }
                return to.concat(ar || Array.prototype.slice.call(from));
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.subselects = exports.getNextSiblings = exports.ensureIsTag = exports.PLACEHOLDER_ELEMENT = void 0;
            var boolbase_1 = __webpack_require__("./node_modules/boolbase/index.js");
            var procedure_1 = __webpack_require__("./node_modules/css-select/lib/procedure.js");
            exports.PLACEHOLDER_ELEMENT = {};
            function ensureIsTag(next, adapter) {
                if (next === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                return function(elem) {
                    return adapter.isTag(elem) && next(elem);
                };
            }
            exports.ensureIsTag = ensureIsTag;
            function getNextSiblings(elem, adapter) {
                var siblings = adapter.getSiblings(elem);
                if (siblings.length <= 1) return [];
                var elemIndex = siblings.indexOf(elem);
                if (elemIndex < 0 || elemIndex === siblings.length - 1) return [];
                return siblings.slice(elemIndex + 1).filter(adapter.isTag);
            }
            exports.getNextSiblings = getNextSiblings;
            var is = function(next, token, options, context, compileToken) {
                var opts = {
                    xmlMode: !!options.xmlMode,
                    adapter: options.adapter,
                    equals: options.equals
                };
                var func = compileToken(token, opts, context);
                return function(elem) {
                    return func(elem) && next(elem);
                };
            };
            exports.subselects = {
                is,
                matches: is,
                where: is,
                not: function(next, token, options, context, compileToken) {
                    var opts = {
                        xmlMode: !!options.xmlMode,
                        adapter: options.adapter,
                        equals: options.equals
                    };
                    var func = compileToken(token, opts, context);
                    if (func === boolbase_1.falseFunc) return next;
                    if (func === boolbase_1.trueFunc) return boolbase_1.falseFunc;
                    return function not(elem) {
                        return !func(elem) && next(elem);
                    };
                },
                has: function(next, subselect, options, _context, compileToken) {
                    var adapter = options.adapter;
                    var opts = {
                        xmlMode: !!options.xmlMode,
                        adapter,
                        equals: options.equals
                    };
                    var context = subselect.some((function(s) {
                        return s.some(procedure_1.isTraversal);
                    })) ? [ exports.PLACEHOLDER_ELEMENT ] : undefined;
                    var compiled = compileToken(subselect, opts, context);
                    if (compiled === boolbase_1.falseFunc) return boolbase_1.falseFunc;
                    if (compiled === boolbase_1.trueFunc) {
                        return function(elem) {
                            return adapter.getChildren(elem).some(adapter.isTag) && next(elem);
                        };
                    }
                    var hasElement = ensureIsTag(compiled, adapter);
                    var _a = compiled.shouldTestNextSiblings, shouldTestNextSiblings = _a === void 0 ? false : _a;
                    if (context) {
                        return function(elem) {
                            context[0] = elem;
                            var childs = adapter.getChildren(elem);
                            var nextElements = shouldTestNextSiblings ? __spreadArray(__spreadArray([], childs, true), getNextSiblings(elem, adapter), true) : childs;
                            return next(elem) && adapter.existsOne(hasElement, nextElements);
                        };
                    }
                    return function(elem) {
                        return next(elem) && adapter.existsOne(hasElement, adapter.getChildren(elem));
                    };
                }
            };
        },
        "./node_modules/css-select/lib/sort.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var css_what_1 = __webpack_require__("./node_modules/css-what/lib/es/index.js");
            var procedure_1 = __webpack_require__("./node_modules/css-select/lib/procedure.js");
            var attributes = {
                exists: 10,
                equals: 8,
                not: 7,
                start: 6,
                end: 6,
                any: 5,
                hyphen: 4,
                element: 4
            };
            function sortByProcedure(arr) {
                var procs = arr.map(getProcedure);
                for (var i = 1; i < arr.length; i++) {
                    var procNew = procs[i];
                    if (procNew < 0) continue;
                    for (var j = i - 1; j >= 0 && procNew < procs[j]; j--) {
                        var token = arr[j + 1];
                        arr[j + 1] = arr[j];
                        arr[j] = token;
                        procs[j + 1] = procs[j];
                        procs[j] = procNew;
                    }
                }
            }
            exports["default"] = sortByProcedure;
            function getProcedure(token) {
                var proc = procedure_1.procedure[token.type];
                if (token.type === css_what_1.SelectorType.Attribute) {
                    proc = attributes[token.action];
                    if (proc === attributes.equals && token.name === "id") {
                        proc = 9;
                    }
                    if (token.ignoreCase) {
                        proc >>= 1;
                    }
                } else if (token.type === css_what_1.SelectorType.Pseudo) {
                    if (!token.data) {
                        proc = 3;
                    } else if (token.name === "has" || token.name === "contains") {
                        proc = 0;
                    } else if (Array.isArray(token.data)) {
                        proc = 0;
                        for (var i = 0; i < token.data.length; i++) {
                            if (token.data[i].length !== 1) continue;
                            var cur = getProcedure(token.data[i][0]);
                            if (cur === 0) {
                                proc = 0;
                                break;
                            }
                            if (cur > proc) proc = cur;
                        }
                        if (token.data.length > 1 && proc > 0) proc -= 1;
                    } else {
                        proc = 1;
                    }
                }
                return proc;
            }
        },
        "./node_modules/css-what/lib/es/index.js": (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                AttributeAction: () => _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction,
                IgnoreCaseMode: () => _types__WEBPACK_IMPORTED_MODULE_0__.IgnoreCaseMode,
                SelectorType: () => _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType,
                isTraversal: () => _parse__WEBPACK_IMPORTED_MODULE_1__.isTraversal,
                parse: () => _parse__WEBPACK_IMPORTED_MODULE_1__.parse,
                stringify: () => _stringify__WEBPACK_IMPORTED_MODULE_2__.stringify
            });
            var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/css-what/lib/es/types.js");
            var _parse__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./node_modules/css-what/lib/es/parse.js");
            var _stringify__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("./node_modules/css-what/lib/es/stringify.js");
        },
        "./node_modules/css-what/lib/es/parse.js": (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                isTraversal: () => isTraversal,
                parse: () => parse
            });
            var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/css-what/lib/es/types.js");
            const reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
            const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
            const actionTypes = new Map([ [ 126, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Element ], [ 94, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Start ], [ 36, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.End ], [ 42, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Any ], [ 33, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Not ], [ 124, _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Hyphen ] ]);
            const unpackPseudos = new Set([ "has", "not", "matches", "is", "where", "host", "host-context" ]);
            function isTraversal(selector) {
                switch (selector.type) {
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Adjacent:
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Child:
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant:
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Parent:
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Sibling:
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.ColumnCombinator:
                    return true;

                  default:
                    return false;
                }
            }
            const stripQuotesFromPseudos = new Set([ "contains", "icontains" ]);
            function funescape(_, escaped, escapedWhitespace) {
                const high = parseInt(escaped, 16) - 65536;
                return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 65536) : String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320);
            }
            function unescapeCSS(str) {
                return str.replace(reEscape, funescape);
            }
            function isQuote(c) {
                return c === 39 || c === 34;
            }
            function isWhitespace(c) {
                return c === 32 || c === 9 || c === 10 || c === 12 || c === 13;
            }
            function parse(selector) {
                const subselects = [];
                const endIndex = parseSelector(subselects, `${selector}`, 0);
                if (endIndex < selector.length) {
                    throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
                }
                return subselects;
            }
            function parseSelector(subselects, selector, selectorIndex) {
                let tokens = [];
                function getName(offset) {
                    const match = selector.slice(selectorIndex + offset).match(reName);
                    if (!match) {
                        throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
                    }
                    const [name] = match;
                    selectorIndex += offset + name.length;
                    return unescapeCSS(name);
                }
                function stripWhitespace(offset) {
                    selectorIndex += offset;
                    while (selectorIndex < selector.length && isWhitespace(selector.charCodeAt(selectorIndex))) {
                        selectorIndex++;
                    }
                }
                function readValueWithParenthesis() {
                    selectorIndex += 1;
                    const start = selectorIndex;
                    let counter = 1;
                    for (;counter > 0 && selectorIndex < selector.length; selectorIndex++) {
                        if (selector.charCodeAt(selectorIndex) === 40 && !isEscaped(selectorIndex)) {
                            counter++;
                        } else if (selector.charCodeAt(selectorIndex) === 41 && !isEscaped(selectorIndex)) {
                            counter--;
                        }
                    }
                    if (counter) {
                        throw new Error("Parenthesis not matched");
                    }
                    return unescapeCSS(selector.slice(start, selectorIndex - 1));
                }
                function isEscaped(pos) {
                    let slashCount = 0;
                    while (selector.charCodeAt(--pos) === 92) slashCount++;
                    return (slashCount & 1) === 1;
                }
                function ensureNotTraversal() {
                    if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
                        throw new Error("Did not expect successive traversals.");
                    }
                }
                function addTraversal(type) {
                    if (tokens.length > 0 && tokens[tokens.length - 1].type === _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant) {
                        tokens[tokens.length - 1].type = type;
                        return;
                    }
                    ensureNotTraversal();
                    tokens.push({
                        type
                    });
                }
                function addSpecialAttribute(name, action) {
                    tokens.push({
                        type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Attribute,
                        name,
                        action,
                        value: getName(1),
                        namespace: null,
                        ignoreCase: "quirks"
                    });
                }
                function finalizeSubselector() {
                    if (tokens.length && tokens[tokens.length - 1].type === _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant) {
                        tokens.pop();
                    }
                    if (tokens.length === 0) {
                        throw new Error("Empty sub-selector");
                    }
                    subselects.push(tokens);
                }
                stripWhitespace(0);
                if (selector.length === selectorIndex) {
                    return selectorIndex;
                }
                loop: while (selectorIndex < selector.length) {
                    const firstChar = selector.charCodeAt(selectorIndex);
                    switch (firstChar) {
                      case 32:
                      case 9:
                      case 10:
                      case 12:
                      case 13:
                        {
                            if (tokens.length === 0 || tokens[0].type !== _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant) {
                                ensureNotTraversal();
                                tokens.push({
                                    type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant
                                });
                            }
                            stripWhitespace(1);
                            break;
                        }

                      case 62:
                        {
                            addTraversal(_types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Child);
                            stripWhitespace(1);
                            break;
                        }

                      case 60:
                        {
                            addTraversal(_types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Parent);
                            stripWhitespace(1);
                            break;
                        }

                      case 126:
                        {
                            addTraversal(_types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Sibling);
                            stripWhitespace(1);
                            break;
                        }

                      case 43:
                        {
                            addTraversal(_types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Adjacent);
                            stripWhitespace(1);
                            break;
                        }

                      case 46:
                        {
                            addSpecialAttribute("class", _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Element);
                            break;
                        }

                      case 35:
                        {
                            addSpecialAttribute("id", _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Equals);
                            break;
                        }

                      case 91:
                        {
                            stripWhitespace(1);
                            let name;
                            let namespace = null;
                            if (selector.charCodeAt(selectorIndex) === 124) {
                                name = getName(1);
                            } else if (selector.startsWith("*|", selectorIndex)) {
                                namespace = "*";
                                name = getName(2);
                            } else {
                                name = getName(0);
                                if (selector.charCodeAt(selectorIndex) === 124 && selector.charCodeAt(selectorIndex + 1) !== 61) {
                                    namespace = name;
                                    name = getName(1);
                                }
                            }
                            stripWhitespace(0);
                            let action = _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Exists;
                            const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
                            if (possibleAction) {
                                action = possibleAction;
                                if (selector.charCodeAt(selectorIndex + 1) !== 61) {
                                    throw new Error("Expected `=`");
                                }
                                stripWhitespace(2);
                            } else if (selector.charCodeAt(selectorIndex) === 61) {
                                action = _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Equals;
                                stripWhitespace(1);
                            }
                            let value = "";
                            let ignoreCase = null;
                            if (action !== "exists") {
                                if (isQuote(selector.charCodeAt(selectorIndex))) {
                                    const quote = selector.charCodeAt(selectorIndex);
                                    let sectionEnd = selectorIndex + 1;
                                    while (sectionEnd < selector.length && (selector.charCodeAt(sectionEnd) !== quote || isEscaped(sectionEnd))) {
                                        sectionEnd += 1;
                                    }
                                    if (selector.charCodeAt(sectionEnd) !== quote) {
                                        throw new Error("Attribute value didn't end");
                                    }
                                    value = unescapeCSS(selector.slice(selectorIndex + 1, sectionEnd));
                                    selectorIndex = sectionEnd + 1;
                                } else {
                                    const valueStart = selectorIndex;
                                    while (selectorIndex < selector.length && (!isWhitespace(selector.charCodeAt(selectorIndex)) && selector.charCodeAt(selectorIndex) !== 93 || isEscaped(selectorIndex))) {
                                        selectorIndex += 1;
                                    }
                                    value = unescapeCSS(selector.slice(valueStart, selectorIndex));
                                }
                                stripWhitespace(0);
                                const forceIgnore = selector.charCodeAt(selectorIndex) | 32;
                                if (forceIgnore === 115) {
                                    ignoreCase = false;
                                    stripWhitespace(1);
                                } else if (forceIgnore === 105) {
                                    ignoreCase = true;
                                    stripWhitespace(1);
                                }
                            }
                            if (selector.charCodeAt(selectorIndex) !== 93) {
                                throw new Error("Attribute selector didn't terminate");
                            }
                            selectorIndex += 1;
                            const attributeSelector = {
                                type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Attribute,
                                name,
                                action,
                                value,
                                namespace,
                                ignoreCase
                            };
                            tokens.push(attributeSelector);
                            break;
                        }

                      case 58:
                        {
                            if (selector.charCodeAt(selectorIndex + 1) === 58) {
                                tokens.push({
                                    type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.PseudoElement,
                                    name: getName(2).toLowerCase(),
                                    data: selector.charCodeAt(selectorIndex) === 40 ? readValueWithParenthesis() : null
                                });
                                continue;
                            }
                            const name = getName(1).toLowerCase();
                            let data = null;
                            if (selector.charCodeAt(selectorIndex) === 40) {
                                if (unpackPseudos.has(name)) {
                                    if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                                        throw new Error(`Pseudo-selector ${name} cannot be quoted`);
                                    }
                                    data = [];
                                    selectorIndex = parseSelector(data, selector, selectorIndex + 1);
                                    if (selector.charCodeAt(selectorIndex) !== 41) {
                                        throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
                                    }
                                    selectorIndex += 1;
                                } else {
                                    data = readValueWithParenthesis();
                                    if (stripQuotesFromPseudos.has(name)) {
                                        const quot = data.charCodeAt(0);
                                        if (quot === data.charCodeAt(data.length - 1) && isQuote(quot)) {
                                            data = data.slice(1, -1);
                                        }
                                    }
                                    data = unescapeCSS(data);
                                }
                            }
                            tokens.push({
                                type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Pseudo,
                                name,
                                data
                            });
                            break;
                        }

                      case 44:
                        {
                            finalizeSubselector();
                            tokens = [];
                            stripWhitespace(1);
                            break;
                        }

                      default:
                        {
                            if (selector.startsWith("/*", selectorIndex)) {
                                const endIndex = selector.indexOf("*/", selectorIndex + 2);
                                if (endIndex < 0) {
                                    throw new Error("Comment was not terminated");
                                }
                                selectorIndex = endIndex + 2;
                                if (tokens.length === 0) {
                                    stripWhitespace(0);
                                }
                                break;
                            }
                            let namespace = null;
                            let name;
                            if (firstChar === 42) {
                                selectorIndex += 1;
                                name = "*";
                            } else if (firstChar === 124) {
                                name = "";
                                if (selector.charCodeAt(selectorIndex + 1) === 124) {
                                    addTraversal(_types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.ColumnCombinator);
                                    stripWhitespace(2);
                                    break;
                                }
                            } else if (reName.test(selector.slice(selectorIndex))) {
                                name = getName(0);
                            } else {
                                break loop;
                            }
                            if (selector.charCodeAt(selectorIndex) === 124 && selector.charCodeAt(selectorIndex + 1) !== 124) {
                                namespace = name;
                                if (selector.charCodeAt(selectorIndex + 1) === 42) {
                                    name = "*";
                                    selectorIndex += 2;
                                } else {
                                    name = getName(1);
                                }
                            }
                            tokens.push(name === "*" ? {
                                type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Universal,
                                namespace
                            } : {
                                type: _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Tag,
                                name,
                                namespace
                            });
                        }
                    }
                }
                finalizeSubselector();
                return selectorIndex;
            }
        },
        "./node_modules/css-what/lib/es/stringify.js": (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                stringify: () => stringify
            });
            var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./node_modules/css-what/lib/es/types.js");
            const attribValChars = [ "\\", '"' ];
            const pseudoValChars = [ ...attribValChars, "(", ")" ];
            const charsToEscapeInAttributeValue = new Set(attribValChars.map((c => c.charCodeAt(0))));
            const charsToEscapeInPseudoValue = new Set(pseudoValChars.map((c => c.charCodeAt(0))));
            const charsToEscapeInName = new Set([ ...pseudoValChars, "~", "^", "$", "*", "+", "!", "|", ":", "[", "]", " ", "." ].map((c => c.charCodeAt(0))));
            function stringify(selector) {
                return selector.map((token => token.map(stringifyToken).join(""))).join(", ");
            }
            function stringifyToken(token, index, arr) {
                switch (token.type) {
                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Child:
                    return index === 0 ? "> " : " > ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Parent:
                    return index === 0 ? "< " : " < ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Sibling:
                    return index === 0 ? "~ " : " ~ ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Adjacent:
                    return index === 0 ? "+ " : " + ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Descendant:
                    return " ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.ColumnCombinator:
                    return index === 0 ? "|| " : " || ";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Universal:
                    return token.namespace === "*" && index + 1 < arr.length && "name" in arr[index + 1] ? "" : `${getNamespace(token.namespace)}*`;

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Tag:
                    return getNamespacedName(token);

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.PseudoElement:
                    return `::${escapeName(token.name, charsToEscapeInName)}${token.data === null ? "" : `(${escapeName(token.data, charsToEscapeInPseudoValue)})`}`;

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Pseudo:
                    return `:${escapeName(token.name, charsToEscapeInName)}${token.data === null ? "" : `(${typeof token.data === "string" ? escapeName(token.data, charsToEscapeInPseudoValue) : stringify(token.data)})`}`;

                  case _types__WEBPACK_IMPORTED_MODULE_0__.SelectorType.Attribute:
                    {
                        if (token.name === "id" && token.action === _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Equals && token.ignoreCase === "quirks" && !token.namespace) {
                            return `#${escapeName(token.value, charsToEscapeInName)}`;
                        }
                        if (token.name === "class" && token.action === _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Element && token.ignoreCase === "quirks" && !token.namespace) {
                            return `.${escapeName(token.value, charsToEscapeInName)}`;
                        }
                        const name = getNamespacedName(token);
                        if (token.action === _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Exists) {
                            return `[${name}]`;
                        }
                        return `[${name}${getActionValue(token.action)}="${escapeName(token.value, charsToEscapeInAttributeValue)}"${token.ignoreCase === null ? "" : token.ignoreCase ? " i" : " s"}]`;
                    }
                }
            }
            function getActionValue(action) {
                switch (action) {
                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Equals:
                    return "";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Element:
                    return "~";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Start:
                    return "^";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.End:
                    return "$";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Any:
                    return "*";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Not:
                    return "!";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Hyphen:
                    return "|";

                  case _types__WEBPACK_IMPORTED_MODULE_0__.AttributeAction.Exists:
                    throw new Error("Shouldn't be here");
                }
            }
            function getNamespacedName(token) {
                return `${getNamespace(token.namespace)}${escapeName(token.name, charsToEscapeInName)}`;
            }
            function getNamespace(namespace) {
                return namespace !== null ? `${namespace === "*" ? "*" : escapeName(namespace, charsToEscapeInName)}|` : "";
            }
            function escapeName(str, charsToEscape) {
                let lastIdx = 0;
                let ret = "";
                for (let i = 0; i < str.length; i++) {
                    if (charsToEscape.has(str.charCodeAt(i))) {
                        ret += `${str.slice(lastIdx, i)}\\${str.charAt(i)}`;
                        lastIdx = i + 1;
                    }
                }
                return ret.length > 0 ? ret + str.slice(lastIdx) : str;
            }
        },
        "./node_modules/css-what/lib/es/types.js": (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
            "use strict";
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                AttributeAction: () => AttributeAction,
                IgnoreCaseMode: () => IgnoreCaseMode,
                SelectorType: () => SelectorType
            });
            var SelectorType;
            (function(SelectorType) {
                SelectorType["Attribute"] = "attribute";
                SelectorType["Pseudo"] = "pseudo";
                SelectorType["PseudoElement"] = "pseudo-element";
                SelectorType["Tag"] = "tag";
                SelectorType["Universal"] = "universal";
                SelectorType["Adjacent"] = "adjacent";
                SelectorType["Child"] = "child";
                SelectorType["Descendant"] = "descendant";
                SelectorType["Parent"] = "parent";
                SelectorType["Sibling"] = "sibling";
                SelectorType["ColumnCombinator"] = "column-combinator";
            })(SelectorType || (SelectorType = {}));
            const IgnoreCaseMode = {
                Unknown: null,
                QuirksMode: "quirks",
                IgnoreCase: true,
                CaseSensitive: false
            };
            var AttributeAction;
            (function(AttributeAction) {
                AttributeAction["Any"] = "any";
                AttributeAction["Element"] = "element";
                AttributeAction["End"] = "end";
                AttributeAction["Equals"] = "equals";
                AttributeAction["Exists"] = "exists";
                AttributeAction["Hyphen"] = "hyphen";
                AttributeAction["Not"] = "not";
                AttributeAction["Start"] = "start";
            })(AttributeAction || (AttributeAction = {}));
        },
        "./node_modules/dom-serializer/lib/foreignNames.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.attributeNames = exports.elementNames = void 0;
            exports.elementNames = new Map([ [ "altglyph", "altGlyph" ], [ "altglyphdef", "altGlyphDef" ], [ "altglyphitem", "altGlyphItem" ], [ "animatecolor", "animateColor" ], [ "animatemotion", "animateMotion" ], [ "animatetransform", "animateTransform" ], [ "clippath", "clipPath" ], [ "feblend", "feBlend" ], [ "fecolormatrix", "feColorMatrix" ], [ "fecomponenttransfer", "feComponentTransfer" ], [ "fecomposite", "feComposite" ], [ "feconvolvematrix", "feConvolveMatrix" ], [ "fediffuselighting", "feDiffuseLighting" ], [ "fedisplacementmap", "feDisplacementMap" ], [ "fedistantlight", "feDistantLight" ], [ "fedropshadow", "feDropShadow" ], [ "feflood", "feFlood" ], [ "fefunca", "feFuncA" ], [ "fefuncb", "feFuncB" ], [ "fefuncg", "feFuncG" ], [ "fefuncr", "feFuncR" ], [ "fegaussianblur", "feGaussianBlur" ], [ "feimage", "feImage" ], [ "femerge", "feMerge" ], [ "femergenode", "feMergeNode" ], [ "femorphology", "feMorphology" ], [ "feoffset", "feOffset" ], [ "fepointlight", "fePointLight" ], [ "fespecularlighting", "feSpecularLighting" ], [ "fespotlight", "feSpotLight" ], [ "fetile", "feTile" ], [ "feturbulence", "feTurbulence" ], [ "foreignobject", "foreignObject" ], [ "glyphref", "glyphRef" ], [ "lineargradient", "linearGradient" ], [ "radialgradient", "radialGradient" ], [ "textpath", "textPath" ] ]);
            exports.attributeNames = new Map([ [ "definitionurl", "definitionURL" ], [ "attributename", "attributeName" ], [ "attributetype", "attributeType" ], [ "basefrequency", "baseFrequency" ], [ "baseprofile", "baseProfile" ], [ "calcmode", "calcMode" ], [ "clippathunits", "clipPathUnits" ], [ "diffuseconstant", "diffuseConstant" ], [ "edgemode", "edgeMode" ], [ "filterunits", "filterUnits" ], [ "glyphref", "glyphRef" ], [ "gradienttransform", "gradientTransform" ], [ "gradientunits", "gradientUnits" ], [ "kernelmatrix", "kernelMatrix" ], [ "kernelunitlength", "kernelUnitLength" ], [ "keypoints", "keyPoints" ], [ "keysplines", "keySplines" ], [ "keytimes", "keyTimes" ], [ "lengthadjust", "lengthAdjust" ], [ "limitingconeangle", "limitingConeAngle" ], [ "markerheight", "markerHeight" ], [ "markerunits", "markerUnits" ], [ "markerwidth", "markerWidth" ], [ "maskcontentunits", "maskContentUnits" ], [ "maskunits", "maskUnits" ], [ "numoctaves", "numOctaves" ], [ "pathlength", "pathLength" ], [ "patterncontentunits", "patternContentUnits" ], [ "patterntransform", "patternTransform" ], [ "patternunits", "patternUnits" ], [ "pointsatx", "pointsAtX" ], [ "pointsaty", "pointsAtY" ], [ "pointsatz", "pointsAtZ" ], [ "preservealpha", "preserveAlpha" ], [ "preserveaspectratio", "preserveAspectRatio" ], [ "primitiveunits", "primitiveUnits" ], [ "refx", "refX" ], [ "refy", "refY" ], [ "repeatcount", "repeatCount" ], [ "repeatdur", "repeatDur" ], [ "requiredextensions", "requiredExtensions" ], [ "requiredfeatures", "requiredFeatures" ], [ "specularconstant", "specularConstant" ], [ "specularexponent", "specularExponent" ], [ "spreadmethod", "spreadMethod" ], [ "startoffset", "startOffset" ], [ "stddeviation", "stdDeviation" ], [ "stitchtiles", "stitchTiles" ], [ "surfacescale", "surfaceScale" ], [ "systemlanguage", "systemLanguage" ], [ "tablevalues", "tableValues" ], [ "targetx", "targetX" ], [ "targety", "targetY" ], [ "textlength", "textLength" ], [ "viewbox", "viewBox" ], [ "viewtarget", "viewTarget" ], [ "xchannelselector", "xChannelSelector" ], [ "ychannelselector", "yChannelSelector" ], [ "zoomandpan", "zoomAndPan" ] ]);
        },
        "./node_modules/dom-serializer/lib/index.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __assign = this && this.__assign || function() {
                __assign = Object.assign || function(t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                        s = arguments[i];
                        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, arguments);
            };
            var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                Object.defineProperty(o, k2, {
                    enumerable: true,
                    get: function() {
                        return m[k];
                    }
                });
            } : function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                o[k2] = m[k];
            });
            var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function(o, v) {
                Object.defineProperty(o, "default", {
                    enumerable: true,
                    value: v
                });
            } : function(o, v) {
                o["default"] = v;
            });
            var __importStar = this && this.__importStar || function(mod) {
                if (mod && mod.__esModule) return mod;
                var result = {};
                if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
                __setModuleDefault(result, mod);
                return result;
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var ElementType = __importStar(__webpack_require__("./node_modules/domelementtype/lib/index.js"));
            var entities_1 = __webpack_require__("./node_modules/entities/lib/index.js");
            var foreignNames_1 = __webpack_require__("./node_modules/dom-serializer/lib/foreignNames.js");
            var unencodedElements = new Set([ "style", "script", "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript" ]);
            function formatAttributes(attributes, opts) {
                if (!attributes) return;
                return Object.keys(attributes).map((function(key) {
                    var _a, _b;
                    var value = (_a = attributes[key]) !== null && _a !== void 0 ? _a : "";
                    if (opts.xmlMode === "foreign") {
                        key = (_b = foreignNames_1.attributeNames.get(key)) !== null && _b !== void 0 ? _b : key;
                    }
                    if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
                        return key;
                    }
                    return key + '="' + (opts.decodeEntities !== false ? entities_1.encodeXML(value) : value.replace(/"/g, "&quot;")) + '"';
                })).join(" ");
            }
            var singleTag = new Set([ "area", "base", "basefont", "br", "col", "command", "embed", "frame", "hr", "img", "input", "isindex", "keygen", "link", "meta", "param", "source", "track", "wbr" ]);
            function render(node, options) {
                if (options === void 0) {
                    options = {};
                }
                var nodes = "length" in node ? node : [ node ];
                var output = "";
                for (var i = 0; i < nodes.length; i++) {
                    output += renderNode(nodes[i], options);
                }
                return output;
            }
            exports["default"] = render;
            function renderNode(node, options) {
                switch (node.type) {
                  case ElementType.Root:
                    return render(node.children, options);

                  case ElementType.Directive:
                  case ElementType.Doctype:
                    return renderDirective(node);

                  case ElementType.Comment:
                    return renderComment(node);

                  case ElementType.CDATA:
                    return renderCdata(node);

                  case ElementType.Script:
                  case ElementType.Style:
                  case ElementType.Tag:
                    return renderTag(node, options);

                  case ElementType.Text:
                    return renderText(node, options);
                }
            }
            var foreignModeIntegrationPoints = new Set([ "mi", "mo", "mn", "ms", "mtext", "annotation-xml", "foreignObject", "desc", "title" ]);
            var foreignElements = new Set([ "svg", "math" ]);
            function renderTag(elem, opts) {
                var _a;
                if (opts.xmlMode === "foreign") {
                    elem.name = (_a = foreignNames_1.elementNames.get(elem.name)) !== null && _a !== void 0 ? _a : elem.name;
                    if (elem.parent && foreignModeIntegrationPoints.has(elem.parent.name)) {
                        opts = __assign(__assign({}, opts), {
                            xmlMode: false
                        });
                    }
                }
                if (!opts.xmlMode && foreignElements.has(elem.name)) {
                    opts = __assign(__assign({}, opts), {
                        xmlMode: "foreign"
                    });
                }
                var tag = "<" + elem.name;
                var attribs = formatAttributes(elem.attribs, opts);
                if (attribs) {
                    tag += " " + attribs;
                }
                if (elem.children.length === 0 && (opts.xmlMode ? opts.selfClosingTags !== false : opts.selfClosingTags && singleTag.has(elem.name))) {
                    if (!opts.xmlMode) tag += " ";
                    tag += "/>";
                } else {
                    tag += ">";
                    if (elem.children.length > 0) {
                        tag += render(elem.children, opts);
                    }
                    if (opts.xmlMode || !singleTag.has(elem.name)) {
                        tag += "</" + elem.name + ">";
                    }
                }
                return tag;
            }
            function renderDirective(elem) {
                return "<" + elem.data + ">";
            }
            function renderText(elem, opts) {
                var data = elem.data || "";
                if (opts.decodeEntities !== false && !(!opts.xmlMode && elem.parent && unencodedElements.has(elem.parent.name))) {
                    data = entities_1.encodeXML(data);
                }
                return data;
            }
            function renderCdata(elem) {
                return "<![CDATA[" + elem.children[0].data + "]]>";
            }
            function renderComment(elem) {
                return "\x3c!--" + elem.data + "--\x3e";
            }
        },
        "./node_modules/domelementtype/lib/index.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.Doctype = exports.CDATA = exports.Tag = exports.Style = exports.Script = exports.Comment = exports.Directive = exports.Text = exports.Root = exports.isTag = exports.ElementType = void 0;
            var ElementType;
            (function(ElementType) {
                ElementType["Root"] = "root";
                ElementType["Text"] = "text";
                ElementType["Directive"] = "directive";
                ElementType["Comment"] = "comment";
                ElementType["Script"] = "script";
                ElementType["Style"] = "style";
                ElementType["Tag"] = "tag";
                ElementType["CDATA"] = "cdata";
                ElementType["Doctype"] = "doctype";
            })(ElementType = exports.ElementType || (exports.ElementType = {}));
            function isTag(elem) {
                return elem.type === ElementType.Tag || elem.type === ElementType.Script || elem.type === ElementType.Style;
            }
            exports.isTag = isTag;
            exports.Root = ElementType.Root;
            exports.Text = ElementType.Text;
            exports.Directive = ElementType.Directive;
            exports.Comment = ElementType.Comment;
            exports.Script = ElementType.Script;
            exports.Style = ElementType.Style;
            exports.Tag = ElementType.Tag;
            exports.CDATA = ElementType.CDATA;
            exports.Doctype = ElementType.Doctype;
        },
        "./node_modules/domhandler/lib/index.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                var desc = Object.getOwnPropertyDescriptor(m, k);
                if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                    desc = {
                        enumerable: true,
                        get: function() {
                            return m[k];
                        }
                    };
                }
                Object.defineProperty(o, k2, desc);
            } : function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                o[k2] = m[k];
            });
            var __exportStar = this && this.__exportStar || function(m, exports) {
                for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.DomHandler = void 0;
            var domelementtype_1 = __webpack_require__("./node_modules/domelementtype/lib/index.js");
            var node_1 = __webpack_require__("./node_modules/domhandler/lib/node.js");
            __exportStar(__webpack_require__("./node_modules/domhandler/lib/node.js"), exports);
            var reWhitespace = /\s+/g;
            var defaultOpts = {
                normalizeWhitespace: false,
                withStartIndices: false,
                withEndIndices: false,
                xmlMode: false
            };
            var DomHandler = function() {
                function DomHandler(callback, options, elementCB) {
                    this.dom = [];
                    this.root = new node_1.Document(this.dom);
                    this.done = false;
                    this.tagStack = [ this.root ];
                    this.lastNode = null;
                    this.parser = null;
                    if (typeof options === "function") {
                        elementCB = options;
                        options = defaultOpts;
                    }
                    if (typeof callback === "object") {
                        options = callback;
                        callback = undefined;
                    }
                    this.callback = callback !== null && callback !== void 0 ? callback : null;
                    this.options = options !== null && options !== void 0 ? options : defaultOpts;
                    this.elementCB = elementCB !== null && elementCB !== void 0 ? elementCB : null;
                }
                DomHandler.prototype.onparserinit = function(parser) {
                    this.parser = parser;
                };
                DomHandler.prototype.onreset = function() {
                    this.dom = [];
                    this.root = new node_1.Document(this.dom);
                    this.done = false;
                    this.tagStack = [ this.root ];
                    this.lastNode = null;
                    this.parser = null;
                };
                DomHandler.prototype.onend = function() {
                    if (this.done) return;
                    this.done = true;
                    this.parser = null;
                    this.handleCallback(null);
                };
                DomHandler.prototype.onerror = function(error) {
                    this.handleCallback(error);
                };
                DomHandler.prototype.onclosetag = function() {
                    this.lastNode = null;
                    var elem = this.tagStack.pop();
                    if (this.options.withEndIndices) {
                        elem.endIndex = this.parser.endIndex;
                    }
                    if (this.elementCB) this.elementCB(elem);
                };
                DomHandler.prototype.onopentag = function(name, attribs) {
                    var type = this.options.xmlMode ? domelementtype_1.ElementType.Tag : undefined;
                    var element = new node_1.Element(name, attribs, undefined, type);
                    this.addNode(element);
                    this.tagStack.push(element);
                };
                DomHandler.prototype.ontext = function(data) {
                    var normalizeWhitespace = this.options.normalizeWhitespace;
                    var lastNode = this.lastNode;
                    if (lastNode && lastNode.type === domelementtype_1.ElementType.Text) {
                        if (normalizeWhitespace) {
                            lastNode.data = (lastNode.data + data).replace(reWhitespace, " ");
                        } else {
                            lastNode.data += data;
                        }
                        if (this.options.withEndIndices) {
                            lastNode.endIndex = this.parser.endIndex;
                        }
                    } else {
                        if (normalizeWhitespace) {
                            data = data.replace(reWhitespace, " ");
                        }
                        var node = new node_1.Text(data);
                        this.addNode(node);
                        this.lastNode = node;
                    }
                };
                DomHandler.prototype.oncomment = function(data) {
                    if (this.lastNode && this.lastNode.type === domelementtype_1.ElementType.Comment) {
                        this.lastNode.data += data;
                        return;
                    }
                    var node = new node_1.Comment(data);
                    this.addNode(node);
                    this.lastNode = node;
                };
                DomHandler.prototype.oncommentend = function() {
                    this.lastNode = null;
                };
                DomHandler.prototype.oncdatastart = function() {
                    var text = new node_1.Text("");
                    var node = new node_1.NodeWithChildren(domelementtype_1.ElementType.CDATA, [ text ]);
                    this.addNode(node);
                    text.parent = node;
                    this.lastNode = text;
                };
                DomHandler.prototype.oncdataend = function() {
                    this.lastNode = null;
                };
                DomHandler.prototype.onprocessinginstruction = function(name, data) {
                    var node = new node_1.ProcessingInstruction(name, data);
                    this.addNode(node);
                };
                DomHandler.prototype.handleCallback = function(error) {
                    if (typeof this.callback === "function") {
                        this.callback(error, this.dom);
                    } else if (error) {
                        throw error;
                    }
                };
                DomHandler.prototype.addNode = function(node) {
                    var parent = this.tagStack[this.tagStack.length - 1];
                    var previousSibling = parent.children[parent.children.length - 1];
                    if (this.options.withStartIndices) {
                        node.startIndex = this.parser.startIndex;
                    }
                    if (this.options.withEndIndices) {
                        node.endIndex = this.parser.endIndex;
                    }
                    parent.children.push(node);
                    if (previousSibling) {
                        node.prev = previousSibling;
                        previousSibling.next = node;
                    }
                    node.parent = parent;
                    this.lastNode = null;
                };
                return DomHandler;
            }();
            exports.DomHandler = DomHandler;
            exports["default"] = DomHandler;
        },
        "./node_modules/domhandler/lib/node.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __extends = this && this.__extends || function() {
                var extendStatics = function(d, b) {
                    extendStatics = Object.setPrototypeOf || {
                        __proto__: []
                    } instanceof Array && function(d, b) {
                        d.__proto__ = b;
                    } || function(d, b) {
                        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
                    };
                    return extendStatics(d, b);
                };
                return function(d, b) {
                    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
                    extendStatics(d, b);
                    function __() {
                        this.constructor = d;
                    }
                    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
                };
            }();
            var __assign = this && this.__assign || function() {
                __assign = Object.assign || function(t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                        s = arguments[i];
                        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, arguments);
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.cloneNode = exports.hasChildren = exports.isDocument = exports.isDirective = exports.isComment = exports.isText = exports.isCDATA = exports.isTag = exports.Element = exports.Document = exports.NodeWithChildren = exports.ProcessingInstruction = exports.Comment = exports.Text = exports.DataNode = exports.Node = void 0;
            var domelementtype_1 = __webpack_require__("./node_modules/domelementtype/lib/index.js");
            var nodeTypes = new Map([ [ domelementtype_1.ElementType.Tag, 1 ], [ domelementtype_1.ElementType.Script, 1 ], [ domelementtype_1.ElementType.Style, 1 ], [ domelementtype_1.ElementType.Directive, 1 ], [ domelementtype_1.ElementType.Text, 3 ], [ domelementtype_1.ElementType.CDATA, 4 ], [ domelementtype_1.ElementType.Comment, 8 ], [ domelementtype_1.ElementType.Root, 9 ] ]);
            var Node = function() {
                function Node(type) {
                    this.type = type;
                    this.parent = null;
                    this.prev = null;
                    this.next = null;
                    this.startIndex = null;
                    this.endIndex = null;
                }
                Object.defineProperty(Node.prototype, "nodeType", {
                    get: function() {
                        var _a;
                        return (_a = nodeTypes.get(this.type)) !== null && _a !== void 0 ? _a : 1;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Node.prototype, "parentNode", {
                    get: function() {
                        return this.parent;
                    },
                    set: function(parent) {
                        this.parent = parent;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Node.prototype, "previousSibling", {
                    get: function() {
                        return this.prev;
                    },
                    set: function(prev) {
                        this.prev = prev;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Node.prototype, "nextSibling", {
                    get: function() {
                        return this.next;
                    },
                    set: function(next) {
                        this.next = next;
                    },
                    enumerable: false,
                    configurable: true
                });
                Node.prototype.cloneNode = function(recursive) {
                    if (recursive === void 0) {
                        recursive = false;
                    }
                    return cloneNode(this, recursive);
                };
                return Node;
            }();
            exports.Node = Node;
            var DataNode = function(_super) {
                __extends(DataNode, _super);
                function DataNode(type, data) {
                    var _this = _super.call(this, type) || this;
                    _this.data = data;
                    return _this;
                }
                Object.defineProperty(DataNode.prototype, "nodeValue", {
                    get: function() {
                        return this.data;
                    },
                    set: function(data) {
                        this.data = data;
                    },
                    enumerable: false,
                    configurable: true
                });
                return DataNode;
            }(Node);
            exports.DataNode = DataNode;
            var Text = function(_super) {
                __extends(Text, _super);
                function Text(data) {
                    return _super.call(this, domelementtype_1.ElementType.Text, data) || this;
                }
                return Text;
            }(DataNode);
            exports.Text = Text;
            var Comment = function(_super) {
                __extends(Comment, _super);
                function Comment(data) {
                    return _super.call(this, domelementtype_1.ElementType.Comment, data) || this;
                }
                return Comment;
            }(DataNode);
            exports.Comment = Comment;
            var ProcessingInstruction = function(_super) {
                __extends(ProcessingInstruction, _super);
                function ProcessingInstruction(name, data) {
                    var _this = _super.call(this, domelementtype_1.ElementType.Directive, data) || this;
                    _this.name = name;
                    return _this;
                }
                return ProcessingInstruction;
            }(DataNode);
            exports.ProcessingInstruction = ProcessingInstruction;
            var NodeWithChildren = function(_super) {
                __extends(NodeWithChildren, _super);
                function NodeWithChildren(type, children) {
                    var _this = _super.call(this, type) || this;
                    _this.children = children;
                    return _this;
                }
                Object.defineProperty(NodeWithChildren.prototype, "firstChild", {
                    get: function() {
                        var _a;
                        return (_a = this.children[0]) !== null && _a !== void 0 ? _a : null;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(NodeWithChildren.prototype, "lastChild", {
                    get: function() {
                        return this.children.length > 0 ? this.children[this.children.length - 1] : null;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(NodeWithChildren.prototype, "childNodes", {
                    get: function() {
                        return this.children;
                    },
                    set: function(children) {
                        this.children = children;
                    },
                    enumerable: false,
                    configurable: true
                });
                return NodeWithChildren;
            }(Node);
            exports.NodeWithChildren = NodeWithChildren;
            var Document = function(_super) {
                __extends(Document, _super);
                function Document(children) {
                    return _super.call(this, domelementtype_1.ElementType.Root, children) || this;
                }
                return Document;
            }(NodeWithChildren);
            exports.Document = Document;
            var Element = function(_super) {
                __extends(Element, _super);
                function Element(name, attribs, children, type) {
                    if (children === void 0) {
                        children = [];
                    }
                    if (type === void 0) {
                        type = name === "script" ? domelementtype_1.ElementType.Script : name === "style" ? domelementtype_1.ElementType.Style : domelementtype_1.ElementType.Tag;
                    }
                    var _this = _super.call(this, type, children) || this;
                    _this.name = name;
                    _this.attribs = attribs;
                    return _this;
                }
                Object.defineProperty(Element.prototype, "tagName", {
                    get: function() {
                        return this.name;
                    },
                    set: function(name) {
                        this.name = name;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Element.prototype, "attributes", {
                    get: function() {
                        var _this = this;
                        return Object.keys(this.attribs).map((function(name) {
                            var _a, _b;
                            return {
                                name,
                                value: _this.attribs[name],
                                namespace: (_a = _this["x-attribsNamespace"]) === null || _a === void 0 ? void 0 : _a[name],
                                prefix: (_b = _this["x-attribsPrefix"]) === null || _b === void 0 ? void 0 : _b[name]
                            };
                        }));
                    },
                    enumerable: false,
                    configurable: true
                });
                return Element;
            }(NodeWithChildren);
            exports.Element = Element;
            function isTag(node) {
                return (0, domelementtype_1.isTag)(node);
            }
            exports.isTag = isTag;
            function isCDATA(node) {
                return node.type === domelementtype_1.ElementType.CDATA;
            }
            exports.isCDATA = isCDATA;
            function isText(node) {
                return node.type === domelementtype_1.ElementType.Text;
            }
            exports.isText = isText;
            function isComment(node) {
                return node.type === domelementtype_1.ElementType.Comment;
            }
            exports.isComment = isComment;
            function isDirective(node) {
                return node.type === domelementtype_1.ElementType.Directive;
            }
            exports.isDirective = isDirective;
            function isDocument(node) {
                return node.type === domelementtype_1.ElementType.Root;
            }
            exports.isDocument = isDocument;
            function hasChildren(node) {
                return Object.prototype.hasOwnProperty.call(node, "children");
            }
            exports.hasChildren = hasChildren;
            function cloneNode(node, recursive) {
                if (recursive === void 0) {
                    recursive = false;
                }
                var result;
                if (isText(node)) {
                    result = new Text(node.data);
                } else if (isComment(node)) {
                    result = new Comment(node.data);
                } else if (isTag(node)) {
                    var children = recursive ? cloneChildren(node.children) : [];
                    var clone_1 = new Element(node.name, __assign({}, node.attribs), children);
                    children.forEach((function(child) {
                        return child.parent = clone_1;
                    }));
                    if (node.namespace != null) {
                        clone_1.namespace = node.namespace;
                    }
                    if (node["x-attribsNamespace"]) {
                        clone_1["x-attribsNamespace"] = __assign({}, node["x-attribsNamespace"]);
                    }
                    if (node["x-attribsPrefix"]) {
                        clone_1["x-attribsPrefix"] = __assign({}, node["x-attribsPrefix"]);
                    }
                    result = clone_1;
                } else if (isCDATA(node)) {
                    var children = recursive ? cloneChildren(node.children) : [];
                    var clone_2 = new NodeWithChildren(domelementtype_1.ElementType.CDATA, children);
                    children.forEach((function(child) {
                        return child.parent = clone_2;
                    }));
                    result = clone_2;
                } else if (isDocument(node)) {
                    var children = recursive ? cloneChildren(node.children) : [];
                    var clone_3 = new Document(children);
                    children.forEach((function(child) {
                        return child.parent = clone_3;
                    }));
                    if (node["x-mode"]) {
                        clone_3["x-mode"] = node["x-mode"];
                    }
                    result = clone_3;
                } else if (isDirective(node)) {
                    var instruction = new ProcessingInstruction(node.name, node.data);
                    if (node["x-name"] != null) {
                        instruction["x-name"] = node["x-name"];
                        instruction["x-publicId"] = node["x-publicId"];
                        instruction["x-systemId"] = node["x-systemId"];
                    }
                    result = instruction;
                } else {
                    throw new Error("Not implemented yet: ".concat(node.type));
                }
                result.startIndex = node.startIndex;
                result.endIndex = node.endIndex;
                if (node.sourceCodeLocation != null) {
                    result.sourceCodeLocation = node.sourceCodeLocation;
                }
                return result;
            }
            exports.cloneNode = cloneNode;
            function cloneChildren(childs) {
                var children = childs.map((function(child) {
                    return cloneNode(child, true);
                }));
                for (var i = 1; i < children.length; i++) {
                    children[i].prev = children[i - 1];
                    children[i - 1].next = children[i];
                }
                return children;
            }
        },
        "./node_modules/domutils/lib/feeds.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.getFeed = void 0;
            var stringify_1 = __webpack_require__("./node_modules/domutils/lib/stringify.js");
            var legacy_1 = __webpack_require__("./node_modules/domutils/lib/legacy.js");
            function getFeed(doc) {
                var feedRoot = getOneElement(isValidFeed, doc);
                return !feedRoot ? null : feedRoot.name === "feed" ? getAtomFeed(feedRoot) : getRssFeed(feedRoot);
            }
            exports.getFeed = getFeed;
            function getAtomFeed(feedRoot) {
                var _a;
                var childs = feedRoot.children;
                var feed = {
                    type: "atom",
                    items: (0, legacy_1.getElementsByTagName)("entry", childs).map((function(item) {
                        var _a;
                        var children = item.children;
                        var entry = {
                            media: getMediaElements(children)
                        };
                        addConditionally(entry, "id", "id", children);
                        addConditionally(entry, "title", "title", children);
                        var href = (_a = getOneElement("link", children)) === null || _a === void 0 ? void 0 : _a.attribs.href;
                        if (href) {
                            entry.link = href;
                        }
                        var description = fetch("summary", children) || fetch("content", children);
                        if (description) {
                            entry.description = description;
                        }
                        var pubDate = fetch("updated", children);
                        if (pubDate) {
                            entry.pubDate = new Date(pubDate);
                        }
                        return entry;
                    }))
                };
                addConditionally(feed, "id", "id", childs);
                addConditionally(feed, "title", "title", childs);
                var href = (_a = getOneElement("link", childs)) === null || _a === void 0 ? void 0 : _a.attribs.href;
                if (href) {
                    feed.link = href;
                }
                addConditionally(feed, "description", "subtitle", childs);
                var updated = fetch("updated", childs);
                if (updated) {
                    feed.updated = new Date(updated);
                }
                addConditionally(feed, "author", "email", childs, true);
                return feed;
            }
            function getRssFeed(feedRoot) {
                var _a, _b;
                var childs = (_b = (_a = getOneElement("channel", feedRoot.children)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : [];
                var feed = {
                    type: feedRoot.name.substr(0, 3),
                    id: "",
                    items: (0, legacy_1.getElementsByTagName)("item", feedRoot.children).map((function(item) {
                        var children = item.children;
                        var entry = {
                            media: getMediaElements(children)
                        };
                        addConditionally(entry, "id", "guid", children);
                        addConditionally(entry, "title", "title", children);
                        addConditionally(entry, "link", "link", children);
                        addConditionally(entry, "description", "description", children);
                        var pubDate = fetch("pubDate", children);
                        if (pubDate) entry.pubDate = new Date(pubDate);
                        return entry;
                    }))
                };
                addConditionally(feed, "title", "title", childs);
                addConditionally(feed, "link", "link", childs);
                addConditionally(feed, "description", "description", childs);
                var updated = fetch("lastBuildDate", childs);
                if (updated) {
                    feed.updated = new Date(updated);
                }
                addConditionally(feed, "author", "managingEditor", childs, true);
                return feed;
            }
            var MEDIA_KEYS_STRING = [ "url", "type", "lang" ];
            var MEDIA_KEYS_INT = [ "fileSize", "bitrate", "framerate", "samplingrate", "channels", "duration", "height", "width" ];
            function getMediaElements(where) {
                return (0, legacy_1.getElementsByTagName)("media:content", where).map((function(elem) {
                    var attribs = elem.attribs;
                    var media = {
                        medium: attribs.medium,
                        isDefault: !!attribs.isDefault
                    };
                    for (var _i = 0, MEDIA_KEYS_STRING_1 = MEDIA_KEYS_STRING; _i < MEDIA_KEYS_STRING_1.length; _i++) {
                        var attrib = MEDIA_KEYS_STRING_1[_i];
                        if (attribs[attrib]) {
                            media[attrib] = attribs[attrib];
                        }
                    }
                    for (var _a = 0, MEDIA_KEYS_INT_1 = MEDIA_KEYS_INT; _a < MEDIA_KEYS_INT_1.length; _a++) {
                        var attrib = MEDIA_KEYS_INT_1[_a];
                        if (attribs[attrib]) {
                            media[attrib] = parseInt(attribs[attrib], 10);
                        }
                    }
                    if (attribs.expression) {
                        media.expression = attribs.expression;
                    }
                    return media;
                }));
            }
            function getOneElement(tagName, node) {
                return (0, legacy_1.getElementsByTagName)(tagName, node, true, 1)[0];
            }
            function fetch(tagName, where, recurse) {
                if (recurse === void 0) {
                    recurse = false;
                }
                return (0, stringify_1.textContent)((0, legacy_1.getElementsByTagName)(tagName, where, recurse, 1)).trim();
            }
            function addConditionally(obj, prop, tagName, where, recurse) {
                if (recurse === void 0) {
                    recurse = false;
                }
                var val = fetch(tagName, where, recurse);
                if (val) obj[prop] = val;
            }
            function isValidFeed(value) {
                return value === "rss" || value === "feed" || value === "rdf:RDF";
            }
        },
        "./node_modules/domutils/lib/helpers.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.uniqueSort = exports.compareDocumentPosition = exports.removeSubsets = void 0;
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            function removeSubsets(nodes) {
                var idx = nodes.length;
                while (--idx >= 0) {
                    var node = nodes[idx];
                    if (idx > 0 && nodes.lastIndexOf(node, idx - 1) >= 0) {
                        nodes.splice(idx, 1);
                        continue;
                    }
                    for (var ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
                        if (nodes.includes(ancestor)) {
                            nodes.splice(idx, 1);
                            break;
                        }
                    }
                }
                return nodes;
            }
            exports.removeSubsets = removeSubsets;
            function compareDocumentPosition(nodeA, nodeB) {
                var aParents = [];
                var bParents = [];
                if (nodeA === nodeB) {
                    return 0;
                }
                var current = (0, domhandler_1.hasChildren)(nodeA) ? nodeA : nodeA.parent;
                while (current) {
                    aParents.unshift(current);
                    current = current.parent;
                }
                current = (0, domhandler_1.hasChildren)(nodeB) ? nodeB : nodeB.parent;
                while (current) {
                    bParents.unshift(current);
                    current = current.parent;
                }
                var maxIdx = Math.min(aParents.length, bParents.length);
                var idx = 0;
                while (idx < maxIdx && aParents[idx] === bParents[idx]) {
                    idx++;
                }
                if (idx === 0) {
                    return 1;
                }
                var sharedParent = aParents[idx - 1];
                var siblings = sharedParent.children;
                var aSibling = aParents[idx];
                var bSibling = bParents[idx];
                if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
                    if (sharedParent === nodeB) {
                        return 4 | 16;
                    }
                    return 4;
                }
                if (sharedParent === nodeA) {
                    return 2 | 8;
                }
                return 2;
            }
            exports.compareDocumentPosition = compareDocumentPosition;
            function uniqueSort(nodes) {
                nodes = nodes.filter((function(node, i, arr) {
                    return !arr.includes(node, i + 1);
                }));
                nodes.sort((function(a, b) {
                    var relative = compareDocumentPosition(a, b);
                    if (relative & 2) {
                        return -1;
                    } else if (relative & 4) {
                        return 1;
                    }
                    return 0;
                }));
                return nodes;
            }
            exports.uniqueSort = uniqueSort;
        },
        "./node_modules/domutils/lib/index.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __createBinding = this && this.__createBinding || (Object.create ? function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                Object.defineProperty(o, k2, {
                    enumerable: true,
                    get: function() {
                        return m[k];
                    }
                });
            } : function(o, m, k, k2) {
                if (k2 === undefined) k2 = k;
                o[k2] = m[k];
            });
            var __exportStar = this && this.__exportStar || function(m, exports) {
                for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.hasChildren = exports.isDocument = exports.isComment = exports.isText = exports.isCDATA = exports.isTag = void 0;
            __exportStar(__webpack_require__("./node_modules/domutils/lib/stringify.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/traversal.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/manipulation.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/querying.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/legacy.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/helpers.js"), exports);
            __exportStar(__webpack_require__("./node_modules/domutils/lib/feeds.js"), exports);
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            Object.defineProperty(exports, "isTag", {
                enumerable: true,
                get: function() {
                    return domhandler_1.isTag;
                }
            });
            Object.defineProperty(exports, "isCDATA", {
                enumerable: true,
                get: function() {
                    return domhandler_1.isCDATA;
                }
            });
            Object.defineProperty(exports, "isText", {
                enumerable: true,
                get: function() {
                    return domhandler_1.isText;
                }
            });
            Object.defineProperty(exports, "isComment", {
                enumerable: true,
                get: function() {
                    return domhandler_1.isComment;
                }
            });
            Object.defineProperty(exports, "isDocument", {
                enumerable: true,
                get: function() {
                    return domhandler_1.isDocument;
                }
            });
            Object.defineProperty(exports, "hasChildren", {
                enumerable: true,
                get: function() {
                    return domhandler_1.hasChildren;
                }
            });
        },
        "./node_modules/domutils/lib/legacy.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.getElementsByTagType = exports.getElementsByTagName = exports.getElementById = exports.getElements = exports.testElement = void 0;
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            var querying_1 = __webpack_require__("./node_modules/domutils/lib/querying.js");
            var Checks = {
                tag_name: function(name) {
                    if (typeof name === "function") {
                        return function(elem) {
                            return (0, domhandler_1.isTag)(elem) && name(elem.name);
                        };
                    } else if (name === "*") {
                        return domhandler_1.isTag;
                    }
                    return function(elem) {
                        return (0, domhandler_1.isTag)(elem) && elem.name === name;
                    };
                },
                tag_type: function(type) {
                    if (typeof type === "function") {
                        return function(elem) {
                            return type(elem.type);
                        };
                    }
                    return function(elem) {
                        return elem.type === type;
                    };
                },
                tag_contains: function(data) {
                    if (typeof data === "function") {
                        return function(elem) {
                            return (0, domhandler_1.isText)(elem) && data(elem.data);
                        };
                    }
                    return function(elem) {
                        return (0, domhandler_1.isText)(elem) && elem.data === data;
                    };
                }
            };
            function getAttribCheck(attrib, value) {
                if (typeof value === "function") {
                    return function(elem) {
                        return (0, domhandler_1.isTag)(elem) && value(elem.attribs[attrib]);
                    };
                }
                return function(elem) {
                    return (0, domhandler_1.isTag)(elem) && elem.attribs[attrib] === value;
                };
            }
            function combineFuncs(a, b) {
                return function(elem) {
                    return a(elem) || b(elem);
                };
            }
            function compileTest(options) {
                var funcs = Object.keys(options).map((function(key) {
                    var value = options[key];
                    return Object.prototype.hasOwnProperty.call(Checks, key) ? Checks[key](value) : getAttribCheck(key, value);
                }));
                return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
            }
            function testElement(options, node) {
                var test = compileTest(options);
                return test ? test(node) : true;
            }
            exports.testElement = testElement;
            function getElements(options, nodes, recurse, limit) {
                if (limit === void 0) {
                    limit = Infinity;
                }
                var test = compileTest(options);
                return test ? (0, querying_1.filter)(test, nodes, recurse, limit) : [];
            }
            exports.getElements = getElements;
            function getElementById(id, nodes, recurse) {
                if (recurse === void 0) {
                    recurse = true;
                }
                if (!Array.isArray(nodes)) nodes = [ nodes ];
                return (0, querying_1.findOne)(getAttribCheck("id", id), nodes, recurse);
            }
            exports.getElementById = getElementById;
            function getElementsByTagName(tagName, nodes, recurse, limit) {
                if (recurse === void 0) {
                    recurse = true;
                }
                if (limit === void 0) {
                    limit = Infinity;
                }
                return (0, querying_1.filter)(Checks.tag_name(tagName), nodes, recurse, limit);
            }
            exports.getElementsByTagName = getElementsByTagName;
            function getElementsByTagType(type, nodes, recurse, limit) {
                if (recurse === void 0) {
                    recurse = true;
                }
                if (limit === void 0) {
                    limit = Infinity;
                }
                return (0, querying_1.filter)(Checks.tag_type(type), nodes, recurse, limit);
            }
            exports.getElementsByTagType = getElementsByTagType;
        },
        "./node_modules/domutils/lib/manipulation.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.prepend = exports.prependChild = exports.append = exports.appendChild = exports.replaceElement = exports.removeElement = void 0;
            function removeElement(elem) {
                if (elem.prev) elem.prev.next = elem.next;
                if (elem.next) elem.next.prev = elem.prev;
                if (elem.parent) {
                    var childs = elem.parent.children;
                    childs.splice(childs.lastIndexOf(elem), 1);
                }
            }
            exports.removeElement = removeElement;
            function replaceElement(elem, replacement) {
                var prev = replacement.prev = elem.prev;
                if (prev) {
                    prev.next = replacement;
                }
                var next = replacement.next = elem.next;
                if (next) {
                    next.prev = replacement;
                }
                var parent = replacement.parent = elem.parent;
                if (parent) {
                    var childs = parent.children;
                    childs[childs.lastIndexOf(elem)] = replacement;
                }
            }
            exports.replaceElement = replaceElement;
            function appendChild(elem, child) {
                removeElement(child);
                child.next = null;
                child.parent = elem;
                if (elem.children.push(child) > 1) {
                    var sibling = elem.children[elem.children.length - 2];
                    sibling.next = child;
                    child.prev = sibling;
                } else {
                    child.prev = null;
                }
            }
            exports.appendChild = appendChild;
            function append(elem, next) {
                removeElement(next);
                var parent = elem.parent;
                var currNext = elem.next;
                next.next = currNext;
                next.prev = elem;
                elem.next = next;
                next.parent = parent;
                if (currNext) {
                    currNext.prev = next;
                    if (parent) {
                        var childs = parent.children;
                        childs.splice(childs.lastIndexOf(currNext), 0, next);
                    }
                } else if (parent) {
                    parent.children.push(next);
                }
            }
            exports.append = append;
            function prependChild(elem, child) {
                removeElement(child);
                child.parent = elem;
                child.prev = null;
                if (elem.children.unshift(child) !== 1) {
                    var sibling = elem.children[1];
                    sibling.prev = child;
                    child.next = sibling;
                } else {
                    child.next = null;
                }
            }
            exports.prependChild = prependChild;
            function prepend(elem, prev) {
                removeElement(prev);
                var parent = elem.parent;
                if (parent) {
                    var childs = parent.children;
                    childs.splice(childs.indexOf(elem), 0, prev);
                }
                if (elem.prev) {
                    elem.prev.next = prev;
                }
                prev.parent = parent;
                prev.prev = elem.prev;
                prev.next = elem;
                elem.prev = prev;
            }
            exports.prepend = prepend;
        },
        "./node_modules/domutils/lib/querying.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.findAll = exports.existsOne = exports.findOne = exports.findOneChild = exports.find = exports.filter = void 0;
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            function filter(test, node, recurse, limit) {
                if (recurse === void 0) {
                    recurse = true;
                }
                if (limit === void 0) {
                    limit = Infinity;
                }
                if (!Array.isArray(node)) node = [ node ];
                return find(test, node, recurse, limit);
            }
            exports.filter = filter;
            function find(test, nodes, recurse, limit) {
                var result = [];
                for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                    var elem = nodes_1[_i];
                    if (test(elem)) {
                        result.push(elem);
                        if (--limit <= 0) break;
                    }
                    if (recurse && (0, domhandler_1.hasChildren)(elem) && elem.children.length > 0) {
                        var children = find(test, elem.children, recurse, limit);
                        result.push.apply(result, children);
                        limit -= children.length;
                        if (limit <= 0) break;
                    }
                }
                return result;
            }
            exports.find = find;
            function findOneChild(test, nodes) {
                return nodes.find(test);
            }
            exports.findOneChild = findOneChild;
            function findOne(test, nodes, recurse) {
                if (recurse === void 0) {
                    recurse = true;
                }
                var elem = null;
                for (var i = 0; i < nodes.length && !elem; i++) {
                    var checked = nodes[i];
                    if (!(0, domhandler_1.isTag)(checked)) {
                        continue;
                    } else if (test(checked)) {
                        elem = checked;
                    } else if (recurse && checked.children.length > 0) {
                        elem = findOne(test, checked.children);
                    }
                }
                return elem;
            }
            exports.findOne = findOne;
            function existsOne(test, nodes) {
                return nodes.some((function(checked) {
                    return (0, domhandler_1.isTag)(checked) && (test(checked) || checked.children.length > 0 && existsOne(test, checked.children));
                }));
            }
            exports.existsOne = existsOne;
            function findAll(test, nodes) {
                var _a;
                var result = [];
                var stack = nodes.filter(domhandler_1.isTag);
                var elem;
                while (elem = stack.shift()) {
                    var children = (_a = elem.children) === null || _a === void 0 ? void 0 : _a.filter(domhandler_1.isTag);
                    if (children && children.length > 0) {
                        stack.unshift.apply(stack, children);
                    }
                    if (test(elem)) result.push(elem);
                }
                return result;
            }
            exports.findAll = findAll;
        },
        "./node_modules/domutils/lib/stringify.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.innerText = exports.textContent = exports.getText = exports.getInnerHTML = exports.getOuterHTML = void 0;
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            var dom_serializer_1 = __importDefault(__webpack_require__("./node_modules/dom-serializer/lib/index.js"));
            var domelementtype_1 = __webpack_require__("./node_modules/domelementtype/lib/index.js");
            function getOuterHTML(node, options) {
                return (0, dom_serializer_1.default)(node, options);
            }
            exports.getOuterHTML = getOuterHTML;
            function getInnerHTML(node, options) {
                return (0, domhandler_1.hasChildren)(node) ? node.children.map((function(node) {
                    return getOuterHTML(node, options);
                })).join("") : "";
            }
            exports.getInnerHTML = getInnerHTML;
            function getText(node) {
                if (Array.isArray(node)) return node.map(getText).join("");
                if ((0, domhandler_1.isTag)(node)) return node.name === "br" ? "\n" : getText(node.children);
                if ((0, domhandler_1.isCDATA)(node)) return getText(node.children);
                if ((0, domhandler_1.isText)(node)) return node.data;
                return "";
            }
            exports.getText = getText;
            function textContent(node) {
                if (Array.isArray(node)) return node.map(textContent).join("");
                if ((0, domhandler_1.hasChildren)(node) && !(0, domhandler_1.isComment)(node)) {
                    return textContent(node.children);
                }
                if ((0, domhandler_1.isText)(node)) return node.data;
                return "";
            }
            exports.textContent = textContent;
            function innerText(node) {
                if (Array.isArray(node)) return node.map(innerText).join("");
                if ((0, domhandler_1.hasChildren)(node) && (node.type === domelementtype_1.ElementType.Tag || (0, 
                domhandler_1.isCDATA)(node))) {
                    return innerText(node.children);
                }
                if ((0, domhandler_1.isText)(node)) return node.data;
                return "";
            }
            exports.innerText = innerText;
        },
        "./node_modules/domutils/lib/traversal.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.prevElementSibling = exports.nextElementSibling = exports.getName = exports.hasAttrib = exports.getAttributeValue = exports.getSiblings = exports.getParent = exports.getChildren = void 0;
            var domhandler_1 = __webpack_require__("./node_modules/domhandler/lib/index.js");
            var emptyArray = [];
            function getChildren(elem) {
                var _a;
                return (_a = elem.children) !== null && _a !== void 0 ? _a : emptyArray;
            }
            exports.getChildren = getChildren;
            function getParent(elem) {
                return elem.parent || null;
            }
            exports.getParent = getParent;
            function getSiblings(elem) {
                var _a, _b;
                var parent = getParent(elem);
                if (parent != null) return getChildren(parent);
                var siblings = [ elem ];
                var prev = elem.prev, next = elem.next;
                while (prev != null) {
                    siblings.unshift(prev);
                    _a = prev, prev = _a.prev;
                }
                while (next != null) {
                    siblings.push(next);
                    _b = next, next = _b.next;
                }
                return siblings;
            }
            exports.getSiblings = getSiblings;
            function getAttributeValue(elem, name) {
                var _a;
                return (_a = elem.attribs) === null || _a === void 0 ? void 0 : _a[name];
            }
            exports.getAttributeValue = getAttributeValue;
            function hasAttrib(elem, name) {
                return elem.attribs != null && Object.prototype.hasOwnProperty.call(elem.attribs, name) && elem.attribs[name] != null;
            }
            exports.hasAttrib = hasAttrib;
            function getName(elem) {
                return elem.name;
            }
            exports.getName = getName;
            function nextElementSibling(elem) {
                var _a;
                var next = elem.next;
                while (next !== null && !(0, domhandler_1.isTag)(next)) _a = next, next = _a.next;
                return next;
            }
            exports.nextElementSibling = nextElementSibling;
            function prevElementSibling(elem) {
                var _a;
                var prev = elem.prev;
                while (prev !== null && !(0, domhandler_1.isTag)(prev)) _a = prev, prev = _a.prev;
                return prev;
            }
            exports.prevElementSibling = prevElementSibling;
        },
        "./node_modules/entities/lib/decode.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.decodeHTML = exports.decodeHTMLStrict = exports.decodeXML = void 0;
            var entities_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/entities.json"));
            var legacy_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/legacy.json"));
            var xml_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/xml.json"));
            var decode_codepoint_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/decode_codepoint.js"));
            var strictEntityRe = /&(?:[a-zA-Z0-9]+|#[xX][\da-fA-F]+|#\d+);/g;
            exports.decodeXML = getStrictDecoder(xml_json_1.default);
            exports.decodeHTMLStrict = getStrictDecoder(entities_json_1.default);
            function getStrictDecoder(map) {
                var replace = getReplacer(map);
                return function(str) {
                    return String(str).replace(strictEntityRe, replace);
                };
            }
            var sorter = function(a, b) {
                return a < b ? 1 : -1;
            };
            exports.decodeHTML = function() {
                var legacy = Object.keys(legacy_json_1.default).sort(sorter);
                var keys = Object.keys(entities_json_1.default).sort(sorter);
                for (var i = 0, j = 0; i < keys.length; i++) {
                    if (legacy[j] === keys[i]) {
                        keys[i] += ";?";
                        j++;
                    } else {
                        keys[i] += ";";
                    }
                }
                var re = new RegExp("&(?:" + keys.join("|") + "|#[xX][\\da-fA-F]+;?|#\\d+;?)", "g");
                var replace = getReplacer(entities_json_1.default);
                function replacer(str) {
                    if (str.substr(-1) !== ";") str += ";";
                    return replace(str);
                }
                return function(str) {
                    return String(str).replace(re, replacer);
                };
            }();
            function getReplacer(map) {
                return function replace(str) {
                    if (str.charAt(1) === "#") {
                        var secondChar = str.charAt(2);
                        if (secondChar === "X" || secondChar === "x") {
                            return decode_codepoint_1.default(parseInt(str.substr(3), 16));
                        }
                        return decode_codepoint_1.default(parseInt(str.substr(2), 10));
                    }
                    return map[str.slice(1, -1)] || str;
                };
            }
        },
        "./node_modules/entities/lib/decode_codepoint.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var decode_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/decode.json"));
            var fromCodePoint = String.fromCodePoint || function(codePoint) {
                var output = "";
                if (codePoint > 65535) {
                    codePoint -= 65536;
                    output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
                    codePoint = 56320 | codePoint & 1023;
                }
                output += String.fromCharCode(codePoint);
                return output;
            };
            function decodeCodePoint(codePoint) {
                if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
                    return "�";
                }
                if (codePoint in decode_json_1.default) {
                    codePoint = decode_json_1.default[codePoint];
                }
                return fromCodePoint(codePoint);
            }
            exports["default"] = decodeCodePoint;
        },
        "./node_modules/entities/lib/encode.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.escapeUTF8 = exports.escape = exports.encodeNonAsciiHTML = exports.encodeHTML = exports.encodeXML = void 0;
            var xml_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/xml.json"));
            var inverseXML = getInverseObj(xml_json_1.default);
            var xmlReplacer = getInverseReplacer(inverseXML);
            exports.encodeXML = getASCIIEncoder(inverseXML);
            var entities_json_1 = __importDefault(__webpack_require__("./node_modules/entities/lib/maps/entities.json"));
            var inverseHTML = getInverseObj(entities_json_1.default);
            var htmlReplacer = getInverseReplacer(inverseHTML);
            exports.encodeHTML = getInverse(inverseHTML, htmlReplacer);
            exports.encodeNonAsciiHTML = getASCIIEncoder(inverseHTML);
            function getInverseObj(obj) {
                return Object.keys(obj).sort().reduce((function(inverse, name) {
                    inverse[obj[name]] = "&" + name + ";";
                    return inverse;
                }), {});
            }
            function getInverseReplacer(inverse) {
                var single = [];
                var multiple = [];
                for (var _i = 0, _a = Object.keys(inverse); _i < _a.length; _i++) {
                    var k = _a[_i];
                    if (k.length === 1) {
                        single.push("\\" + k);
                    } else {
                        multiple.push(k);
                    }
                }
                single.sort();
                for (var start = 0; start < single.length - 1; start++) {
                    var end = start;
                    while (end < single.length - 1 && single[end].charCodeAt(1) + 1 === single[end + 1].charCodeAt(1)) {
                        end += 1;
                    }
                    var count = 1 + end - start;
                    if (count < 3) continue;
                    single.splice(start, count, single[start] + "-" + single[end]);
                }
                multiple.unshift("[" + single.join("") + "]");
                return new RegExp(multiple.join("|"), "g");
            }
            var reNonASCII = /(?:[\x80-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g;
            var getCodePoint = String.prototype.codePointAt != null ? function(str) {
                return str.codePointAt(0);
            } : function(c) {
                return (c.charCodeAt(0) - 55296) * 1024 + c.charCodeAt(1) - 56320 + 65536;
            };
            function singleCharReplacer(c) {
                return "&#x" + (c.length > 1 ? getCodePoint(c) : c.charCodeAt(0)).toString(16).toUpperCase() + ";";
            }
            function getInverse(inverse, re) {
                return function(data) {
                    return data.replace(re, (function(name) {
                        return inverse[name];
                    })).replace(reNonASCII, singleCharReplacer);
                };
            }
            var reEscapeChars = new RegExp(xmlReplacer.source + "|" + reNonASCII.source, "g");
            function escape(data) {
                return data.replace(reEscapeChars, singleCharReplacer);
            }
            exports.escape = escape;
            function escapeUTF8(data) {
                return data.replace(xmlReplacer, singleCharReplacer);
            }
            exports.escapeUTF8 = escapeUTF8;
            function getASCIIEncoder(obj) {
                return function(data) {
                    return data.replace(reEscapeChars, (function(c) {
                        return obj[c] || singleCharReplacer(c);
                    }));
                };
            }
        },
        "./node_modules/entities/lib/index.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.decodeXMLStrict = exports.decodeHTML5Strict = exports.decodeHTML4Strict = exports.decodeHTML5 = exports.decodeHTML4 = exports.decodeHTMLStrict = exports.decodeHTML = exports.decodeXML = exports.encodeHTML5 = exports.encodeHTML4 = exports.escapeUTF8 = exports.escape = exports.encodeNonAsciiHTML = exports.encodeHTML = exports.encodeXML = exports.encode = exports.decodeStrict = exports.decode = void 0;
            var decode_1 = __webpack_require__("./node_modules/entities/lib/decode.js");
            var encode_1 = __webpack_require__("./node_modules/entities/lib/encode.js");
            function decode(data, level) {
                return (!level || level <= 0 ? decode_1.decodeXML : decode_1.decodeHTML)(data);
            }
            exports.decode = decode;
            function decodeStrict(data, level) {
                return (!level || level <= 0 ? decode_1.decodeXML : decode_1.decodeHTMLStrict)(data);
            }
            exports.decodeStrict = decodeStrict;
            function encode(data, level) {
                return (!level || level <= 0 ? encode_1.encodeXML : encode_1.encodeHTML)(data);
            }
            exports.encode = encode;
            var encode_2 = __webpack_require__("./node_modules/entities/lib/encode.js");
            Object.defineProperty(exports, "encodeXML", {
                enumerable: true,
                get: function() {
                    return encode_2.encodeXML;
                }
            });
            Object.defineProperty(exports, "encodeHTML", {
                enumerable: true,
                get: function() {
                    return encode_2.encodeHTML;
                }
            });
            Object.defineProperty(exports, "encodeNonAsciiHTML", {
                enumerable: true,
                get: function() {
                    return encode_2.encodeNonAsciiHTML;
                }
            });
            Object.defineProperty(exports, "escape", {
                enumerable: true,
                get: function() {
                    return encode_2.escape;
                }
            });
            Object.defineProperty(exports, "escapeUTF8", {
                enumerable: true,
                get: function() {
                    return encode_2.escapeUTF8;
                }
            });
            Object.defineProperty(exports, "encodeHTML4", {
                enumerable: true,
                get: function() {
                    return encode_2.encodeHTML;
                }
            });
            Object.defineProperty(exports, "encodeHTML5", {
                enumerable: true,
                get: function() {
                    return encode_2.encodeHTML;
                }
            });
            var decode_2 = __webpack_require__("./node_modules/entities/lib/decode.js");
            Object.defineProperty(exports, "decodeXML", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeXML;
                }
            });
            Object.defineProperty(exports, "decodeHTML", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTML;
                }
            });
            Object.defineProperty(exports, "decodeHTMLStrict", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTMLStrict;
                }
            });
            Object.defineProperty(exports, "decodeHTML4", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTML;
                }
            });
            Object.defineProperty(exports, "decodeHTML5", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTML;
                }
            });
            Object.defineProperty(exports, "decodeHTML4Strict", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTMLStrict;
                }
            });
            Object.defineProperty(exports, "decodeHTML5Strict", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeHTMLStrict;
                }
            });
            Object.defineProperty(exports, "decodeXMLStrict", {
                enumerable: true,
                get: function() {
                    return decode_2.decodeXML;
                }
            });
        },
        "./node_modules/he/he.js": function(module, exports, __webpack_require__) {
            module = __webpack_require__.nmd(module);
            var __WEBPACK_AMD_DEFINE_RESULT__;
            (function(root) {
                var freeExports = true && exports;
                var freeModule = true && module && module.exports == freeExports && module;
                var freeGlobal = typeof globalThis == "object" && globalThis;
                if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
                    root = freeGlobal;
                }
                var regexAstralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
                var regexAsciiWhitelist = /[\x01-\x7F]/g;
                var regexBmpWhitelist = /[\x01-\t\x0B\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g;
                var regexEncodeNonAscii = /<\u20D2|=\u20E5|>\u20D2|\u205F\u200A|\u219D\u0338|\u2202\u0338|\u2220\u20D2|\u2229\uFE00|\u222A\uFE00|\u223C\u20D2|\u223D\u0331|\u223E\u0333|\u2242\u0338|\u224B\u0338|\u224D\u20D2|\u224E\u0338|\u224F\u0338|\u2250\u0338|\u2261\u20E5|\u2264\u20D2|\u2265\u20D2|\u2266\u0338|\u2267\u0338|\u2268\uFE00|\u2269\uFE00|\u226A\u0338|\u226A\u20D2|\u226B\u0338|\u226B\u20D2|\u227F\u0338|\u2282\u20D2|\u2283\u20D2|\u228A\uFE00|\u228B\uFE00|\u228F\u0338|\u2290\u0338|\u2293\uFE00|\u2294\uFE00|\u22B4\u20D2|\u22B5\u20D2|\u22D8\u0338|\u22D9\u0338|\u22DA\uFE00|\u22DB\uFE00|\u22F5\u0338|\u22F9\u0338|\u2933\u0338|\u29CF\u0338|\u29D0\u0338|\u2A6D\u0338|\u2A70\u0338|\u2A7D\u0338|\u2A7E\u0338|\u2AA1\u0338|\u2AA2\u0338|\u2AAC\uFE00|\u2AAD\uFE00|\u2AAF\u0338|\u2AB0\u0338|\u2AC5\u0338|\u2AC6\u0338|\u2ACB\uFE00|\u2ACC\uFE00|\u2AFD\u20E5|[\xA0-\u0113\u0116-\u0122\u0124-\u012B\u012E-\u014D\u0150-\u017E\u0192\u01B5\u01F5\u0237\u02C6\u02C7\u02D8-\u02DD\u0311\u0391-\u03A1\u03A3-\u03A9\u03B1-\u03C9\u03D1\u03D2\u03D5\u03D6\u03DC\u03DD\u03F0\u03F1\u03F5\u03F6\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E\u045F\u2002-\u2005\u2007-\u2010\u2013-\u2016\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2025\u2026\u2030-\u2035\u2039\u203A\u203E\u2041\u2043\u2044\u204F\u2057\u205F-\u2063\u20AC\u20DB\u20DC\u2102\u2105\u210A-\u2113\u2115-\u211E\u2122\u2124\u2127-\u2129\u212C\u212D\u212F-\u2131\u2133-\u2138\u2145-\u2148\u2153-\u215E\u2190-\u219B\u219D-\u21A7\u21A9-\u21AE\u21B0-\u21B3\u21B5-\u21B7\u21BA-\u21DB\u21DD\u21E4\u21E5\u21F5\u21FD-\u2205\u2207-\u2209\u220B\u220C\u220F-\u2214\u2216-\u2218\u221A\u221D-\u2238\u223A-\u2257\u2259\u225A\u225C\u225F-\u2262\u2264-\u228B\u228D-\u229B\u229D-\u22A5\u22A7-\u22B0\u22B2-\u22BB\u22BD-\u22DB\u22DE-\u22E3\u22E6-\u22F7\u22F9-\u22FE\u2305\u2306\u2308-\u2310\u2312\u2313\u2315\u2316\u231C-\u231F\u2322\u2323\u232D\u232E\u2336\u233D\u233F\u237C\u23B0\u23B1\u23B4-\u23B6\u23DC-\u23DF\u23E2\u23E7\u2423\u24C8\u2500\u2502\u250C\u2510\u2514\u2518\u251C\u2524\u252C\u2534\u253C\u2550-\u256C\u2580\u2584\u2588\u2591-\u2593\u25A1\u25AA\u25AB\u25AD\u25AE\u25B1\u25B3-\u25B5\u25B8\u25B9\u25BD-\u25BF\u25C2\u25C3\u25CA\u25CB\u25EC\u25EF\u25F8-\u25FC\u2605\u2606\u260E\u2640\u2642\u2660\u2663\u2665\u2666\u266A\u266D-\u266F\u2713\u2717\u2720\u2736\u2758\u2772\u2773\u27C8\u27C9\u27E6-\u27ED\u27F5-\u27FA\u27FC\u27FF\u2902-\u2905\u290C-\u2913\u2916\u2919-\u2920\u2923-\u292A\u2933\u2935-\u2939\u293C\u293D\u2945\u2948-\u294B\u294E-\u2976\u2978\u2979\u297B-\u297F\u2985\u2986\u298B-\u2996\u299A\u299C\u299D\u29A4-\u29B7\u29B9\u29BB\u29BC\u29BE-\u29C5\u29C9\u29CD-\u29D0\u29DC-\u29DE\u29E3-\u29E5\u29EB\u29F4\u29F6\u2A00-\u2A02\u2A04\u2A06\u2A0C\u2A0D\u2A10-\u2A17\u2A22-\u2A27\u2A29\u2A2A\u2A2D-\u2A31\u2A33-\u2A3C\u2A3F\u2A40\u2A42-\u2A4D\u2A50\u2A53-\u2A58\u2A5A-\u2A5D\u2A5F\u2A66\u2A6A\u2A6D-\u2A75\u2A77-\u2A9A\u2A9D-\u2AA2\u2AA4-\u2AB0\u2AB3-\u2AC8\u2ACB\u2ACC\u2ACF-\u2ADB\u2AE4\u2AE6-\u2AE9\u2AEB-\u2AF3\u2AFD\uFB00-\uFB04]|\uD835[\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDD6B]/g;
                var encodeMap = {
                    "­": "shy",
                    "‌": "zwnj",
                    "‍": "zwj",
                    "‎": "lrm",
                    "⁣": "ic",
                    "⁢": "it",
                    "⁡": "af",
                    "‏": "rlm",
                    "​": "ZeroWidthSpace",
                    "⁠": "NoBreak",
                    "̑": "DownBreve",
                    "⃛": "tdot",
                    "⃜": "DotDot",
                    "\t": "Tab",
                    "\n": "NewLine",
                    " ": "puncsp",
                    " ": "MediumSpace",
                    " ": "thinsp",
                    " ": "hairsp",
                    " ": "emsp13",
                    " ": "ensp",
                    " ": "emsp14",
                    " ": "emsp",
                    " ": "numsp",
                    " ": "nbsp",
                    "  ": "ThickSpace",
                    "‾": "oline",
                    _: "lowbar",
                    "‐": "dash",
                    "–": "ndash",
                    "—": "mdash",
                    "―": "horbar",
                    ",": "comma",
                    ";": "semi",
                    "⁏": "bsemi",
                    ":": "colon",
                    "⩴": "Colone",
                    "!": "excl",
                    "¡": "iexcl",
                    "?": "quest",
                    "¿": "iquest",
                    ".": "period",
                    "‥": "nldr",
                    "…": "mldr",
                    "·": "middot",
                    "'": "apos",
                    "‘": "lsquo",
                    "’": "rsquo",
                    "‚": "sbquo",
                    "‹": "lsaquo",
                    "›": "rsaquo",
                    '"': "quot",
                    "“": "ldquo",
                    "”": "rdquo",
                    "„": "bdquo",
                    "«": "laquo",
                    "»": "raquo",
                    "(": "lpar",
                    ")": "rpar",
                    "[": "lsqb",
                    "]": "rsqb",
                    "{": "lcub",
                    "}": "rcub",
                    "⌈": "lceil",
                    "⌉": "rceil",
                    "⌊": "lfloor",
                    "⌋": "rfloor",
                    "⦅": "lopar",
                    "⦆": "ropar",
                    "⦋": "lbrke",
                    "⦌": "rbrke",
                    "⦍": "lbrkslu",
                    "⦎": "rbrksld",
                    "⦏": "lbrksld",
                    "⦐": "rbrkslu",
                    "⦑": "langd",
                    "⦒": "rangd",
                    "⦓": "lparlt",
                    "⦔": "rpargt",
                    "⦕": "gtlPar",
                    "⦖": "ltrPar",
                    "⟦": "lobrk",
                    "⟧": "robrk",
                    "⟨": "lang",
                    "⟩": "rang",
                    "⟪": "Lang",
                    "⟫": "Rang",
                    "⟬": "loang",
                    "⟭": "roang",
                    "❲": "lbbrk",
                    "❳": "rbbrk",
                    "‖": "Vert",
                    "§": "sect",
                    "¶": "para",
                    "@": "commat",
                    "*": "ast",
                    "/": "sol",
                    undefined: null,
                    "&": "amp",
                    "#": "num",
                    "%": "percnt",
                    "‰": "permil",
                    "‱": "pertenk",
                    "†": "dagger",
                    "‡": "Dagger",
                    "•": "bull",
                    "⁃": "hybull",
                    "′": "prime",
                    "″": "Prime",
                    "‴": "tprime",
                    "⁗": "qprime",
                    "‵": "bprime",
                    "⁁": "caret",
                    "`": "grave",
                    "´": "acute",
                    "˜": "tilde",
                    "^": "Hat",
                    "¯": "macr",
                    "˘": "breve",
                    "˙": "dot",
                    "¨": "die",
                    "˚": "ring",
                    "˝": "dblac",
                    "¸": "cedil",
                    "˛": "ogon",
                    ˆ: "circ",
                    ˇ: "caron",
                    "°": "deg",
                    "©": "copy",
                    "®": "reg",
                    "℗": "copysr",
                    ℘: "wp",
                    "℞": "rx",
                    "℧": "mho",
                    "℩": "iiota",
                    "←": "larr",
                    "↚": "nlarr",
                    "→": "rarr",
                    "↛": "nrarr",
                    "↑": "uarr",
                    "↓": "darr",
                    "↔": "harr",
                    "↮": "nharr",
                    "↕": "varr",
                    "↖": "nwarr",
                    "↗": "nearr",
                    "↘": "searr",
                    "↙": "swarr",
                    "↝": "rarrw",
                    "↝̸": "nrarrw",
                    "↞": "Larr",
                    "↟": "Uarr",
                    "↠": "Rarr",
                    "↡": "Darr",
                    "↢": "larrtl",
                    "↣": "rarrtl",
                    "↤": "mapstoleft",
                    "↥": "mapstoup",
                    "↦": "map",
                    "↧": "mapstodown",
                    "↩": "larrhk",
                    "↪": "rarrhk",
                    "↫": "larrlp",
                    "↬": "rarrlp",
                    "↭": "harrw",
                    "↰": "lsh",
                    "↱": "rsh",
                    "↲": "ldsh",
                    "↳": "rdsh",
                    "↵": "crarr",
                    "↶": "cularr",
                    "↷": "curarr",
                    "↺": "olarr",
                    "↻": "orarr",
                    "↼": "lharu",
                    "↽": "lhard",
                    "↾": "uharr",
                    "↿": "uharl",
                    "⇀": "rharu",
                    "⇁": "rhard",
                    "⇂": "dharr",
                    "⇃": "dharl",
                    "⇄": "rlarr",
                    "⇅": "udarr",
                    "⇆": "lrarr",
                    "⇇": "llarr",
                    "⇈": "uuarr",
                    "⇉": "rrarr",
                    "⇊": "ddarr",
                    "⇋": "lrhar",
                    "⇌": "rlhar",
                    "⇐": "lArr",
                    "⇍": "nlArr",
                    "⇑": "uArr",
                    "⇒": "rArr",
                    "⇏": "nrArr",
                    "⇓": "dArr",
                    "⇔": "iff",
                    "⇎": "nhArr",
                    "⇕": "vArr",
                    "⇖": "nwArr",
                    "⇗": "neArr",
                    "⇘": "seArr",
                    "⇙": "swArr",
                    "⇚": "lAarr",
                    "⇛": "rAarr",
                    "⇝": "zigrarr",
                    "⇤": "larrb",
                    "⇥": "rarrb",
                    "⇵": "duarr",
                    "⇽": "loarr",
                    "⇾": "roarr",
                    "⇿": "hoarr",
                    "∀": "forall",
                    "∁": "comp",
                    "∂": "part",
                    "∂̸": "npart",
                    "∃": "exist",
                    "∄": "nexist",
                    "∅": "empty",
                    "∇": "Del",
                    "∈": "in",
                    "∉": "notin",
                    "∋": "ni",
                    "∌": "notni",
                    "϶": "bepsi",
                    "∏": "prod",
                    "∐": "coprod",
                    "∑": "sum",
                    "+": "plus",
                    "±": "pm",
                    "÷": "div",
                    "×": "times",
                    "<": "lt",
                    "≮": "nlt",
                    "<⃒": "nvlt",
                    "=": "equals",
                    "≠": "ne",
                    "=⃥": "bne",
                    "⩵": "Equal",
                    ">": "gt",
                    "≯": "ngt",
                    ">⃒": "nvgt",
                    "¬": "not",
                    "|": "vert",
                    "¦": "brvbar",
                    "−": "minus",
                    "∓": "mp",
                    "∔": "plusdo",
                    "⁄": "frasl",
                    "∖": "setmn",
                    "∗": "lowast",
                    "∘": "compfn",
                    "√": "Sqrt",
                    "∝": "prop",
                    "∞": "infin",
                    "∟": "angrt",
                    "∠": "ang",
                    "∠⃒": "nang",
                    "∡": "angmsd",
                    "∢": "angsph",
                    "∣": "mid",
                    "∤": "nmid",
                    "∥": "par",
                    "∦": "npar",
                    "∧": "and",
                    "∨": "or",
                    "∩": "cap",
                    "∩︀": "caps",
                    "∪": "cup",
                    "∪︀": "cups",
                    "∫": "int",
                    "∬": "Int",
                    "∭": "tint",
                    "⨌": "qint",
                    "∮": "oint",
                    "∯": "Conint",
                    "∰": "Cconint",
                    "∱": "cwint",
                    "∲": "cwconint",
                    "∳": "awconint",
                    "∴": "there4",
                    "∵": "becaus",
                    "∶": "ratio",
                    "∷": "Colon",
                    "∸": "minusd",
                    "∺": "mDDot",
                    "∻": "homtht",
                    "∼": "sim",
                    "≁": "nsim",
                    "∼⃒": "nvsim",
                    "∽": "bsim",
                    "∽̱": "race",
                    "∾": "ac",
                    "∾̳": "acE",
                    "∿": "acd",
                    "≀": "wr",
                    "≂": "esim",
                    "≂̸": "nesim",
                    "≃": "sime",
                    "≄": "nsime",
                    "≅": "cong",
                    "≇": "ncong",
                    "≆": "simne",
                    "≈": "ap",
                    "≉": "nap",
                    "≊": "ape",
                    "≋": "apid",
                    "≋̸": "napid",
                    "≌": "bcong",
                    "≍": "CupCap",
                    "≭": "NotCupCap",
                    "≍⃒": "nvap",
                    "≎": "bump",
                    "≎̸": "nbump",
                    "≏": "bumpe",
                    "≏̸": "nbumpe",
                    "≐": "doteq",
                    "≐̸": "nedot",
                    "≑": "eDot",
                    "≒": "efDot",
                    "≓": "erDot",
                    "≔": "colone",
                    "≕": "ecolon",
                    "≖": "ecir",
                    "≗": "cire",
                    "≙": "wedgeq",
                    "≚": "veeeq",
                    "≜": "trie",
                    "≟": "equest",
                    "≡": "equiv",
                    "≢": "nequiv",
                    "≡⃥": "bnequiv",
                    "≤": "le",
                    "≰": "nle",
                    "≤⃒": "nvle",
                    "≥": "ge",
                    "≱": "nge",
                    "≥⃒": "nvge",
                    "≦": "lE",
                    "≦̸": "nlE",
                    "≧": "gE",
                    "≧̸": "ngE",
                    "≨︀": "lvnE",
                    "≨": "lnE",
                    "≩": "gnE",
                    "≩︀": "gvnE",
                    "≪": "ll",
                    "≪̸": "nLtv",
                    "≪⃒": "nLt",
                    "≫": "gg",
                    "≫̸": "nGtv",
                    "≫⃒": "nGt",
                    "≬": "twixt",
                    "≲": "lsim",
                    "≴": "nlsim",
                    "≳": "gsim",
                    "≵": "ngsim",
                    "≶": "lg",
                    "≸": "ntlg",
                    "≷": "gl",
                    "≹": "ntgl",
                    "≺": "pr",
                    "⊀": "npr",
                    "≻": "sc",
                    "⊁": "nsc",
                    "≼": "prcue",
                    "⋠": "nprcue",
                    "≽": "sccue",
                    "⋡": "nsccue",
                    "≾": "prsim",
                    "≿": "scsim",
                    "≿̸": "NotSucceedsTilde",
                    "⊂": "sub",
                    "⊄": "nsub",
                    "⊂⃒": "vnsub",
                    "⊃": "sup",
                    "⊅": "nsup",
                    "⊃⃒": "vnsup",
                    "⊆": "sube",
                    "⊈": "nsube",
                    "⊇": "supe",
                    "⊉": "nsupe",
                    "⊊︀": "vsubne",
                    "⊊": "subne",
                    "⊋︀": "vsupne",
                    "⊋": "supne",
                    "⊍": "cupdot",
                    "⊎": "uplus",
                    "⊏": "sqsub",
                    "⊏̸": "NotSquareSubset",
                    "⊐": "sqsup",
                    "⊐̸": "NotSquareSuperset",
                    "⊑": "sqsube",
                    "⋢": "nsqsube",
                    "⊒": "sqsupe",
                    "⋣": "nsqsupe",
                    "⊓": "sqcap",
                    "⊓︀": "sqcaps",
                    "⊔": "sqcup",
                    "⊔︀": "sqcups",
                    "⊕": "oplus",
                    "⊖": "ominus",
                    "⊗": "otimes",
                    "⊘": "osol",
                    "⊙": "odot",
                    "⊚": "ocir",
                    "⊛": "oast",
                    "⊝": "odash",
                    "⊞": "plusb",
                    "⊟": "minusb",
                    "⊠": "timesb",
                    "⊡": "sdotb",
                    "⊢": "vdash",
                    "⊬": "nvdash",
                    "⊣": "dashv",
                    "⊤": "top",
                    "⊥": "bot",
                    "⊧": "models",
                    "⊨": "vDash",
                    "⊭": "nvDash",
                    "⊩": "Vdash",
                    "⊮": "nVdash",
                    "⊪": "Vvdash",
                    "⊫": "VDash",
                    "⊯": "nVDash",
                    "⊰": "prurel",
                    "⊲": "vltri",
                    "⋪": "nltri",
                    "⊳": "vrtri",
                    "⋫": "nrtri",
                    "⊴": "ltrie",
                    "⋬": "nltrie",
                    "⊴⃒": "nvltrie",
                    "⊵": "rtrie",
                    "⋭": "nrtrie",
                    "⊵⃒": "nvrtrie",
                    "⊶": "origof",
                    "⊷": "imof",
                    "⊸": "mumap",
                    "⊹": "hercon",
                    "⊺": "intcal",
                    "⊻": "veebar",
                    "⊽": "barvee",
                    "⊾": "angrtvb",
                    "⊿": "lrtri",
                    "⋀": "Wedge",
                    "⋁": "Vee",
                    "⋂": "xcap",
                    "⋃": "xcup",
                    "⋄": "diam",
                    "⋅": "sdot",
                    "⋆": "Star",
                    "⋇": "divonx",
                    "⋈": "bowtie",
                    "⋉": "ltimes",
                    "⋊": "rtimes",
                    "⋋": "lthree",
                    "⋌": "rthree",
                    "⋍": "bsime",
                    "⋎": "cuvee",
                    "⋏": "cuwed",
                    "⋐": "Sub",
                    "⋑": "Sup",
                    "⋒": "Cap",
                    "⋓": "Cup",
                    "⋔": "fork",
                    "⋕": "epar",
                    "⋖": "ltdot",
                    "⋗": "gtdot",
                    "⋘": "Ll",
                    "⋘̸": "nLl",
                    "⋙": "Gg",
                    "⋙̸": "nGg",
                    "⋚︀": "lesg",
                    "⋚": "leg",
                    "⋛": "gel",
                    "⋛︀": "gesl",
                    "⋞": "cuepr",
                    "⋟": "cuesc",
                    "⋦": "lnsim",
                    "⋧": "gnsim",
                    "⋨": "prnsim",
                    "⋩": "scnsim",
                    "⋮": "vellip",
                    "⋯": "ctdot",
                    "⋰": "utdot",
                    "⋱": "dtdot",
                    "⋲": "disin",
                    "⋳": "isinsv",
                    "⋴": "isins",
                    "⋵": "isindot",
                    "⋵̸": "notindot",
                    "⋶": "notinvc",
                    "⋷": "notinvb",
                    "⋹": "isinE",
                    "⋹̸": "notinE",
                    "⋺": "nisd",
                    "⋻": "xnis",
                    "⋼": "nis",
                    "⋽": "notnivc",
                    "⋾": "notnivb",
                    "⌅": "barwed",
                    "⌆": "Barwed",
                    "⌌": "drcrop",
                    "⌍": "dlcrop",
                    "⌎": "urcrop",
                    "⌏": "ulcrop",
                    "⌐": "bnot",
                    "⌒": "profline",
                    "⌓": "profsurf",
                    "⌕": "telrec",
                    "⌖": "target",
                    "⌜": "ulcorn",
                    "⌝": "urcorn",
                    "⌞": "dlcorn",
                    "⌟": "drcorn",
                    "⌢": "frown",
                    "⌣": "smile",
                    "⌭": "cylcty",
                    "⌮": "profalar",
                    "⌶": "topbot",
                    "⌽": "ovbar",
                    "⌿": "solbar",
                    "⍼": "angzarr",
                    "⎰": "lmoust",
                    "⎱": "rmoust",
                    "⎴": "tbrk",
                    "⎵": "bbrk",
                    "⎶": "bbrktbrk",
                    "⏜": "OverParenthesis",
                    "⏝": "UnderParenthesis",
                    "⏞": "OverBrace",
                    "⏟": "UnderBrace",
                    "⏢": "trpezium",
                    "⏧": "elinters",
                    "␣": "blank",
                    "─": "boxh",
                    "│": "boxv",
                    "┌": "boxdr",
                    "┐": "boxdl",
                    "└": "boxur",
                    "┘": "boxul",
                    "├": "boxvr",
                    "┤": "boxvl",
                    "┬": "boxhd",
                    "┴": "boxhu",
                    "┼": "boxvh",
                    "═": "boxH",
                    "║": "boxV",
                    "╒": "boxdR",
                    "╓": "boxDr",
                    "╔": "boxDR",
                    "╕": "boxdL",
                    "╖": "boxDl",
                    "╗": "boxDL",
                    "╘": "boxuR",
                    "╙": "boxUr",
                    "╚": "boxUR",
                    "╛": "boxuL",
                    "╜": "boxUl",
                    "╝": "boxUL",
                    "╞": "boxvR",
                    "╟": "boxVr",
                    "╠": "boxVR",
                    "╡": "boxvL",
                    "╢": "boxVl",
                    "╣": "boxVL",
                    "╤": "boxHd",
                    "╥": "boxhD",
                    "╦": "boxHD",
                    "╧": "boxHu",
                    "╨": "boxhU",
                    "╩": "boxHU",
                    "╪": "boxvH",
                    "╫": "boxVh",
                    "╬": "boxVH",
                    "▀": "uhblk",
                    "▄": "lhblk",
                    "█": "block",
                    "░": "blk14",
                    "▒": "blk12",
                    "▓": "blk34",
                    "□": "squ",
                    "▪": "squf",
                    "▫": "EmptyVerySmallSquare",
                    "▭": "rect",
                    "▮": "marker",
                    "▱": "fltns",
                    "△": "xutri",
                    "▴": "utrif",
                    "▵": "utri",
                    "▸": "rtrif",
                    "▹": "rtri",
                    "▽": "xdtri",
                    "▾": "dtrif",
                    "▿": "dtri",
                    "◂": "ltrif",
                    "◃": "ltri",
                    "◊": "loz",
                    "○": "cir",
                    "◬": "tridot",
                    "◯": "xcirc",
                    "◸": "ultri",
                    "◹": "urtri",
                    "◺": "lltri",
                    "◻": "EmptySmallSquare",
                    "◼": "FilledSmallSquare",
                    "★": "starf",
                    "☆": "star",
                    "☎": "phone",
                    "♀": "female",
                    "♂": "male",
                    "♠": "spades",
                    "♣": "clubs",
                    "♥": "hearts",
                    "♦": "diams",
                    "♪": "sung",
                    "✓": "check",
                    "✗": "cross",
                    "✠": "malt",
                    "✶": "sext",
                    "❘": "VerticalSeparator",
                    "⟈": "bsolhsub",
                    "⟉": "suphsol",
                    "⟵": "xlarr",
                    "⟶": "xrarr",
                    "⟷": "xharr",
                    "⟸": "xlArr",
                    "⟹": "xrArr",
                    "⟺": "xhArr",
                    "⟼": "xmap",
                    "⟿": "dzigrarr",
                    "⤂": "nvlArr",
                    "⤃": "nvrArr",
                    "⤄": "nvHarr",
                    "⤅": "Map",
                    "⤌": "lbarr",
                    "⤍": "rbarr",
                    "⤎": "lBarr",
                    "⤏": "rBarr",
                    "⤐": "RBarr",
                    "⤑": "DDotrahd",
                    "⤒": "UpArrowBar",
                    "⤓": "DownArrowBar",
                    "⤖": "Rarrtl",
                    "⤙": "latail",
                    "⤚": "ratail",
                    "⤛": "lAtail",
                    "⤜": "rAtail",
                    "⤝": "larrfs",
                    "⤞": "rarrfs",
                    "⤟": "larrbfs",
                    "⤠": "rarrbfs",
                    "⤣": "nwarhk",
                    "⤤": "nearhk",
                    "⤥": "searhk",
                    "⤦": "swarhk",
                    "⤧": "nwnear",
                    "⤨": "toea",
                    "⤩": "tosa",
                    "⤪": "swnwar",
                    "⤳": "rarrc",
                    "⤳̸": "nrarrc",
                    "⤵": "cudarrr",
                    "⤶": "ldca",
                    "⤷": "rdca",
                    "⤸": "cudarrl",
                    "⤹": "larrpl",
                    "⤼": "curarrm",
                    "⤽": "cularrp",
                    "⥅": "rarrpl",
                    "⥈": "harrcir",
                    "⥉": "Uarrocir",
                    "⥊": "lurdshar",
                    "⥋": "ldrushar",
                    "⥎": "LeftRightVector",
                    "⥏": "RightUpDownVector",
                    "⥐": "DownLeftRightVector",
                    "⥑": "LeftUpDownVector",
                    "⥒": "LeftVectorBar",
                    "⥓": "RightVectorBar",
                    "⥔": "RightUpVectorBar",
                    "⥕": "RightDownVectorBar",
                    "⥖": "DownLeftVectorBar",
                    "⥗": "DownRightVectorBar",
                    "⥘": "LeftUpVectorBar",
                    "⥙": "LeftDownVectorBar",
                    "⥚": "LeftTeeVector",
                    "⥛": "RightTeeVector",
                    "⥜": "RightUpTeeVector",
                    "⥝": "RightDownTeeVector",
                    "⥞": "DownLeftTeeVector",
                    "⥟": "DownRightTeeVector",
                    "⥠": "LeftUpTeeVector",
                    "⥡": "LeftDownTeeVector",
                    "⥢": "lHar",
                    "⥣": "uHar",
                    "⥤": "rHar",
                    "⥥": "dHar",
                    "⥦": "luruhar",
                    "⥧": "ldrdhar",
                    "⥨": "ruluhar",
                    "⥩": "rdldhar",
                    "⥪": "lharul",
                    "⥫": "llhard",
                    "⥬": "rharul",
                    "⥭": "lrhard",
                    "⥮": "udhar",
                    "⥯": "duhar",
                    "⥰": "RoundImplies",
                    "⥱": "erarr",
                    "⥲": "simrarr",
                    "⥳": "larrsim",
                    "⥴": "rarrsim",
                    "⥵": "rarrap",
                    "⥶": "ltlarr",
                    "⥸": "gtrarr",
                    "⥹": "subrarr",
                    "⥻": "suplarr",
                    "⥼": "lfisht",
                    "⥽": "rfisht",
                    "⥾": "ufisht",
                    "⥿": "dfisht",
                    "⦚": "vzigzag",
                    "⦜": "vangrt",
                    "⦝": "angrtvbd",
                    "⦤": "ange",
                    "⦥": "range",
                    "⦦": "dwangle",
                    "⦧": "uwangle",
                    "⦨": "angmsdaa",
                    "⦩": "angmsdab",
                    "⦪": "angmsdac",
                    "⦫": "angmsdad",
                    "⦬": "angmsdae",
                    "⦭": "angmsdaf",
                    "⦮": "angmsdag",
                    "⦯": "angmsdah",
                    "⦰": "bemptyv",
                    "⦱": "demptyv",
                    "⦲": "cemptyv",
                    "⦳": "raemptyv",
                    "⦴": "laemptyv",
                    "⦵": "ohbar",
                    "⦶": "omid",
                    "⦷": "opar",
                    "⦹": "operp",
                    "⦻": "olcross",
                    "⦼": "odsold",
                    "⦾": "olcir",
                    "⦿": "ofcir",
                    "⧀": "olt",
                    "⧁": "ogt",
                    "⧂": "cirscir",
                    "⧃": "cirE",
                    "⧄": "solb",
                    "⧅": "bsolb",
                    "⧉": "boxbox",
                    "⧍": "trisb",
                    "⧎": "rtriltri",
                    "⧏": "LeftTriangleBar",
                    "⧏̸": "NotLeftTriangleBar",
                    "⧐": "RightTriangleBar",
                    "⧐̸": "NotRightTriangleBar",
                    "⧜": "iinfin",
                    "⧝": "infintie",
                    "⧞": "nvinfin",
                    "⧣": "eparsl",
                    "⧤": "smeparsl",
                    "⧥": "eqvparsl",
                    "⧫": "lozf",
                    "⧴": "RuleDelayed",
                    "⧶": "dsol",
                    "⨀": "xodot",
                    "⨁": "xoplus",
                    "⨂": "xotime",
                    "⨄": "xuplus",
                    "⨆": "xsqcup",
                    "⨍": "fpartint",
                    "⨐": "cirfnint",
                    "⨑": "awint",
                    "⨒": "rppolint",
                    "⨓": "scpolint",
                    "⨔": "npolint",
                    "⨕": "pointint",
                    "⨖": "quatint",
                    "⨗": "intlarhk",
                    "⨢": "pluscir",
                    "⨣": "plusacir",
                    "⨤": "simplus",
                    "⨥": "plusdu",
                    "⨦": "plussim",
                    "⨧": "plustwo",
                    "⨩": "mcomma",
                    "⨪": "minusdu",
                    "⨭": "loplus",
                    "⨮": "roplus",
                    "⨯": "Cross",
                    "⨰": "timesd",
                    "⨱": "timesbar",
                    "⨳": "smashp",
                    "⨴": "lotimes",
                    "⨵": "rotimes",
                    "⨶": "otimesas",
                    "⨷": "Otimes",
                    "⨸": "odiv",
                    "⨹": "triplus",
                    "⨺": "triminus",
                    "⨻": "tritime",
                    "⨼": "iprod",
                    "⨿": "amalg",
                    "⩀": "capdot",
                    "⩂": "ncup",
                    "⩃": "ncap",
                    "⩄": "capand",
                    "⩅": "cupor",
                    "⩆": "cupcap",
                    "⩇": "capcup",
                    "⩈": "cupbrcap",
                    "⩉": "capbrcup",
                    "⩊": "cupcup",
                    "⩋": "capcap",
                    "⩌": "ccups",
                    "⩍": "ccaps",
                    "⩐": "ccupssm",
                    "⩓": "And",
                    "⩔": "Or",
                    "⩕": "andand",
                    "⩖": "oror",
                    "⩗": "orslope",
                    "⩘": "andslope",
                    "⩚": "andv",
                    "⩛": "orv",
                    "⩜": "andd",
                    "⩝": "ord",
                    "⩟": "wedbar",
                    "⩦": "sdote",
                    "⩪": "simdot",
                    "⩭": "congdot",
                    "⩭̸": "ncongdot",
                    "⩮": "easter",
                    "⩯": "apacir",
                    "⩰": "apE",
                    "⩰̸": "napE",
                    "⩱": "eplus",
                    "⩲": "pluse",
                    "⩳": "Esim",
                    "⩷": "eDDot",
                    "⩸": "equivDD",
                    "⩹": "ltcir",
                    "⩺": "gtcir",
                    "⩻": "ltquest",
                    "⩼": "gtquest",
                    "⩽": "les",
                    "⩽̸": "nles",
                    "⩾": "ges",
                    "⩾̸": "nges",
                    "⩿": "lesdot",
                    "⪀": "gesdot",
                    "⪁": "lesdoto",
                    "⪂": "gesdoto",
                    "⪃": "lesdotor",
                    "⪄": "gesdotol",
                    "⪅": "lap",
                    "⪆": "gap",
                    "⪇": "lne",
                    "⪈": "gne",
                    "⪉": "lnap",
                    "⪊": "gnap",
                    "⪋": "lEg",
                    "⪌": "gEl",
                    "⪍": "lsime",
                    "⪎": "gsime",
                    "⪏": "lsimg",
                    "⪐": "gsiml",
                    "⪑": "lgE",
                    "⪒": "glE",
                    "⪓": "lesges",
                    "⪔": "gesles",
                    "⪕": "els",
                    "⪖": "egs",
                    "⪗": "elsdot",
                    "⪘": "egsdot",
                    "⪙": "el",
                    "⪚": "eg",
                    "⪝": "siml",
                    "⪞": "simg",
                    "⪟": "simlE",
                    "⪠": "simgE",
                    "⪡": "LessLess",
                    "⪡̸": "NotNestedLessLess",
                    "⪢": "GreaterGreater",
                    "⪢̸": "NotNestedGreaterGreater",
                    "⪤": "glj",
                    "⪥": "gla",
                    "⪦": "ltcc",
                    "⪧": "gtcc",
                    "⪨": "lescc",
                    "⪩": "gescc",
                    "⪪": "smt",
                    "⪫": "lat",
                    "⪬": "smte",
                    "⪬︀": "smtes",
                    "⪭": "late",
                    "⪭︀": "lates",
                    "⪮": "bumpE",
                    "⪯": "pre",
                    "⪯̸": "npre",
                    "⪰": "sce",
                    "⪰̸": "nsce",
                    "⪳": "prE",
                    "⪴": "scE",
                    "⪵": "prnE",
                    "⪶": "scnE",
                    "⪷": "prap",
                    "⪸": "scap",
                    "⪹": "prnap",
                    "⪺": "scnap",
                    "⪻": "Pr",
                    "⪼": "Sc",
                    "⪽": "subdot",
                    "⪾": "supdot",
                    "⪿": "subplus",
                    "⫀": "supplus",
                    "⫁": "submult",
                    "⫂": "supmult",
                    "⫃": "subedot",
                    "⫄": "supedot",
                    "⫅": "subE",
                    "⫅̸": "nsubE",
                    "⫆": "supE",
                    "⫆̸": "nsupE",
                    "⫇": "subsim",
                    "⫈": "supsim",
                    "⫋︀": "vsubnE",
                    "⫋": "subnE",
                    "⫌︀": "vsupnE",
                    "⫌": "supnE",
                    "⫏": "csub",
                    "⫐": "csup",
                    "⫑": "csube",
                    "⫒": "csupe",
                    "⫓": "subsup",
                    "⫔": "supsub",
                    "⫕": "subsub",
                    "⫖": "supsup",
                    "⫗": "suphsub",
                    "⫘": "supdsub",
                    "⫙": "forkv",
                    "⫚": "topfork",
                    "⫛": "mlcp",
                    "⫤": "Dashv",
                    "⫦": "Vdashl",
                    "⫧": "Barv",
                    "⫨": "vBar",
                    "⫩": "vBarv",
                    "⫫": "Vbar",
                    "⫬": "Not",
                    "⫭": "bNot",
                    "⫮": "rnmid",
                    "⫯": "cirmid",
                    "⫰": "midcir",
                    "⫱": "topcir",
                    "⫲": "nhpar",
                    "⫳": "parsim",
                    "⫽": "parsl",
                    "⫽⃥": "nparsl",
                    "♭": "flat",
                    "♮": "natur",
                    "♯": "sharp",
                    "¤": "curren",
                    "¢": "cent",
                    $: "dollar",
                    "£": "pound",
                    "¥": "yen",
                    "€": "euro",
                    "¹": "sup1",
                    "½": "half",
                    "⅓": "frac13",
                    "¼": "frac14",
                    "⅕": "frac15",
                    "⅙": "frac16",
                    "⅛": "frac18",
                    "²": "sup2",
                    "⅔": "frac23",
                    "⅖": "frac25",
                    "³": "sup3",
                    "¾": "frac34",
                    "⅗": "frac35",
                    "⅜": "frac38",
                    "⅘": "frac45",
                    "⅚": "frac56",
                    "⅝": "frac58",
                    "⅞": "frac78",
                    𝒶: "ascr",
                    𝕒: "aopf",
                    𝔞: "afr",
                    𝔸: "Aopf",
                    𝔄: "Afr",
                    𝒜: "Ascr",
                    ª: "ordf",
                    á: "aacute",
                    Á: "Aacute",
                    à: "agrave",
                    À: "Agrave",
                    ă: "abreve",
                    Ă: "Abreve",
                    â: "acirc",
                    Â: "Acirc",
                    å: "aring",
                    Å: "angst",
                    ä: "auml",
                    Ä: "Auml",
                    ã: "atilde",
                    Ã: "Atilde",
                    ą: "aogon",
                    Ą: "Aogon",
                    ā: "amacr",
                    Ā: "Amacr",
                    æ: "aelig",
                    Æ: "AElig",
                    𝒷: "bscr",
                    𝕓: "bopf",
                    𝔟: "bfr",
                    𝔹: "Bopf",
                    ℬ: "Bscr",
                    𝔅: "Bfr",
                    𝔠: "cfr",
                    𝒸: "cscr",
                    𝕔: "copf",
                    ℭ: "Cfr",
                    𝒞: "Cscr",
                    ℂ: "Copf",
                    ć: "cacute",
                    Ć: "Cacute",
                    ĉ: "ccirc",
                    Ĉ: "Ccirc",
                    č: "ccaron",
                    Č: "Ccaron",
                    ċ: "cdot",
                    Ċ: "Cdot",
                    ç: "ccedil",
                    Ç: "Ccedil",
                    "℅": "incare",
                    𝔡: "dfr",
                    ⅆ: "dd",
                    𝕕: "dopf",
                    𝒹: "dscr",
                    𝒟: "Dscr",
                    𝔇: "Dfr",
                    ⅅ: "DD",
                    𝔻: "Dopf",
                    ď: "dcaron",
                    Ď: "Dcaron",
                    đ: "dstrok",
                    Đ: "Dstrok",
                    ð: "eth",
                    Ð: "ETH",
                    ⅇ: "ee",
                    ℯ: "escr",
                    𝔢: "efr",
                    𝕖: "eopf",
                    ℰ: "Escr",
                    𝔈: "Efr",
                    𝔼: "Eopf",
                    é: "eacute",
                    É: "Eacute",
                    è: "egrave",
                    È: "Egrave",
                    ê: "ecirc",
                    Ê: "Ecirc",
                    ě: "ecaron",
                    Ě: "Ecaron",
                    ë: "euml",
                    Ë: "Euml",
                    ė: "edot",
                    Ė: "Edot",
                    ę: "eogon",
                    Ę: "Eogon",
                    ē: "emacr",
                    Ē: "Emacr",
                    𝔣: "ffr",
                    𝕗: "fopf",
                    𝒻: "fscr",
                    𝔉: "Ffr",
                    𝔽: "Fopf",
                    ℱ: "Fscr",
                    ﬀ: "fflig",
                    ﬃ: "ffilig",
                    ﬄ: "ffllig",
                    ﬁ: "filig",
                    fj: "fjlig",
                    ﬂ: "fllig",
                    ƒ: "fnof",
                    ℊ: "gscr",
                    𝕘: "gopf",
                    𝔤: "gfr",
                    𝒢: "Gscr",
                    𝔾: "Gopf",
                    𝔊: "Gfr",
                    ǵ: "gacute",
                    ğ: "gbreve",
                    Ğ: "Gbreve",
                    ĝ: "gcirc",
                    Ĝ: "Gcirc",
                    ġ: "gdot",
                    Ġ: "Gdot",
                    Ģ: "Gcedil",
                    𝔥: "hfr",
                    ℎ: "planckh",
                    𝒽: "hscr",
                    𝕙: "hopf",
                    ℋ: "Hscr",
                    ℌ: "Hfr",
                    ℍ: "Hopf",
                    ĥ: "hcirc",
                    Ĥ: "Hcirc",
                    ℏ: "hbar",
                    ħ: "hstrok",
                    Ħ: "Hstrok",
                    𝕚: "iopf",
                    𝔦: "ifr",
                    𝒾: "iscr",
                    ⅈ: "ii",
                    𝕀: "Iopf",
                    ℐ: "Iscr",
                    ℑ: "Im",
                    í: "iacute",
                    Í: "Iacute",
                    ì: "igrave",
                    Ì: "Igrave",
                    î: "icirc",
                    Î: "Icirc",
                    ï: "iuml",
                    Ï: "Iuml",
                    ĩ: "itilde",
                    Ĩ: "Itilde",
                    İ: "Idot",
                    į: "iogon",
                    Į: "Iogon",
                    ī: "imacr",
                    Ī: "Imacr",
                    ĳ: "ijlig",
                    Ĳ: "IJlig",
                    ı: "imath",
                    𝒿: "jscr",
                    𝕛: "jopf",
                    𝔧: "jfr",
                    𝒥: "Jscr",
                    𝔍: "Jfr",
                    𝕁: "Jopf",
                    ĵ: "jcirc",
                    Ĵ: "Jcirc",
                    ȷ: "jmath",
                    𝕜: "kopf",
                    𝓀: "kscr",
                    𝔨: "kfr",
                    𝒦: "Kscr",
                    𝕂: "Kopf",
                    𝔎: "Kfr",
                    ķ: "kcedil",
                    Ķ: "Kcedil",
                    𝔩: "lfr",
                    𝓁: "lscr",
                    ℓ: "ell",
                    𝕝: "lopf",
                    ℒ: "Lscr",
                    𝔏: "Lfr",
                    𝕃: "Lopf",
                    ĺ: "lacute",
                    Ĺ: "Lacute",
                    ľ: "lcaron",
                    Ľ: "Lcaron",
                    ļ: "lcedil",
                    Ļ: "Lcedil",
                    ł: "lstrok",
                    Ł: "Lstrok",
                    ŀ: "lmidot",
                    Ŀ: "Lmidot",
                    𝔪: "mfr",
                    𝕞: "mopf",
                    𝓂: "mscr",
                    𝔐: "Mfr",
                    𝕄: "Mopf",
                    ℳ: "Mscr",
                    𝔫: "nfr",
                    𝕟: "nopf",
                    𝓃: "nscr",
                    ℕ: "Nopf",
                    𝒩: "Nscr",
                    𝔑: "Nfr",
                    ń: "nacute",
                    Ń: "Nacute",
                    ň: "ncaron",
                    Ň: "Ncaron",
                    ñ: "ntilde",
                    Ñ: "Ntilde",
                    ņ: "ncedil",
                    Ņ: "Ncedil",
                    "№": "numero",
                    ŋ: "eng",
                    Ŋ: "ENG",
                    𝕠: "oopf",
                    𝔬: "ofr",
                    ℴ: "oscr",
                    𝒪: "Oscr",
                    𝔒: "Ofr",
                    𝕆: "Oopf",
                    º: "ordm",
                    ó: "oacute",
                    Ó: "Oacute",
                    ò: "ograve",
                    Ò: "Ograve",
                    ô: "ocirc",
                    Ô: "Ocirc",
                    ö: "ouml",
                    Ö: "Ouml",
                    ő: "odblac",
                    Ő: "Odblac",
                    õ: "otilde",
                    Õ: "Otilde",
                    ø: "oslash",
                    Ø: "Oslash",
                    ō: "omacr",
                    Ō: "Omacr",
                    œ: "oelig",
                    Œ: "OElig",
                    𝔭: "pfr",
                    𝓅: "pscr",
                    𝕡: "popf",
                    ℙ: "Popf",
                    𝔓: "Pfr",
                    𝒫: "Pscr",
                    𝕢: "qopf",
                    𝔮: "qfr",
                    𝓆: "qscr",
                    𝒬: "Qscr",
                    𝔔: "Qfr",
                    ℚ: "Qopf",
                    ĸ: "kgreen",
                    𝔯: "rfr",
                    𝕣: "ropf",
                    𝓇: "rscr",
                    ℛ: "Rscr",
                    ℜ: "Re",
                    ℝ: "Ropf",
                    ŕ: "racute",
                    Ŕ: "Racute",
                    ř: "rcaron",
                    Ř: "Rcaron",
                    ŗ: "rcedil",
                    Ŗ: "Rcedil",
                    𝕤: "sopf",
                    𝓈: "sscr",
                    𝔰: "sfr",
                    𝕊: "Sopf",
                    𝔖: "Sfr",
                    𝒮: "Sscr",
                    "Ⓢ": "oS",
                    ś: "sacute",
                    Ś: "Sacute",
                    ŝ: "scirc",
                    Ŝ: "Scirc",
                    š: "scaron",
                    Š: "Scaron",
                    ş: "scedil",
                    Ş: "Scedil",
                    ß: "szlig",
                    𝔱: "tfr",
                    𝓉: "tscr",
                    𝕥: "topf",
                    𝒯: "Tscr",
                    𝔗: "Tfr",
                    𝕋: "Topf",
                    ť: "tcaron",
                    Ť: "Tcaron",
                    ţ: "tcedil",
                    Ţ: "Tcedil",
                    "™": "trade",
                    ŧ: "tstrok",
                    Ŧ: "Tstrok",
                    𝓊: "uscr",
                    𝕦: "uopf",
                    𝔲: "ufr",
                    𝕌: "Uopf",
                    𝔘: "Ufr",
                    𝒰: "Uscr",
                    ú: "uacute",
                    Ú: "Uacute",
                    ù: "ugrave",
                    Ù: "Ugrave",
                    ŭ: "ubreve",
                    Ŭ: "Ubreve",
                    û: "ucirc",
                    Û: "Ucirc",
                    ů: "uring",
                    Ů: "Uring",
                    ü: "uuml",
                    Ü: "Uuml",
                    ű: "udblac",
                    Ű: "Udblac",
                    ũ: "utilde",
                    Ũ: "Utilde",
                    ų: "uogon",
                    Ų: "Uogon",
                    ū: "umacr",
                    Ū: "Umacr",
                    𝔳: "vfr",
                    𝕧: "vopf",
                    𝓋: "vscr",
                    𝔙: "Vfr",
                    𝕍: "Vopf",
                    𝒱: "Vscr",
                    𝕨: "wopf",
                    𝓌: "wscr",
                    𝔴: "wfr",
                    𝒲: "Wscr",
                    𝕎: "Wopf",
                    𝔚: "Wfr",
                    ŵ: "wcirc",
                    Ŵ: "Wcirc",
                    𝔵: "xfr",
                    𝓍: "xscr",
                    𝕩: "xopf",
                    𝕏: "Xopf",
                    𝔛: "Xfr",
                    𝒳: "Xscr",
                    𝔶: "yfr",
                    𝓎: "yscr",
                    𝕪: "yopf",
                    𝒴: "Yscr",
                    𝔜: "Yfr",
                    𝕐: "Yopf",
                    ý: "yacute",
                    Ý: "Yacute",
                    ŷ: "ycirc",
                    Ŷ: "Ycirc",
                    ÿ: "yuml",
                    Ÿ: "Yuml",
                    𝓏: "zscr",
                    𝔷: "zfr",
                    𝕫: "zopf",
                    ℨ: "Zfr",
                    ℤ: "Zopf",
                    𝒵: "Zscr",
                    ź: "zacute",
                    Ź: "Zacute",
                    ž: "zcaron",
                    Ž: "Zcaron",
                    ż: "zdot",
                    Ż: "Zdot",
                    Ƶ: "imped",
                    þ: "thorn",
                    Þ: "THORN",
                    ŉ: "napos",
                    α: "alpha",
                    Α: "Alpha",
                    β: "beta",
                    Β: "Beta",
                    γ: "gamma",
                    Γ: "Gamma",
                    δ: "delta",
                    Δ: "Delta",
                    ε: "epsi",
                    ϵ: "epsiv",
                    Ε: "Epsilon",
                    ϝ: "gammad",
                    Ϝ: "Gammad",
                    ζ: "zeta",
                    Ζ: "Zeta",
                    η: "eta",
                    Η: "Eta",
                    θ: "theta",
                    ϑ: "thetav",
                    Θ: "Theta",
                    ι: "iota",
                    Ι: "Iota",
                    κ: "kappa",
                    ϰ: "kappav",
                    Κ: "Kappa",
                    λ: "lambda",
                    Λ: "Lambda",
                    μ: "mu",
                    µ: "micro",
                    Μ: "Mu",
                    ν: "nu",
                    Ν: "Nu",
                    ξ: "xi",
                    Ξ: "Xi",
                    ο: "omicron",
                    Ο: "Omicron",
                    π: "pi",
                    ϖ: "piv",
                    Π: "Pi",
                    ρ: "rho",
                    ϱ: "rhov",
                    Ρ: "Rho",
                    σ: "sigma",
                    Σ: "Sigma",
                    ς: "sigmaf",
                    τ: "tau",
                    Τ: "Tau",
                    υ: "upsi",
                    Υ: "Upsilon",
                    ϒ: "Upsi",
                    φ: "phi",
                    ϕ: "phiv",
                    Φ: "Phi",
                    χ: "chi",
                    Χ: "Chi",
                    ψ: "psi",
                    Ψ: "Psi",
                    ω: "omega",
                    Ω: "ohm",
                    а: "acy",
                    А: "Acy",
                    б: "bcy",
                    Б: "Bcy",
                    в: "vcy",
                    В: "Vcy",
                    г: "gcy",
                    Г: "Gcy",
                    ѓ: "gjcy",
                    Ѓ: "GJcy",
                    д: "dcy",
                    Д: "Dcy",
                    ђ: "djcy",
                    Ђ: "DJcy",
                    е: "iecy",
                    Е: "IEcy",
                    ё: "iocy",
                    Ё: "IOcy",
                    є: "jukcy",
                    Є: "Jukcy",
                    ж: "zhcy",
                    Ж: "ZHcy",
                    з: "zcy",
                    З: "Zcy",
                    ѕ: "dscy",
                    Ѕ: "DScy",
                    и: "icy",
                    И: "Icy",
                    і: "iukcy",
                    І: "Iukcy",
                    ї: "yicy",
                    Ї: "YIcy",
                    й: "jcy",
                    Й: "Jcy",
                    ј: "jsercy",
                    Ј: "Jsercy",
                    к: "kcy",
                    К: "Kcy",
                    ќ: "kjcy",
                    Ќ: "KJcy",
                    л: "lcy",
                    Л: "Lcy",
                    љ: "ljcy",
                    Љ: "LJcy",
                    м: "mcy",
                    М: "Mcy",
                    н: "ncy",
                    Н: "Ncy",
                    њ: "njcy",
                    Њ: "NJcy",
                    о: "ocy",
                    О: "Ocy",
                    п: "pcy",
                    П: "Pcy",
                    р: "rcy",
                    Р: "Rcy",
                    с: "scy",
                    С: "Scy",
                    т: "tcy",
                    Т: "Tcy",
                    ћ: "tshcy",
                    Ћ: "TSHcy",
                    у: "ucy",
                    У: "Ucy",
                    ў: "ubrcy",
                    Ў: "Ubrcy",
                    ф: "fcy",
                    Ф: "Fcy",
                    х: "khcy",
                    Х: "KHcy",
                    ц: "tscy",
                    Ц: "TScy",
                    ч: "chcy",
                    Ч: "CHcy",
                    џ: "dzcy",
                    Џ: "DZcy",
                    ш: "shcy",
                    Ш: "SHcy",
                    щ: "shchcy",
                    Щ: "SHCHcy",
                    ъ: "hardcy",
                    Ъ: "HARDcy",
                    ы: "ycy",
                    Ы: "Ycy",
                    ь: "softcy",
                    Ь: "SOFTcy",
                    э: "ecy",
                    Э: "Ecy",
                    ю: "yucy",
                    Ю: "YUcy",
                    я: "yacy",
                    Я: "YAcy",
                    ℵ: "aleph",
                    ℶ: "beth",
                    ℷ: "gimel",
                    ℸ: "daleth"
                };
                var regexEscape = /["&'<>`]/g;
                var escapeMap = {
                    '"': "&quot;",
                    "&": "&amp;",
                    "'": "&#x27;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "`": "&#x60;"
                };
                var regexInvalidEntity = /&#(?:[xX][^a-fA-F0-9]|[^0-9xX])/;
                var regexInvalidRawCodePoint = /[\0-\x08\x0B\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
                var regexDecode = /&(CounterClockwiseContourIntegral|DoubleLongLeftRightArrow|ClockwiseContourIntegral|NotNestedGreaterGreater|NotSquareSupersetEqual|DiacriticalDoubleAcute|NotRightTriangleEqual|NotSucceedsSlantEqual|NotPrecedesSlantEqual|CloseCurlyDoubleQuote|NegativeVeryThinSpace|DoubleContourIntegral|FilledVerySmallSquare|CapitalDifferentialD|OpenCurlyDoubleQuote|EmptyVerySmallSquare|NestedGreaterGreater|DoubleLongRightArrow|NotLeftTriangleEqual|NotGreaterSlantEqual|ReverseUpEquilibrium|DoubleLeftRightArrow|NotSquareSubsetEqual|NotDoubleVerticalBar|RightArrowLeftArrow|NotGreaterFullEqual|NotRightTriangleBar|SquareSupersetEqual|DownLeftRightVector|DoubleLongLeftArrow|leftrightsquigarrow|LeftArrowRightArrow|NegativeMediumSpace|blacktriangleright|RightDownVectorBar|PrecedesSlantEqual|RightDoubleBracket|SucceedsSlantEqual|NotLeftTriangleBar|RightTriangleEqual|SquareIntersection|RightDownTeeVector|ReverseEquilibrium|NegativeThickSpace|longleftrightarrow|Longleftrightarrow|LongLeftRightArrow|DownRightTeeVector|DownRightVectorBar|GreaterSlantEqual|SquareSubsetEqual|LeftDownVectorBar|LeftDoubleBracket|VerticalSeparator|rightleftharpoons|NotGreaterGreater|NotSquareSuperset|blacktriangleleft|blacktriangledown|NegativeThinSpace|LeftDownTeeVector|NotLessSlantEqual|leftrightharpoons|DoubleUpDownArrow|DoubleVerticalBar|LeftTriangleEqual|FilledSmallSquare|twoheadrightarrow|NotNestedLessLess|DownLeftTeeVector|DownLeftVectorBar|RightAngleBracket|NotTildeFullEqual|NotReverseElement|RightUpDownVector|DiacriticalTilde|NotSucceedsTilde|circlearrowright|NotPrecedesEqual|rightharpoondown|DoubleRightArrow|NotSucceedsEqual|NonBreakingSpace|NotRightTriangle|LessEqualGreater|RightUpTeeVector|LeftAngleBracket|GreaterFullEqual|DownArrowUpArrow|RightUpVectorBar|twoheadleftarrow|GreaterEqualLess|downharpoonright|RightTriangleBar|ntrianglerighteq|NotSupersetEqual|LeftUpDownVector|DiacriticalAcute|rightrightarrows|vartriangleright|UpArrowDownArrow|DiacriticalGrave|UnderParenthesis|EmptySmallSquare|LeftUpVectorBar|leftrightarrows|DownRightVector|downharpoonleft|trianglerighteq|ShortRightArrow|OverParenthesis|DoubleLeftArrow|DoubleDownArrow|NotSquareSubset|bigtriangledown|ntrianglelefteq|UpperRightArrow|curvearrowright|vartriangleleft|NotLeftTriangle|nleftrightarrow|LowerRightArrow|NotHumpDownHump|NotGreaterTilde|rightthreetimes|LeftUpTeeVector|NotGreaterEqual|straightepsilon|LeftTriangleBar|rightsquigarrow|ContourIntegral|rightleftarrows|CloseCurlyQuote|RightDownVector|LeftRightVector|nLeftrightarrow|leftharpoondown|circlearrowleft|SquareSuperset|OpenCurlyQuote|hookrightarrow|HorizontalLine|DiacriticalDot|NotLessGreater|ntriangleright|DoubleRightTee|InvisibleComma|InvisibleTimes|LowerLeftArrow|DownLeftVector|NotSubsetEqual|curvearrowleft|trianglelefteq|NotVerticalBar|TildeFullEqual|downdownarrows|NotGreaterLess|RightTeeVector|ZeroWidthSpace|looparrowright|LongRightArrow|doublebarwedge|ShortLeftArrow|ShortDownArrow|RightVectorBar|GreaterGreater|ReverseElement|rightharpoonup|LessSlantEqual|leftthreetimes|upharpoonright|rightarrowtail|LeftDownVector|Longrightarrow|NestedLessLess|UpperLeftArrow|nshortparallel|leftleftarrows|leftrightarrow|Leftrightarrow|LeftRightArrow|longrightarrow|upharpoonleft|RightArrowBar|ApplyFunction|LeftTeeVector|leftarrowtail|NotEqualTilde|varsubsetneqq|varsupsetneqq|RightTeeArrow|SucceedsEqual|SucceedsTilde|LeftVectorBar|SupersetEqual|hookleftarrow|DifferentialD|VerticalTilde|VeryThinSpace|blacktriangle|bigtriangleup|LessFullEqual|divideontimes|leftharpoonup|UpEquilibrium|ntriangleleft|RightTriangle|measuredangle|shortparallel|longleftarrow|Longleftarrow|LongLeftArrow|DoubleLeftTee|Poincareplane|PrecedesEqual|triangleright|DoubleUpArrow|RightUpVector|fallingdotseq|looparrowleft|PrecedesTilde|NotTildeEqual|NotTildeTilde|smallsetminus|Proportional|triangleleft|triangledown|UnderBracket|NotHumpEqual|exponentiale|ExponentialE|NotLessTilde|HilbertSpace|RightCeiling|blacklozenge|varsupsetneq|HumpDownHump|GreaterEqual|VerticalLine|LeftTeeArrow|NotLessEqual|DownTeeArrow|LeftTriangle|varsubsetneq|Intersection|NotCongruent|DownArrowBar|LeftUpVector|LeftArrowBar|risingdotseq|GreaterTilde|RoundImplies|SquareSubset|ShortUpArrow|NotSuperset|quaternions|precnapprox|backepsilon|preccurlyeq|OverBracket|blacksquare|MediumSpace|VerticalBar|circledcirc|circleddash|CircleMinus|CircleTimes|LessGreater|curlyeqprec|curlyeqsucc|diamondsuit|UpDownArrow|Updownarrow|RuleDelayed|Rrightarrow|updownarrow|RightVector|nRightarrow|nrightarrow|eqslantless|LeftCeiling|Equilibrium|SmallCircle|expectation|NotSucceeds|thickapprox|GreaterLess|SquareUnion|NotPrecedes|NotLessLess|straightphi|succnapprox|succcurlyeq|SubsetEqual|sqsupseteq|Proportion|Laplacetrf|ImaginaryI|supsetneqq|NotGreater|gtreqqless|NotElement|ThickSpace|TildeEqual|TildeTilde|Fouriertrf|rmoustache|EqualTilde|eqslantgtr|UnderBrace|LeftVector|UpArrowBar|nLeftarrow|nsubseteqq|subsetneqq|nsupseteqq|nleftarrow|succapprox|lessapprox|UpTeeArrow|upuparrows|curlywedge|lesseqqgtr|varepsilon|varnothing|RightFloor|complement|CirclePlus|sqsubseteq|Lleftarrow|circledast|RightArrow|Rightarrow|rightarrow|lmoustache|Bernoullis|precapprox|mapstoleft|mapstodown|longmapsto|dotsquare|downarrow|DoubleDot|nsubseteq|supsetneq|leftarrow|nsupseteq|subsetneq|ThinSpace|ngeqslant|subseteqq|HumpEqual|NotSubset|triangleq|NotCupCap|lesseqgtr|heartsuit|TripleDot|Leftarrow|Coproduct|Congruent|varpropto|complexes|gvertneqq|LeftArrow|LessTilde|supseteqq|MinusPlus|CircleDot|nleqslant|NotExists|gtreqless|nparallel|UnionPlus|LeftFloor|checkmark|CenterDot|centerdot|Mellintrf|gtrapprox|bigotimes|OverBrace|spadesuit|therefore|pitchfork|rationals|PlusMinus|Backslash|Therefore|DownBreve|backsimeq|backprime|DownArrow|nshortmid|Downarrow|lvertneqq|eqvparsl|imagline|imagpart|infintie|integers|Integral|intercal|LessLess|Uarrocir|intlarhk|sqsupset|angmsdaf|sqsubset|llcorner|vartheta|cupbrcap|lnapprox|Superset|SuchThat|succnsim|succneqq|angmsdag|biguplus|curlyvee|trpezium|Succeeds|NotTilde|bigwedge|angmsdah|angrtvbd|triminus|cwconint|fpartint|lrcorner|smeparsl|subseteq|urcorner|lurdshar|laemptyv|DDotrahd|approxeq|ldrushar|awconint|mapstoup|backcong|shortmid|triangle|geqslant|gesdotol|timesbar|circledR|circledS|setminus|multimap|naturals|scpolint|ncongdot|RightTee|boxminus|gnapprox|boxtimes|andslope|thicksim|angmsdaa|varsigma|cirfnint|rtriltri|angmsdab|rppolint|angmsdac|barwedge|drbkarow|clubsuit|thetasym|bsolhsub|capbrcup|dzigrarr|doteqdot|DotEqual|dotminus|UnderBar|NotEqual|realpart|otimesas|ulcorner|hksearow|hkswarow|parallel|PartialD|elinters|emptyset|plusacir|bbrktbrk|angmsdad|pointint|bigoplus|angmsdae|Precedes|bigsqcup|varkappa|notindot|supseteq|precneqq|precnsim|profalar|profline|profsurf|leqslant|lesdotor|raemptyv|subplus|notnivb|notnivc|subrarr|zigrarr|vzigzag|submult|subedot|Element|between|cirscir|larrbfs|larrsim|lotimes|lbrksld|lbrkslu|lozenge|ldrdhar|dbkarow|bigcirc|epsilon|simrarr|simplus|ltquest|Epsilon|luruhar|gtquest|maltese|npolint|eqcolon|npreceq|bigodot|ddagger|gtrless|bnequiv|harrcir|ddotseq|equivDD|backsim|demptyv|nsqsube|nsqsupe|Upsilon|nsubset|upsilon|minusdu|nsucceq|swarrow|nsupset|coloneq|searrow|boxplus|napprox|natural|asympeq|alefsym|congdot|nearrow|bigstar|diamond|supplus|tritime|LeftTee|nvinfin|triplus|NewLine|nvltrie|nvrtrie|nwarrow|nexists|Diamond|ruluhar|Implies|supmult|angzarr|suplarr|suphsub|questeq|because|digamma|Because|olcross|bemptyv|omicron|Omicron|rotimes|NoBreak|intprod|angrtvb|orderof|uwangle|suphsol|lesdoto|orslope|DownTee|realine|cudarrl|rdldhar|OverBar|supedot|lessdot|supdsub|topfork|succsim|rbrkslu|rbrksld|pertenk|cudarrr|isindot|planckh|lessgtr|pluscir|gesdoto|plussim|plustwo|lesssim|cularrp|rarrsim|Cayleys|notinva|notinvb|notinvc|UpArrow|Uparrow|uparrow|NotLess|dwangle|precsim|Product|curarrm|Cconint|dotplus|rarrbfs|ccupssm|Cedilla|cemptyv|notniva|quatint|frac35|frac38|frac45|frac56|frac58|frac78|tridot|xoplus|gacute|gammad|Gammad|lfisht|lfloor|bigcup|sqsupe|gbreve|Gbreve|lharul|sqsube|sqcups|Gcedil|apacir|llhard|lmidot|Lmidot|lmoust|andand|sqcaps|approx|Abreve|spades|circeq|tprime|divide|topcir|Assign|topbot|gesdot|divonx|xuplus|timesd|gesles|atilde|solbar|SOFTcy|loplus|timesb|lowast|lowbar|dlcorn|dlcrop|softcy|dollar|lparlt|thksim|lrhard|Atilde|lsaquo|smashp|bigvee|thinsp|wreath|bkarow|lsquor|lstrok|Lstrok|lthree|ltimes|ltlarr|DotDot|simdot|ltrPar|weierp|xsqcup|angmsd|sigmav|sigmaf|zeetrf|Zcaron|zcaron|mapsto|vsupne|thetav|cirmid|marker|mcomma|Zacute|vsubnE|there4|gtlPar|vsubne|bottom|gtrarr|SHCHcy|shchcy|midast|midcir|middot|minusb|minusd|gtrdot|bowtie|sfrown|mnplus|models|colone|seswar|Colone|mstpos|searhk|gtrsim|nacute|Nacute|boxbox|telrec|hairsp|Tcedil|nbumpe|scnsim|ncaron|Ncaron|ncedil|Ncedil|hamilt|Scedil|nearhk|hardcy|HARDcy|tcedil|Tcaron|commat|nequiv|nesear|tcaron|target|hearts|nexist|varrho|scedil|Scaron|scaron|hellip|Sacute|sacute|hercon|swnwar|compfn|rtimes|rthree|rsquor|rsaquo|zacute|wedgeq|homtht|barvee|barwed|Barwed|rpargt|horbar|conint|swarhk|roplus|nltrie|hslash|hstrok|Hstrok|rmoust|Conint|bprime|hybull|hyphen|iacute|Iacute|supsup|supsub|supsim|varphi|coprod|brvbar|agrave|Supset|supset|igrave|Igrave|notinE|Agrave|iiiint|iinfin|copysr|wedbar|Verbar|vangrt|becaus|incare|verbar|inodot|bullet|drcorn|intcal|drcrop|cularr|vellip|Utilde|bumpeq|cupcap|dstrok|Dstrok|CupCap|cupcup|cupdot|eacute|Eacute|supdot|iquest|easter|ecaron|Ecaron|ecolon|isinsv|utilde|itilde|Itilde|curarr|succeq|Bumpeq|cacute|ulcrop|nparsl|Cacute|nprcue|egrave|Egrave|nrarrc|nrarrw|subsup|subsub|nrtrie|jsercy|nsccue|Jsercy|kappav|kcedil|Kcedil|subsim|ulcorn|nsimeq|egsdot|veebar|kgreen|capand|elsdot|Subset|subset|curren|aacute|lacute|Lacute|emptyv|ntilde|Ntilde|lagran|lambda|Lambda|capcap|Ugrave|langle|subdot|emsp13|numero|emsp14|nvdash|nvDash|nVdash|nVDash|ugrave|ufisht|nvHarr|larrfs|nvlArr|larrhk|larrlp|larrpl|nvrArr|Udblac|nwarhk|larrtl|nwnear|oacute|Oacute|latail|lAtail|sstarf|lbrace|odblac|Odblac|lbrack|udblac|odsold|eparsl|lcaron|Lcaron|ograve|Ograve|lcedil|Lcedil|Aacute|ssmile|ssetmn|squarf|ldquor|capcup|ominus|cylcty|rharul|eqcirc|dagger|rfloor|rfisht|Dagger|daleth|equals|origof|capdot|equest|dcaron|Dcaron|rdquor|oslash|Oslash|otilde|Otilde|otimes|Otimes|urcrop|Ubreve|ubreve|Yacute|Uacute|uacute|Rcedil|rcedil|urcorn|parsim|Rcaron|Vdashl|rcaron|Tstrok|percnt|period|permil|Exists|yacute|rbrack|rbrace|phmmat|ccaron|Ccaron|planck|ccedil|plankv|tstrok|female|plusdo|plusdu|ffilig|plusmn|ffllig|Ccedil|rAtail|dfisht|bernou|ratail|Rarrtl|rarrtl|angsph|rarrpl|rarrlp|rarrhk|xwedge|xotime|forall|ForAll|Vvdash|vsupnE|preceq|bigcap|frac12|frac13|frac14|primes|rarrfs|prnsim|frac15|Square|frac16|square|lesdot|frac18|frac23|propto|prurel|rarrap|rangle|puncsp|frac25|Racute|qprime|racute|lesges|frac34|abreve|AElig|eqsim|utdot|setmn|urtri|Equal|Uring|seArr|uring|searr|dashv|Dashv|mumap|nabla|iogon|Iogon|sdote|sdotb|scsim|napid|napos|equiv|natur|Acirc|dblac|erarr|nbump|iprod|erDot|ucirc|awint|esdot|angrt|ncong|isinE|scnap|Scirc|scirc|ndash|isins|Ubrcy|nearr|neArr|isinv|nedot|ubrcy|acute|Ycirc|iukcy|Iukcy|xutri|nesim|caret|jcirc|Jcirc|caron|twixt|ddarr|sccue|exist|jmath|sbquo|ngeqq|angst|ccaps|lceil|ngsim|UpTee|delta|Delta|rtrif|nharr|nhArr|nhpar|rtrie|jukcy|Jukcy|kappa|rsquo|Kappa|nlarr|nlArr|TSHcy|rrarr|aogon|Aogon|fflig|xrarr|tshcy|ccirc|nleqq|filig|upsih|nless|dharl|nlsim|fjlig|ropar|nltri|dharr|robrk|roarr|fllig|fltns|roang|rnmid|subnE|subne|lAarr|trisb|Ccirc|acirc|ccups|blank|VDash|forkv|Vdash|langd|cedil|blk12|blk14|laquo|strns|diams|notin|vDash|larrb|blk34|block|disin|uplus|vdash|vBarv|aelig|starf|Wedge|check|xrArr|lates|lbarr|lBarr|notni|lbbrk|bcong|frasl|lbrke|frown|vrtri|vprop|vnsup|gamma|Gamma|wedge|xodot|bdquo|srarr|doteq|ldquo|boxdl|boxdL|gcirc|Gcirc|boxDl|boxDL|boxdr|boxdR|boxDr|TRADE|trade|rlhar|boxDR|vnsub|npart|vltri|rlarr|boxhd|boxhD|nprec|gescc|nrarr|nrArr|boxHd|boxHD|boxhu|boxhU|nrtri|boxHu|clubs|boxHU|times|colon|Colon|gimel|xlArr|Tilde|nsime|tilde|nsmid|nspar|THORN|thorn|xlarr|nsube|nsubE|thkap|xhArr|comma|nsucc|boxul|boxuL|nsupe|nsupE|gneqq|gnsim|boxUl|boxUL|grave|boxur|boxuR|boxUr|boxUR|lescc|angle|bepsi|boxvh|varpi|boxvH|numsp|Theta|gsime|gsiml|theta|boxVh|boxVH|boxvl|gtcir|gtdot|boxvL|boxVl|boxVL|crarr|cross|Cross|nvsim|boxvr|nwarr|nwArr|sqsup|dtdot|Uogon|lhard|lharu|dtrif|ocirc|Ocirc|lhblk|duarr|odash|sqsub|Hacek|sqcup|llarr|duhar|oelig|OElig|ofcir|boxvR|uogon|lltri|boxVr|csube|uuarr|ohbar|csupe|ctdot|olarr|olcir|harrw|oline|sqcap|omacr|Omacr|omega|Omega|boxVR|aleph|lneqq|lnsim|loang|loarr|rharu|lobrk|hcirc|operp|oplus|rhard|Hcirc|orarr|Union|order|ecirc|Ecirc|cuepr|szlig|cuesc|breve|reals|eDDot|Breve|hoarr|lopar|utrif|rdquo|Umacr|umacr|efDot|swArr|ultri|alpha|rceil|ovbar|swarr|Wcirc|wcirc|smtes|smile|bsemi|lrarr|aring|parsl|lrhar|bsime|uhblk|lrtri|cupor|Aring|uharr|uharl|slarr|rbrke|bsolb|lsime|rbbrk|RBarr|lsimg|phone|rBarr|rbarr|icirc|lsquo|Icirc|emacr|Emacr|ratio|simne|plusb|simlE|simgE|simeq|pluse|ltcir|ltdot|empty|xharr|xdtri|iexcl|Alpha|ltrie|rarrw|pound|ltrif|xcirc|bumpe|prcue|bumpE|asymp|amacr|cuvee|Sigma|sigma|iiint|udhar|iiota|ijlig|IJlig|supnE|imacr|Imacr|prime|Prime|image|prnap|eogon|Eogon|rarrc|mdash|mDDot|cuwed|imath|supne|imped|Amacr|udarr|prsim|micro|rarrb|cwint|raquo|infin|eplus|range|rangd|Ucirc|radic|minus|amalg|veeeq|rAarr|epsiv|ycirc|quest|sharp|quot|zwnj|Qscr|race|qscr|Qopf|qopf|qint|rang|Rang|Zscr|zscr|Zopf|zopf|rarr|rArr|Rarr|Pscr|pscr|prop|prod|prnE|prec|ZHcy|zhcy|prap|Zeta|zeta|Popf|popf|Zdot|plus|zdot|Yuml|yuml|phiv|YUcy|yucy|Yscr|yscr|perp|Yopf|yopf|part|para|YIcy|Ouml|rcub|yicy|YAcy|rdca|ouml|osol|Oscr|rdsh|yacy|real|oscr|xvee|andd|rect|andv|Xscr|oror|ordm|ordf|xscr|ange|aopf|Aopf|rHar|Xopf|opar|Oopf|xopf|xnis|rhov|oopf|omid|xmap|oint|apid|apos|ogon|ascr|Ascr|odot|odiv|xcup|xcap|ocir|oast|nvlt|nvle|nvgt|nvge|nvap|Wscr|wscr|auml|ntlg|ntgl|nsup|nsub|nsim|Nscr|nscr|nsce|Wopf|ring|npre|wopf|npar|Auml|Barv|bbrk|Nopf|nopf|nmid|nLtv|beta|ropf|Ropf|Beta|beth|nles|rpar|nleq|bnot|bNot|nldr|NJcy|rscr|Rscr|Vscr|vscr|rsqb|njcy|bopf|nisd|Bopf|rtri|Vopf|nGtv|ngtr|vopf|boxh|boxH|boxv|nges|ngeq|boxV|bscr|scap|Bscr|bsim|Vert|vert|bsol|bull|bump|caps|cdot|ncup|scnE|ncap|nbsp|napE|Cdot|cent|sdot|Vbar|nang|vBar|chcy|Mscr|mscr|sect|semi|CHcy|Mopf|mopf|sext|circ|cire|mldr|mlcp|cirE|comp|shcy|SHcy|vArr|varr|cong|copf|Copf|copy|COPY|malt|male|macr|lvnE|cscr|ltri|sime|ltcc|simg|Cscr|siml|csub|Uuml|lsqb|lsim|uuml|csup|Lscr|lscr|utri|smid|lpar|cups|smte|lozf|darr|Lopf|Uscr|solb|lopf|sopf|Sopf|lneq|uscr|spar|dArr|lnap|Darr|dash|Sqrt|LJcy|ljcy|lHar|dHar|Upsi|upsi|diam|lesg|djcy|DJcy|leqq|dopf|Dopf|dscr|Dscr|dscy|ldsh|ldca|squf|DScy|sscr|Sscr|dsol|lcub|late|star|Star|Uopf|Larr|lArr|larr|uopf|dtri|dzcy|sube|subE|Lang|lang|Kscr|kscr|Kopf|kopf|KJcy|kjcy|KHcy|khcy|DZcy|ecir|edot|eDot|Jscr|jscr|succ|Jopf|jopf|Edot|uHar|emsp|ensp|Iuml|iuml|eopf|isin|Iscr|iscr|Eopf|epar|sung|epsi|escr|sup1|sup2|sup3|Iota|iota|supe|supE|Iopf|iopf|IOcy|iocy|Escr|esim|Esim|imof|Uarr|QUOT|uArr|uarr|euml|IEcy|iecy|Idot|Euml|euro|excl|Hscr|hscr|Hopf|hopf|TScy|tscy|Tscr|hbar|tscr|flat|tbrk|fnof|hArr|harr|half|fopf|Fopf|tdot|gvnE|fork|trie|gtcc|fscr|Fscr|gdot|gsim|Gscr|gscr|Gopf|gopf|gneq|Gdot|tosa|gnap|Topf|topf|geqq|toea|GJcy|gjcy|tint|gesl|mid|Sfr|ggg|top|ges|gla|glE|glj|geq|gne|gEl|gel|gnE|Gcy|gcy|gap|Tfr|tfr|Tcy|tcy|Hat|Tau|Ffr|tau|Tab|hfr|Hfr|ffr|Fcy|fcy|icy|Icy|iff|ETH|eth|ifr|Ifr|Eta|eta|int|Int|Sup|sup|ucy|Ucy|Sum|sum|jcy|ENG|ufr|Ufr|eng|Jcy|jfr|els|ell|egs|Efr|efr|Jfr|uml|kcy|Kcy|Ecy|ecy|kfr|Kfr|lap|Sub|sub|lat|lcy|Lcy|leg|Dot|dot|lEg|leq|les|squ|div|die|lfr|Lfr|lgE|Dfr|dfr|Del|deg|Dcy|dcy|lne|lnE|sol|loz|smt|Cup|lrm|cup|lsh|Lsh|sim|shy|map|Map|mcy|Mcy|mfr|Mfr|mho|gfr|Gfr|sfr|cir|Chi|chi|nap|Cfr|vcy|Vcy|cfr|Scy|scy|ncy|Ncy|vee|Vee|Cap|cap|nfr|scE|sce|Nfr|nge|ngE|nGg|vfr|Vfr|ngt|bot|nGt|nis|niv|Rsh|rsh|nle|nlE|bne|Bfr|bfr|nLl|nlt|nLt|Bcy|bcy|not|Not|rlm|wfr|Wfr|npr|nsc|num|ocy|ast|Ocy|ofr|xfr|Xfr|Ofr|ogt|ohm|apE|olt|Rho|ape|rho|Rfr|rfr|ord|REG|ang|reg|orv|And|and|AMP|Rcy|amp|Afr|ycy|Ycy|yen|yfr|Yfr|rcy|par|pcy|Pcy|pfr|Pfr|phi|Phi|afr|Acy|acy|zcy|Zcy|piv|acE|acd|zfr|Zfr|pre|prE|psi|Psi|qfr|Qfr|zwj|Or|ge|Gg|gt|gg|el|oS|lt|Lt|LT|Re|lg|gl|eg|ne|Im|it|le|DD|wp|wr|nu|Nu|dd|lE|Sc|sc|pi|Pi|ee|af|ll|Ll|rx|gE|xi|pm|Xi|ic|pr|Pr|in|ni|mp|mu|ac|Mu|or|ap|Gt|GT|ii);|&(Aacute|Agrave|Atilde|Ccedil|Eacute|Egrave|Iacute|Igrave|Ntilde|Oacute|Ograve|Oslash|Otilde|Uacute|Ugrave|Yacute|aacute|agrave|atilde|brvbar|ccedil|curren|divide|eacute|egrave|frac12|frac14|frac34|iacute|igrave|iquest|middot|ntilde|oacute|ograve|oslash|otilde|plusmn|uacute|ugrave|yacute|AElig|Acirc|Aring|Ecirc|Icirc|Ocirc|THORN|Ucirc|acirc|acute|aelig|aring|cedil|ecirc|icirc|iexcl|laquo|micro|ocirc|pound|raquo|szlig|thorn|times|ucirc|Auml|COPY|Euml|Iuml|Ouml|QUOT|Uuml|auml|cent|copy|euml|iuml|macr|nbsp|ordf|ordm|ouml|para|quot|sect|sup1|sup2|sup3|uuml|yuml|AMP|ETH|REG|amp|deg|eth|not|reg|shy|uml|yen|GT|LT|gt|lt)(?!;)([=a-zA-Z0-9]?)|&#([0-9]+)(;?)|&#[xX]([a-fA-F0-9]+)(;?)|&([0-9a-zA-Z]+)/g;
                var decodeMap = {
                    aacute: "á",
                    Aacute: "Á",
                    abreve: "ă",
                    Abreve: "Ă",
                    ac: "∾",
                    acd: "∿",
                    acE: "∾̳",
                    acirc: "â",
                    Acirc: "Â",
                    acute: "´",
                    acy: "а",
                    Acy: "А",
                    aelig: "æ",
                    AElig: "Æ",
                    af: "⁡",
                    afr: "𝔞",
                    Afr: "𝔄",
                    agrave: "à",
                    Agrave: "À",
                    alefsym: "ℵ",
                    aleph: "ℵ",
                    alpha: "α",
                    Alpha: "Α",
                    amacr: "ā",
                    Amacr: "Ā",
                    amalg: "⨿",
                    amp: "&",
                    AMP: "&",
                    and: "∧",
                    And: "⩓",
                    andand: "⩕",
                    andd: "⩜",
                    andslope: "⩘",
                    andv: "⩚",
                    ang: "∠",
                    ange: "⦤",
                    angle: "∠",
                    angmsd: "∡",
                    angmsdaa: "⦨",
                    angmsdab: "⦩",
                    angmsdac: "⦪",
                    angmsdad: "⦫",
                    angmsdae: "⦬",
                    angmsdaf: "⦭",
                    angmsdag: "⦮",
                    angmsdah: "⦯",
                    angrt: "∟",
                    angrtvb: "⊾",
                    angrtvbd: "⦝",
                    angsph: "∢",
                    angst: "Å",
                    angzarr: "⍼",
                    aogon: "ą",
                    Aogon: "Ą",
                    aopf: "𝕒",
                    Aopf: "𝔸",
                    ap: "≈",
                    apacir: "⩯",
                    ape: "≊",
                    apE: "⩰",
                    apid: "≋",
                    apos: "'",
                    ApplyFunction: "⁡",
                    approx: "≈",
                    approxeq: "≊",
                    aring: "å",
                    Aring: "Å",
                    ascr: "𝒶",
                    Ascr: "𝒜",
                    Assign: "≔",
                    ast: "*",
                    asymp: "≈",
                    asympeq: "≍",
                    atilde: "ã",
                    Atilde: "Ã",
                    auml: "ä",
                    Auml: "Ä",
                    awconint: "∳",
                    awint: "⨑",
                    backcong: "≌",
                    backepsilon: "϶",
                    backprime: "‵",
                    backsim: "∽",
                    backsimeq: "⋍",
                    Backslash: "∖",
                    Barv: "⫧",
                    barvee: "⊽",
                    barwed: "⌅",
                    Barwed: "⌆",
                    barwedge: "⌅",
                    bbrk: "⎵",
                    bbrktbrk: "⎶",
                    bcong: "≌",
                    bcy: "б",
                    Bcy: "Б",
                    bdquo: "„",
                    becaus: "∵",
                    because: "∵",
                    Because: "∵",
                    bemptyv: "⦰",
                    bepsi: "϶",
                    bernou: "ℬ",
                    Bernoullis: "ℬ",
                    beta: "β",
                    Beta: "Β",
                    beth: "ℶ",
                    between: "≬",
                    bfr: "𝔟",
                    Bfr: "𝔅",
                    bigcap: "⋂",
                    bigcirc: "◯",
                    bigcup: "⋃",
                    bigodot: "⨀",
                    bigoplus: "⨁",
                    bigotimes: "⨂",
                    bigsqcup: "⨆",
                    bigstar: "★",
                    bigtriangledown: "▽",
                    bigtriangleup: "△",
                    biguplus: "⨄",
                    bigvee: "⋁",
                    bigwedge: "⋀",
                    bkarow: "⤍",
                    blacklozenge: "⧫",
                    blacksquare: "▪",
                    blacktriangle: "▴",
                    blacktriangledown: "▾",
                    blacktriangleleft: "◂",
                    blacktriangleright: "▸",
                    blank: "␣",
                    blk12: "▒",
                    blk14: "░",
                    blk34: "▓",
                    block: "█",
                    bne: "=⃥",
                    bnequiv: "≡⃥",
                    bnot: "⌐",
                    bNot: "⫭",
                    bopf: "𝕓",
                    Bopf: "𝔹",
                    bot: "⊥",
                    bottom: "⊥",
                    bowtie: "⋈",
                    boxbox: "⧉",
                    boxdl: "┐",
                    boxdL: "╕",
                    boxDl: "╖",
                    boxDL: "╗",
                    boxdr: "┌",
                    boxdR: "╒",
                    boxDr: "╓",
                    boxDR: "╔",
                    boxh: "─",
                    boxH: "═",
                    boxhd: "┬",
                    boxhD: "╥",
                    boxHd: "╤",
                    boxHD: "╦",
                    boxhu: "┴",
                    boxhU: "╨",
                    boxHu: "╧",
                    boxHU: "╩",
                    boxminus: "⊟",
                    boxplus: "⊞",
                    boxtimes: "⊠",
                    boxul: "┘",
                    boxuL: "╛",
                    boxUl: "╜",
                    boxUL: "╝",
                    boxur: "└",
                    boxuR: "╘",
                    boxUr: "╙",
                    boxUR: "╚",
                    boxv: "│",
                    boxV: "║",
                    boxvh: "┼",
                    boxvH: "╪",
                    boxVh: "╫",
                    boxVH: "╬",
                    boxvl: "┤",
                    boxvL: "╡",
                    boxVl: "╢",
                    boxVL: "╣",
                    boxvr: "├",
                    boxvR: "╞",
                    boxVr: "╟",
                    boxVR: "╠",
                    bprime: "‵",
                    breve: "˘",
                    Breve: "˘",
                    brvbar: "¦",
                    bscr: "𝒷",
                    Bscr: "ℬ",
                    bsemi: "⁏",
                    bsim: "∽",
                    bsime: "⋍",
                    bsol: "\\",
                    bsolb: "⧅",
                    bsolhsub: "⟈",
                    bull: "•",
                    bullet: "•",
                    bump: "≎",
                    bumpe: "≏",
                    bumpE: "⪮",
                    bumpeq: "≏",
                    Bumpeq: "≎",
                    cacute: "ć",
                    Cacute: "Ć",
                    cap: "∩",
                    Cap: "⋒",
                    capand: "⩄",
                    capbrcup: "⩉",
                    capcap: "⩋",
                    capcup: "⩇",
                    capdot: "⩀",
                    CapitalDifferentialD: "ⅅ",
                    caps: "∩︀",
                    caret: "⁁",
                    caron: "ˇ",
                    Cayleys: "ℭ",
                    ccaps: "⩍",
                    ccaron: "č",
                    Ccaron: "Č",
                    ccedil: "ç",
                    Ccedil: "Ç",
                    ccirc: "ĉ",
                    Ccirc: "Ĉ",
                    Cconint: "∰",
                    ccups: "⩌",
                    ccupssm: "⩐",
                    cdot: "ċ",
                    Cdot: "Ċ",
                    cedil: "¸",
                    Cedilla: "¸",
                    cemptyv: "⦲",
                    cent: "¢",
                    centerdot: "·",
                    CenterDot: "·",
                    cfr: "𝔠",
                    Cfr: "ℭ",
                    chcy: "ч",
                    CHcy: "Ч",
                    check: "✓",
                    checkmark: "✓",
                    chi: "χ",
                    Chi: "Χ",
                    cir: "○",
                    circ: "ˆ",
                    circeq: "≗",
                    circlearrowleft: "↺",
                    circlearrowright: "↻",
                    circledast: "⊛",
                    circledcirc: "⊚",
                    circleddash: "⊝",
                    CircleDot: "⊙",
                    circledR: "®",
                    circledS: "Ⓢ",
                    CircleMinus: "⊖",
                    CirclePlus: "⊕",
                    CircleTimes: "⊗",
                    cire: "≗",
                    cirE: "⧃",
                    cirfnint: "⨐",
                    cirmid: "⫯",
                    cirscir: "⧂",
                    ClockwiseContourIntegral: "∲",
                    CloseCurlyDoubleQuote: "”",
                    CloseCurlyQuote: "’",
                    clubs: "♣",
                    clubsuit: "♣",
                    colon: ":",
                    Colon: "∷",
                    colone: "≔",
                    Colone: "⩴",
                    coloneq: "≔",
                    comma: ",",
                    commat: "@",
                    comp: "∁",
                    compfn: "∘",
                    complement: "∁",
                    complexes: "ℂ",
                    cong: "≅",
                    congdot: "⩭",
                    Congruent: "≡",
                    conint: "∮",
                    Conint: "∯",
                    ContourIntegral: "∮",
                    copf: "𝕔",
                    Copf: "ℂ",
                    coprod: "∐",
                    Coproduct: "∐",
                    copy: "©",
                    COPY: "©",
                    copysr: "℗",
                    CounterClockwiseContourIntegral: "∳",
                    crarr: "↵",
                    cross: "✗",
                    Cross: "⨯",
                    cscr: "𝒸",
                    Cscr: "𝒞",
                    csub: "⫏",
                    csube: "⫑",
                    csup: "⫐",
                    csupe: "⫒",
                    ctdot: "⋯",
                    cudarrl: "⤸",
                    cudarrr: "⤵",
                    cuepr: "⋞",
                    cuesc: "⋟",
                    cularr: "↶",
                    cularrp: "⤽",
                    cup: "∪",
                    Cup: "⋓",
                    cupbrcap: "⩈",
                    cupcap: "⩆",
                    CupCap: "≍",
                    cupcup: "⩊",
                    cupdot: "⊍",
                    cupor: "⩅",
                    cups: "∪︀",
                    curarr: "↷",
                    curarrm: "⤼",
                    curlyeqprec: "⋞",
                    curlyeqsucc: "⋟",
                    curlyvee: "⋎",
                    curlywedge: "⋏",
                    curren: "¤",
                    curvearrowleft: "↶",
                    curvearrowright: "↷",
                    cuvee: "⋎",
                    cuwed: "⋏",
                    cwconint: "∲",
                    cwint: "∱",
                    cylcty: "⌭",
                    dagger: "†",
                    Dagger: "‡",
                    daleth: "ℸ",
                    darr: "↓",
                    dArr: "⇓",
                    Darr: "↡",
                    dash: "‐",
                    dashv: "⊣",
                    Dashv: "⫤",
                    dbkarow: "⤏",
                    dblac: "˝",
                    dcaron: "ď",
                    Dcaron: "Ď",
                    dcy: "д",
                    Dcy: "Д",
                    dd: "ⅆ",
                    DD: "ⅅ",
                    ddagger: "‡",
                    ddarr: "⇊",
                    DDotrahd: "⤑",
                    ddotseq: "⩷",
                    deg: "°",
                    Del: "∇",
                    delta: "δ",
                    Delta: "Δ",
                    demptyv: "⦱",
                    dfisht: "⥿",
                    dfr: "𝔡",
                    Dfr: "𝔇",
                    dHar: "⥥",
                    dharl: "⇃",
                    dharr: "⇂",
                    DiacriticalAcute: "´",
                    DiacriticalDot: "˙",
                    DiacriticalDoubleAcute: "˝",
                    DiacriticalGrave: "`",
                    DiacriticalTilde: "˜",
                    diam: "⋄",
                    diamond: "⋄",
                    Diamond: "⋄",
                    diamondsuit: "♦",
                    diams: "♦",
                    die: "¨",
                    DifferentialD: "ⅆ",
                    digamma: "ϝ",
                    disin: "⋲",
                    div: "÷",
                    divide: "÷",
                    divideontimes: "⋇",
                    divonx: "⋇",
                    djcy: "ђ",
                    DJcy: "Ђ",
                    dlcorn: "⌞",
                    dlcrop: "⌍",
                    dollar: "$",
                    dopf: "𝕕",
                    Dopf: "𝔻",
                    dot: "˙",
                    Dot: "¨",
                    DotDot: "⃜",
                    doteq: "≐",
                    doteqdot: "≑",
                    DotEqual: "≐",
                    dotminus: "∸",
                    dotplus: "∔",
                    dotsquare: "⊡",
                    doublebarwedge: "⌆",
                    DoubleContourIntegral: "∯",
                    DoubleDot: "¨",
                    DoubleDownArrow: "⇓",
                    DoubleLeftArrow: "⇐",
                    DoubleLeftRightArrow: "⇔",
                    DoubleLeftTee: "⫤",
                    DoubleLongLeftArrow: "⟸",
                    DoubleLongLeftRightArrow: "⟺",
                    DoubleLongRightArrow: "⟹",
                    DoubleRightArrow: "⇒",
                    DoubleRightTee: "⊨",
                    DoubleUpArrow: "⇑",
                    DoubleUpDownArrow: "⇕",
                    DoubleVerticalBar: "∥",
                    downarrow: "↓",
                    Downarrow: "⇓",
                    DownArrow: "↓",
                    DownArrowBar: "⤓",
                    DownArrowUpArrow: "⇵",
                    DownBreve: "̑",
                    downdownarrows: "⇊",
                    downharpoonleft: "⇃",
                    downharpoonright: "⇂",
                    DownLeftRightVector: "⥐",
                    DownLeftTeeVector: "⥞",
                    DownLeftVector: "↽",
                    DownLeftVectorBar: "⥖",
                    DownRightTeeVector: "⥟",
                    DownRightVector: "⇁",
                    DownRightVectorBar: "⥗",
                    DownTee: "⊤",
                    DownTeeArrow: "↧",
                    drbkarow: "⤐",
                    drcorn: "⌟",
                    drcrop: "⌌",
                    dscr: "𝒹",
                    Dscr: "𝒟",
                    dscy: "ѕ",
                    DScy: "Ѕ",
                    dsol: "⧶",
                    dstrok: "đ",
                    Dstrok: "Đ",
                    dtdot: "⋱",
                    dtri: "▿",
                    dtrif: "▾",
                    duarr: "⇵",
                    duhar: "⥯",
                    dwangle: "⦦",
                    dzcy: "џ",
                    DZcy: "Џ",
                    dzigrarr: "⟿",
                    eacute: "é",
                    Eacute: "É",
                    easter: "⩮",
                    ecaron: "ě",
                    Ecaron: "Ě",
                    ecir: "≖",
                    ecirc: "ê",
                    Ecirc: "Ê",
                    ecolon: "≕",
                    ecy: "э",
                    Ecy: "Э",
                    eDDot: "⩷",
                    edot: "ė",
                    eDot: "≑",
                    Edot: "Ė",
                    ee: "ⅇ",
                    efDot: "≒",
                    efr: "𝔢",
                    Efr: "𝔈",
                    eg: "⪚",
                    egrave: "è",
                    Egrave: "È",
                    egs: "⪖",
                    egsdot: "⪘",
                    el: "⪙",
                    Element: "∈",
                    elinters: "⏧",
                    ell: "ℓ",
                    els: "⪕",
                    elsdot: "⪗",
                    emacr: "ē",
                    Emacr: "Ē",
                    empty: "∅",
                    emptyset: "∅",
                    EmptySmallSquare: "◻",
                    emptyv: "∅",
                    EmptyVerySmallSquare: "▫",
                    emsp: " ",
                    emsp13: " ",
                    emsp14: " ",
                    eng: "ŋ",
                    ENG: "Ŋ",
                    ensp: " ",
                    eogon: "ę",
                    Eogon: "Ę",
                    eopf: "𝕖",
                    Eopf: "𝔼",
                    epar: "⋕",
                    eparsl: "⧣",
                    eplus: "⩱",
                    epsi: "ε",
                    epsilon: "ε",
                    Epsilon: "Ε",
                    epsiv: "ϵ",
                    eqcirc: "≖",
                    eqcolon: "≕",
                    eqsim: "≂",
                    eqslantgtr: "⪖",
                    eqslantless: "⪕",
                    Equal: "⩵",
                    equals: "=",
                    EqualTilde: "≂",
                    equest: "≟",
                    Equilibrium: "⇌",
                    equiv: "≡",
                    equivDD: "⩸",
                    eqvparsl: "⧥",
                    erarr: "⥱",
                    erDot: "≓",
                    escr: "ℯ",
                    Escr: "ℰ",
                    esdot: "≐",
                    esim: "≂",
                    Esim: "⩳",
                    eta: "η",
                    Eta: "Η",
                    eth: "ð",
                    ETH: "Ð",
                    euml: "ë",
                    Euml: "Ë",
                    euro: "€",
                    excl: "!",
                    exist: "∃",
                    Exists: "∃",
                    expectation: "ℰ",
                    exponentiale: "ⅇ",
                    ExponentialE: "ⅇ",
                    fallingdotseq: "≒",
                    fcy: "ф",
                    Fcy: "Ф",
                    female: "♀",
                    ffilig: "ﬃ",
                    fflig: "ﬀ",
                    ffllig: "ﬄ",
                    ffr: "𝔣",
                    Ffr: "𝔉",
                    filig: "ﬁ",
                    FilledSmallSquare: "◼",
                    FilledVerySmallSquare: "▪",
                    fjlig: "fj",
                    flat: "♭",
                    fllig: "ﬂ",
                    fltns: "▱",
                    fnof: "ƒ",
                    fopf: "𝕗",
                    Fopf: "𝔽",
                    forall: "∀",
                    ForAll: "∀",
                    fork: "⋔",
                    forkv: "⫙",
                    Fouriertrf: "ℱ",
                    fpartint: "⨍",
                    frac12: "½",
                    frac13: "⅓",
                    frac14: "¼",
                    frac15: "⅕",
                    frac16: "⅙",
                    frac18: "⅛",
                    frac23: "⅔",
                    frac25: "⅖",
                    frac34: "¾",
                    frac35: "⅗",
                    frac38: "⅜",
                    frac45: "⅘",
                    frac56: "⅚",
                    frac58: "⅝",
                    frac78: "⅞",
                    frasl: "⁄",
                    frown: "⌢",
                    fscr: "𝒻",
                    Fscr: "ℱ",
                    gacute: "ǵ",
                    gamma: "γ",
                    Gamma: "Γ",
                    gammad: "ϝ",
                    Gammad: "Ϝ",
                    gap: "⪆",
                    gbreve: "ğ",
                    Gbreve: "Ğ",
                    Gcedil: "Ģ",
                    gcirc: "ĝ",
                    Gcirc: "Ĝ",
                    gcy: "г",
                    Gcy: "Г",
                    gdot: "ġ",
                    Gdot: "Ġ",
                    ge: "≥",
                    gE: "≧",
                    gel: "⋛",
                    gEl: "⪌",
                    geq: "≥",
                    geqq: "≧",
                    geqslant: "⩾",
                    ges: "⩾",
                    gescc: "⪩",
                    gesdot: "⪀",
                    gesdoto: "⪂",
                    gesdotol: "⪄",
                    gesl: "⋛︀",
                    gesles: "⪔",
                    gfr: "𝔤",
                    Gfr: "𝔊",
                    gg: "≫",
                    Gg: "⋙",
                    ggg: "⋙",
                    gimel: "ℷ",
                    gjcy: "ѓ",
                    GJcy: "Ѓ",
                    gl: "≷",
                    gla: "⪥",
                    glE: "⪒",
                    glj: "⪤",
                    gnap: "⪊",
                    gnapprox: "⪊",
                    gne: "⪈",
                    gnE: "≩",
                    gneq: "⪈",
                    gneqq: "≩",
                    gnsim: "⋧",
                    gopf: "𝕘",
                    Gopf: "𝔾",
                    grave: "`",
                    GreaterEqual: "≥",
                    GreaterEqualLess: "⋛",
                    GreaterFullEqual: "≧",
                    GreaterGreater: "⪢",
                    GreaterLess: "≷",
                    GreaterSlantEqual: "⩾",
                    GreaterTilde: "≳",
                    gscr: "ℊ",
                    Gscr: "𝒢",
                    gsim: "≳",
                    gsime: "⪎",
                    gsiml: "⪐",
                    gt: ">",
                    Gt: "≫",
                    GT: ">",
                    gtcc: "⪧",
                    gtcir: "⩺",
                    gtdot: "⋗",
                    gtlPar: "⦕",
                    gtquest: "⩼",
                    gtrapprox: "⪆",
                    gtrarr: "⥸",
                    gtrdot: "⋗",
                    gtreqless: "⋛",
                    gtreqqless: "⪌",
                    gtrless: "≷",
                    gtrsim: "≳",
                    gvertneqq: "≩︀",
                    gvnE: "≩︀",
                    Hacek: "ˇ",
                    hairsp: " ",
                    half: "½",
                    hamilt: "ℋ",
                    hardcy: "ъ",
                    HARDcy: "Ъ",
                    harr: "↔",
                    hArr: "⇔",
                    harrcir: "⥈",
                    harrw: "↭",
                    Hat: "^",
                    hbar: "ℏ",
                    hcirc: "ĥ",
                    Hcirc: "Ĥ",
                    hearts: "♥",
                    heartsuit: "♥",
                    hellip: "…",
                    hercon: "⊹",
                    hfr: "𝔥",
                    Hfr: "ℌ",
                    HilbertSpace: "ℋ",
                    hksearow: "⤥",
                    hkswarow: "⤦",
                    hoarr: "⇿",
                    homtht: "∻",
                    hookleftarrow: "↩",
                    hookrightarrow: "↪",
                    hopf: "𝕙",
                    Hopf: "ℍ",
                    horbar: "―",
                    HorizontalLine: "─",
                    hscr: "𝒽",
                    Hscr: "ℋ",
                    hslash: "ℏ",
                    hstrok: "ħ",
                    Hstrok: "Ħ",
                    HumpDownHump: "≎",
                    HumpEqual: "≏",
                    hybull: "⁃",
                    hyphen: "‐",
                    iacute: "í",
                    Iacute: "Í",
                    ic: "⁣",
                    icirc: "î",
                    Icirc: "Î",
                    icy: "и",
                    Icy: "И",
                    Idot: "İ",
                    iecy: "е",
                    IEcy: "Е",
                    iexcl: "¡",
                    iff: "⇔",
                    ifr: "𝔦",
                    Ifr: "ℑ",
                    igrave: "ì",
                    Igrave: "Ì",
                    ii: "ⅈ",
                    iiiint: "⨌",
                    iiint: "∭",
                    iinfin: "⧜",
                    iiota: "℩",
                    ijlig: "ĳ",
                    IJlig: "Ĳ",
                    Im: "ℑ",
                    imacr: "ī",
                    Imacr: "Ī",
                    image: "ℑ",
                    ImaginaryI: "ⅈ",
                    imagline: "ℐ",
                    imagpart: "ℑ",
                    imath: "ı",
                    imof: "⊷",
                    imped: "Ƶ",
                    Implies: "⇒",
                    in: "∈",
                    incare: "℅",
                    infin: "∞",
                    infintie: "⧝",
                    inodot: "ı",
                    int: "∫",
                    Int: "∬",
                    intcal: "⊺",
                    integers: "ℤ",
                    Integral: "∫",
                    intercal: "⊺",
                    Intersection: "⋂",
                    intlarhk: "⨗",
                    intprod: "⨼",
                    InvisibleComma: "⁣",
                    InvisibleTimes: "⁢",
                    iocy: "ё",
                    IOcy: "Ё",
                    iogon: "į",
                    Iogon: "Į",
                    iopf: "𝕚",
                    Iopf: "𝕀",
                    iota: "ι",
                    Iota: "Ι",
                    iprod: "⨼",
                    iquest: "¿",
                    iscr: "𝒾",
                    Iscr: "ℐ",
                    isin: "∈",
                    isindot: "⋵",
                    isinE: "⋹",
                    isins: "⋴",
                    isinsv: "⋳",
                    isinv: "∈",
                    it: "⁢",
                    itilde: "ĩ",
                    Itilde: "Ĩ",
                    iukcy: "і",
                    Iukcy: "І",
                    iuml: "ï",
                    Iuml: "Ï",
                    jcirc: "ĵ",
                    Jcirc: "Ĵ",
                    jcy: "й",
                    Jcy: "Й",
                    jfr: "𝔧",
                    Jfr: "𝔍",
                    jmath: "ȷ",
                    jopf: "𝕛",
                    Jopf: "𝕁",
                    jscr: "𝒿",
                    Jscr: "𝒥",
                    jsercy: "ј",
                    Jsercy: "Ј",
                    jukcy: "є",
                    Jukcy: "Є",
                    kappa: "κ",
                    Kappa: "Κ",
                    kappav: "ϰ",
                    kcedil: "ķ",
                    Kcedil: "Ķ",
                    kcy: "к",
                    Kcy: "К",
                    kfr: "𝔨",
                    Kfr: "𝔎",
                    kgreen: "ĸ",
                    khcy: "х",
                    KHcy: "Х",
                    kjcy: "ќ",
                    KJcy: "Ќ",
                    kopf: "𝕜",
                    Kopf: "𝕂",
                    kscr: "𝓀",
                    Kscr: "𝒦",
                    lAarr: "⇚",
                    lacute: "ĺ",
                    Lacute: "Ĺ",
                    laemptyv: "⦴",
                    lagran: "ℒ",
                    lambda: "λ",
                    Lambda: "Λ",
                    lang: "⟨",
                    Lang: "⟪",
                    langd: "⦑",
                    langle: "⟨",
                    lap: "⪅",
                    Laplacetrf: "ℒ",
                    laquo: "«",
                    larr: "←",
                    lArr: "⇐",
                    Larr: "↞",
                    larrb: "⇤",
                    larrbfs: "⤟",
                    larrfs: "⤝",
                    larrhk: "↩",
                    larrlp: "↫",
                    larrpl: "⤹",
                    larrsim: "⥳",
                    larrtl: "↢",
                    lat: "⪫",
                    latail: "⤙",
                    lAtail: "⤛",
                    late: "⪭",
                    lates: "⪭︀",
                    lbarr: "⤌",
                    lBarr: "⤎",
                    lbbrk: "❲",
                    lbrace: "{",
                    lbrack: "[",
                    lbrke: "⦋",
                    lbrksld: "⦏",
                    lbrkslu: "⦍",
                    lcaron: "ľ",
                    Lcaron: "Ľ",
                    lcedil: "ļ",
                    Lcedil: "Ļ",
                    lceil: "⌈",
                    lcub: "{",
                    lcy: "л",
                    Lcy: "Л",
                    ldca: "⤶",
                    ldquo: "“",
                    ldquor: "„",
                    ldrdhar: "⥧",
                    ldrushar: "⥋",
                    ldsh: "↲",
                    le: "≤",
                    lE: "≦",
                    LeftAngleBracket: "⟨",
                    leftarrow: "←",
                    Leftarrow: "⇐",
                    LeftArrow: "←",
                    LeftArrowBar: "⇤",
                    LeftArrowRightArrow: "⇆",
                    leftarrowtail: "↢",
                    LeftCeiling: "⌈",
                    LeftDoubleBracket: "⟦",
                    LeftDownTeeVector: "⥡",
                    LeftDownVector: "⇃",
                    LeftDownVectorBar: "⥙",
                    LeftFloor: "⌊",
                    leftharpoondown: "↽",
                    leftharpoonup: "↼",
                    leftleftarrows: "⇇",
                    leftrightarrow: "↔",
                    Leftrightarrow: "⇔",
                    LeftRightArrow: "↔",
                    leftrightarrows: "⇆",
                    leftrightharpoons: "⇋",
                    leftrightsquigarrow: "↭",
                    LeftRightVector: "⥎",
                    LeftTee: "⊣",
                    LeftTeeArrow: "↤",
                    LeftTeeVector: "⥚",
                    leftthreetimes: "⋋",
                    LeftTriangle: "⊲",
                    LeftTriangleBar: "⧏",
                    LeftTriangleEqual: "⊴",
                    LeftUpDownVector: "⥑",
                    LeftUpTeeVector: "⥠",
                    LeftUpVector: "↿",
                    LeftUpVectorBar: "⥘",
                    LeftVector: "↼",
                    LeftVectorBar: "⥒",
                    leg: "⋚",
                    lEg: "⪋",
                    leq: "≤",
                    leqq: "≦",
                    leqslant: "⩽",
                    les: "⩽",
                    lescc: "⪨",
                    lesdot: "⩿",
                    lesdoto: "⪁",
                    lesdotor: "⪃",
                    lesg: "⋚︀",
                    lesges: "⪓",
                    lessapprox: "⪅",
                    lessdot: "⋖",
                    lesseqgtr: "⋚",
                    lesseqqgtr: "⪋",
                    LessEqualGreater: "⋚",
                    LessFullEqual: "≦",
                    LessGreater: "≶",
                    lessgtr: "≶",
                    LessLess: "⪡",
                    lesssim: "≲",
                    LessSlantEqual: "⩽",
                    LessTilde: "≲",
                    lfisht: "⥼",
                    lfloor: "⌊",
                    lfr: "𝔩",
                    Lfr: "𝔏",
                    lg: "≶",
                    lgE: "⪑",
                    lHar: "⥢",
                    lhard: "↽",
                    lharu: "↼",
                    lharul: "⥪",
                    lhblk: "▄",
                    ljcy: "љ",
                    LJcy: "Љ",
                    ll: "≪",
                    Ll: "⋘",
                    llarr: "⇇",
                    llcorner: "⌞",
                    Lleftarrow: "⇚",
                    llhard: "⥫",
                    lltri: "◺",
                    lmidot: "ŀ",
                    Lmidot: "Ŀ",
                    lmoust: "⎰",
                    lmoustache: "⎰",
                    lnap: "⪉",
                    lnapprox: "⪉",
                    lne: "⪇",
                    lnE: "≨",
                    lneq: "⪇",
                    lneqq: "≨",
                    lnsim: "⋦",
                    loang: "⟬",
                    loarr: "⇽",
                    lobrk: "⟦",
                    longleftarrow: "⟵",
                    Longleftarrow: "⟸",
                    LongLeftArrow: "⟵",
                    longleftrightarrow: "⟷",
                    Longleftrightarrow: "⟺",
                    LongLeftRightArrow: "⟷",
                    longmapsto: "⟼",
                    longrightarrow: "⟶",
                    Longrightarrow: "⟹",
                    LongRightArrow: "⟶",
                    looparrowleft: "↫",
                    looparrowright: "↬",
                    lopar: "⦅",
                    lopf: "𝕝",
                    Lopf: "𝕃",
                    loplus: "⨭",
                    lotimes: "⨴",
                    lowast: "∗",
                    lowbar: "_",
                    LowerLeftArrow: "↙",
                    LowerRightArrow: "↘",
                    loz: "◊",
                    lozenge: "◊",
                    lozf: "⧫",
                    lpar: "(",
                    lparlt: "⦓",
                    lrarr: "⇆",
                    lrcorner: "⌟",
                    lrhar: "⇋",
                    lrhard: "⥭",
                    lrm: "‎",
                    lrtri: "⊿",
                    lsaquo: "‹",
                    lscr: "𝓁",
                    Lscr: "ℒ",
                    lsh: "↰",
                    Lsh: "↰",
                    lsim: "≲",
                    lsime: "⪍",
                    lsimg: "⪏",
                    lsqb: "[",
                    lsquo: "‘",
                    lsquor: "‚",
                    lstrok: "ł",
                    Lstrok: "Ł",
                    lt: "<",
                    Lt: "≪",
                    LT: "<",
                    ltcc: "⪦",
                    ltcir: "⩹",
                    ltdot: "⋖",
                    lthree: "⋋",
                    ltimes: "⋉",
                    ltlarr: "⥶",
                    ltquest: "⩻",
                    ltri: "◃",
                    ltrie: "⊴",
                    ltrif: "◂",
                    ltrPar: "⦖",
                    lurdshar: "⥊",
                    luruhar: "⥦",
                    lvertneqq: "≨︀",
                    lvnE: "≨︀",
                    macr: "¯",
                    male: "♂",
                    malt: "✠",
                    maltese: "✠",
                    map: "↦",
                    Map: "⤅",
                    mapsto: "↦",
                    mapstodown: "↧",
                    mapstoleft: "↤",
                    mapstoup: "↥",
                    marker: "▮",
                    mcomma: "⨩",
                    mcy: "м",
                    Mcy: "М",
                    mdash: "—",
                    mDDot: "∺",
                    measuredangle: "∡",
                    MediumSpace: " ",
                    Mellintrf: "ℳ",
                    mfr: "𝔪",
                    Mfr: "𝔐",
                    mho: "℧",
                    micro: "µ",
                    mid: "∣",
                    midast: "*",
                    midcir: "⫰",
                    middot: "·",
                    minus: "−",
                    minusb: "⊟",
                    minusd: "∸",
                    minusdu: "⨪",
                    MinusPlus: "∓",
                    mlcp: "⫛",
                    mldr: "…",
                    mnplus: "∓",
                    models: "⊧",
                    mopf: "𝕞",
                    Mopf: "𝕄",
                    mp: "∓",
                    mscr: "𝓂",
                    Mscr: "ℳ",
                    mstpos: "∾",
                    mu: "μ",
                    Mu: "Μ",
                    multimap: "⊸",
                    mumap: "⊸",
                    nabla: "∇",
                    nacute: "ń",
                    Nacute: "Ń",
                    nang: "∠⃒",
                    nap: "≉",
                    napE: "⩰̸",
                    napid: "≋̸",
                    napos: "ŉ",
                    napprox: "≉",
                    natur: "♮",
                    natural: "♮",
                    naturals: "ℕ",
                    nbsp: " ",
                    nbump: "≎̸",
                    nbumpe: "≏̸",
                    ncap: "⩃",
                    ncaron: "ň",
                    Ncaron: "Ň",
                    ncedil: "ņ",
                    Ncedil: "Ņ",
                    ncong: "≇",
                    ncongdot: "⩭̸",
                    ncup: "⩂",
                    ncy: "н",
                    Ncy: "Н",
                    ndash: "–",
                    ne: "≠",
                    nearhk: "⤤",
                    nearr: "↗",
                    neArr: "⇗",
                    nearrow: "↗",
                    nedot: "≐̸",
                    NegativeMediumSpace: "​",
                    NegativeThickSpace: "​",
                    NegativeThinSpace: "​",
                    NegativeVeryThinSpace: "​",
                    nequiv: "≢",
                    nesear: "⤨",
                    nesim: "≂̸",
                    NestedGreaterGreater: "≫",
                    NestedLessLess: "≪",
                    NewLine: "\n",
                    nexist: "∄",
                    nexists: "∄",
                    nfr: "𝔫",
                    Nfr: "𝔑",
                    nge: "≱",
                    ngE: "≧̸",
                    ngeq: "≱",
                    ngeqq: "≧̸",
                    ngeqslant: "⩾̸",
                    nges: "⩾̸",
                    nGg: "⋙̸",
                    ngsim: "≵",
                    ngt: "≯",
                    nGt: "≫⃒",
                    ngtr: "≯",
                    nGtv: "≫̸",
                    nharr: "↮",
                    nhArr: "⇎",
                    nhpar: "⫲",
                    ni: "∋",
                    nis: "⋼",
                    nisd: "⋺",
                    niv: "∋",
                    njcy: "њ",
                    NJcy: "Њ",
                    nlarr: "↚",
                    nlArr: "⇍",
                    nldr: "‥",
                    nle: "≰",
                    nlE: "≦̸",
                    nleftarrow: "↚",
                    nLeftarrow: "⇍",
                    nleftrightarrow: "↮",
                    nLeftrightarrow: "⇎",
                    nleq: "≰",
                    nleqq: "≦̸",
                    nleqslant: "⩽̸",
                    nles: "⩽̸",
                    nless: "≮",
                    nLl: "⋘̸",
                    nlsim: "≴",
                    nlt: "≮",
                    nLt: "≪⃒",
                    nltri: "⋪",
                    nltrie: "⋬",
                    nLtv: "≪̸",
                    nmid: "∤",
                    NoBreak: "⁠",
                    NonBreakingSpace: " ",
                    nopf: "𝕟",
                    Nopf: "ℕ",
                    not: "¬",
                    Not: "⫬",
                    NotCongruent: "≢",
                    NotCupCap: "≭",
                    NotDoubleVerticalBar: "∦",
                    NotElement: "∉",
                    NotEqual: "≠",
                    NotEqualTilde: "≂̸",
                    NotExists: "∄",
                    NotGreater: "≯",
                    NotGreaterEqual: "≱",
                    NotGreaterFullEqual: "≧̸",
                    NotGreaterGreater: "≫̸",
                    NotGreaterLess: "≹",
                    NotGreaterSlantEqual: "⩾̸",
                    NotGreaterTilde: "≵",
                    NotHumpDownHump: "≎̸",
                    NotHumpEqual: "≏̸",
                    notin: "∉",
                    notindot: "⋵̸",
                    notinE: "⋹̸",
                    notinva: "∉",
                    notinvb: "⋷",
                    notinvc: "⋶",
                    NotLeftTriangle: "⋪",
                    NotLeftTriangleBar: "⧏̸",
                    NotLeftTriangleEqual: "⋬",
                    NotLess: "≮",
                    NotLessEqual: "≰",
                    NotLessGreater: "≸",
                    NotLessLess: "≪̸",
                    NotLessSlantEqual: "⩽̸",
                    NotLessTilde: "≴",
                    NotNestedGreaterGreater: "⪢̸",
                    NotNestedLessLess: "⪡̸",
                    notni: "∌",
                    notniva: "∌",
                    notnivb: "⋾",
                    notnivc: "⋽",
                    NotPrecedes: "⊀",
                    NotPrecedesEqual: "⪯̸",
                    NotPrecedesSlantEqual: "⋠",
                    NotReverseElement: "∌",
                    NotRightTriangle: "⋫",
                    NotRightTriangleBar: "⧐̸",
                    NotRightTriangleEqual: "⋭",
                    NotSquareSubset: "⊏̸",
                    NotSquareSubsetEqual: "⋢",
                    NotSquareSuperset: "⊐̸",
                    NotSquareSupersetEqual: "⋣",
                    NotSubset: "⊂⃒",
                    NotSubsetEqual: "⊈",
                    NotSucceeds: "⊁",
                    NotSucceedsEqual: "⪰̸",
                    NotSucceedsSlantEqual: "⋡",
                    NotSucceedsTilde: "≿̸",
                    NotSuperset: "⊃⃒",
                    NotSupersetEqual: "⊉",
                    NotTilde: "≁",
                    NotTildeEqual: "≄",
                    NotTildeFullEqual: "≇",
                    NotTildeTilde: "≉",
                    NotVerticalBar: "∤",
                    npar: "∦",
                    nparallel: "∦",
                    nparsl: "⫽⃥",
                    npart: "∂̸",
                    npolint: "⨔",
                    npr: "⊀",
                    nprcue: "⋠",
                    npre: "⪯̸",
                    nprec: "⊀",
                    npreceq: "⪯̸",
                    nrarr: "↛",
                    nrArr: "⇏",
                    nrarrc: "⤳̸",
                    nrarrw: "↝̸",
                    nrightarrow: "↛",
                    nRightarrow: "⇏",
                    nrtri: "⋫",
                    nrtrie: "⋭",
                    nsc: "⊁",
                    nsccue: "⋡",
                    nsce: "⪰̸",
                    nscr: "𝓃",
                    Nscr: "𝒩",
                    nshortmid: "∤",
                    nshortparallel: "∦",
                    nsim: "≁",
                    nsime: "≄",
                    nsimeq: "≄",
                    nsmid: "∤",
                    nspar: "∦",
                    nsqsube: "⋢",
                    nsqsupe: "⋣",
                    nsub: "⊄",
                    nsube: "⊈",
                    nsubE: "⫅̸",
                    nsubset: "⊂⃒",
                    nsubseteq: "⊈",
                    nsubseteqq: "⫅̸",
                    nsucc: "⊁",
                    nsucceq: "⪰̸",
                    nsup: "⊅",
                    nsupe: "⊉",
                    nsupE: "⫆̸",
                    nsupset: "⊃⃒",
                    nsupseteq: "⊉",
                    nsupseteqq: "⫆̸",
                    ntgl: "≹",
                    ntilde: "ñ",
                    Ntilde: "Ñ",
                    ntlg: "≸",
                    ntriangleleft: "⋪",
                    ntrianglelefteq: "⋬",
                    ntriangleright: "⋫",
                    ntrianglerighteq: "⋭",
                    nu: "ν",
                    Nu: "Ν",
                    num: "#",
                    numero: "№",
                    numsp: " ",
                    nvap: "≍⃒",
                    nvdash: "⊬",
                    nvDash: "⊭",
                    nVdash: "⊮",
                    nVDash: "⊯",
                    nvge: "≥⃒",
                    nvgt: ">⃒",
                    nvHarr: "⤄",
                    nvinfin: "⧞",
                    nvlArr: "⤂",
                    nvle: "≤⃒",
                    nvlt: "<⃒",
                    nvltrie: "⊴⃒",
                    nvrArr: "⤃",
                    nvrtrie: "⊵⃒",
                    nvsim: "∼⃒",
                    nwarhk: "⤣",
                    nwarr: "↖",
                    nwArr: "⇖",
                    nwarrow: "↖",
                    nwnear: "⤧",
                    oacute: "ó",
                    Oacute: "Ó",
                    oast: "⊛",
                    ocir: "⊚",
                    ocirc: "ô",
                    Ocirc: "Ô",
                    ocy: "о",
                    Ocy: "О",
                    odash: "⊝",
                    odblac: "ő",
                    Odblac: "Ő",
                    odiv: "⨸",
                    odot: "⊙",
                    odsold: "⦼",
                    oelig: "œ",
                    OElig: "Œ",
                    ofcir: "⦿",
                    ofr: "𝔬",
                    Ofr: "𝔒",
                    ogon: "˛",
                    ograve: "ò",
                    Ograve: "Ò",
                    ogt: "⧁",
                    ohbar: "⦵",
                    ohm: "Ω",
                    oint: "∮",
                    olarr: "↺",
                    olcir: "⦾",
                    olcross: "⦻",
                    oline: "‾",
                    olt: "⧀",
                    omacr: "ō",
                    Omacr: "Ō",
                    omega: "ω",
                    Omega: "Ω",
                    omicron: "ο",
                    Omicron: "Ο",
                    omid: "⦶",
                    ominus: "⊖",
                    oopf: "𝕠",
                    Oopf: "𝕆",
                    opar: "⦷",
                    OpenCurlyDoubleQuote: "“",
                    OpenCurlyQuote: "‘",
                    operp: "⦹",
                    oplus: "⊕",
                    or: "∨",
                    Or: "⩔",
                    orarr: "↻",
                    ord: "⩝",
                    order: "ℴ",
                    orderof: "ℴ",
                    ordf: "ª",
                    ordm: "º",
                    origof: "⊶",
                    oror: "⩖",
                    orslope: "⩗",
                    orv: "⩛",
                    oS: "Ⓢ",
                    oscr: "ℴ",
                    Oscr: "𝒪",
                    oslash: "ø",
                    Oslash: "Ø",
                    osol: "⊘",
                    otilde: "õ",
                    Otilde: "Õ",
                    otimes: "⊗",
                    Otimes: "⨷",
                    otimesas: "⨶",
                    ouml: "ö",
                    Ouml: "Ö",
                    ovbar: "⌽",
                    OverBar: "‾",
                    OverBrace: "⏞",
                    OverBracket: "⎴",
                    OverParenthesis: "⏜",
                    par: "∥",
                    para: "¶",
                    parallel: "∥",
                    parsim: "⫳",
                    parsl: "⫽",
                    part: "∂",
                    PartialD: "∂",
                    pcy: "п",
                    Pcy: "П",
                    percnt: "%",
                    period: ".",
                    permil: "‰",
                    perp: "⊥",
                    pertenk: "‱",
                    pfr: "𝔭",
                    Pfr: "𝔓",
                    phi: "φ",
                    Phi: "Φ",
                    phiv: "ϕ",
                    phmmat: "ℳ",
                    phone: "☎",
                    pi: "π",
                    Pi: "Π",
                    pitchfork: "⋔",
                    piv: "ϖ",
                    planck: "ℏ",
                    planckh: "ℎ",
                    plankv: "ℏ",
                    plus: "+",
                    plusacir: "⨣",
                    plusb: "⊞",
                    pluscir: "⨢",
                    plusdo: "∔",
                    plusdu: "⨥",
                    pluse: "⩲",
                    PlusMinus: "±",
                    plusmn: "±",
                    plussim: "⨦",
                    plustwo: "⨧",
                    pm: "±",
                    Poincareplane: "ℌ",
                    pointint: "⨕",
                    popf: "𝕡",
                    Popf: "ℙ",
                    pound: "£",
                    pr: "≺",
                    Pr: "⪻",
                    prap: "⪷",
                    prcue: "≼",
                    pre: "⪯",
                    prE: "⪳",
                    prec: "≺",
                    precapprox: "⪷",
                    preccurlyeq: "≼",
                    Precedes: "≺",
                    PrecedesEqual: "⪯",
                    PrecedesSlantEqual: "≼",
                    PrecedesTilde: "≾",
                    preceq: "⪯",
                    precnapprox: "⪹",
                    precneqq: "⪵",
                    precnsim: "⋨",
                    precsim: "≾",
                    prime: "′",
                    Prime: "″",
                    primes: "ℙ",
                    prnap: "⪹",
                    prnE: "⪵",
                    prnsim: "⋨",
                    prod: "∏",
                    Product: "∏",
                    profalar: "⌮",
                    profline: "⌒",
                    profsurf: "⌓",
                    prop: "∝",
                    Proportion: "∷",
                    Proportional: "∝",
                    propto: "∝",
                    prsim: "≾",
                    prurel: "⊰",
                    pscr: "𝓅",
                    Pscr: "𝒫",
                    psi: "ψ",
                    Psi: "Ψ",
                    puncsp: " ",
                    qfr: "𝔮",
                    Qfr: "𝔔",
                    qint: "⨌",
                    qopf: "𝕢",
                    Qopf: "ℚ",
                    qprime: "⁗",
                    qscr: "𝓆",
                    Qscr: "𝒬",
                    quaternions: "ℍ",
                    quatint: "⨖",
                    quest: "?",
                    questeq: "≟",
                    quot: '"',
                    QUOT: '"',
                    rAarr: "⇛",
                    race: "∽̱",
                    racute: "ŕ",
                    Racute: "Ŕ",
                    radic: "√",
                    raemptyv: "⦳",
                    rang: "⟩",
                    Rang: "⟫",
                    rangd: "⦒",
                    range: "⦥",
                    rangle: "⟩",
                    raquo: "»",
                    rarr: "→",
                    rArr: "⇒",
                    Rarr: "↠",
                    rarrap: "⥵",
                    rarrb: "⇥",
                    rarrbfs: "⤠",
                    rarrc: "⤳",
                    rarrfs: "⤞",
                    rarrhk: "↪",
                    rarrlp: "↬",
                    rarrpl: "⥅",
                    rarrsim: "⥴",
                    rarrtl: "↣",
                    Rarrtl: "⤖",
                    rarrw: "↝",
                    ratail: "⤚",
                    rAtail: "⤜",
                    ratio: "∶",
                    rationals: "ℚ",
                    rbarr: "⤍",
                    rBarr: "⤏",
                    RBarr: "⤐",
                    rbbrk: "❳",
                    rbrace: "}",
                    rbrack: "]",
                    rbrke: "⦌",
                    rbrksld: "⦎",
                    rbrkslu: "⦐",
                    rcaron: "ř",
                    Rcaron: "Ř",
                    rcedil: "ŗ",
                    Rcedil: "Ŗ",
                    rceil: "⌉",
                    rcub: "}",
                    rcy: "р",
                    Rcy: "Р",
                    rdca: "⤷",
                    rdldhar: "⥩",
                    rdquo: "”",
                    rdquor: "”",
                    rdsh: "↳",
                    Re: "ℜ",
                    real: "ℜ",
                    realine: "ℛ",
                    realpart: "ℜ",
                    reals: "ℝ",
                    rect: "▭",
                    reg: "®",
                    REG: "®",
                    ReverseElement: "∋",
                    ReverseEquilibrium: "⇋",
                    ReverseUpEquilibrium: "⥯",
                    rfisht: "⥽",
                    rfloor: "⌋",
                    rfr: "𝔯",
                    Rfr: "ℜ",
                    rHar: "⥤",
                    rhard: "⇁",
                    rharu: "⇀",
                    rharul: "⥬",
                    rho: "ρ",
                    Rho: "Ρ",
                    rhov: "ϱ",
                    RightAngleBracket: "⟩",
                    rightarrow: "→",
                    Rightarrow: "⇒",
                    RightArrow: "→",
                    RightArrowBar: "⇥",
                    RightArrowLeftArrow: "⇄",
                    rightarrowtail: "↣",
                    RightCeiling: "⌉",
                    RightDoubleBracket: "⟧",
                    RightDownTeeVector: "⥝",
                    RightDownVector: "⇂",
                    RightDownVectorBar: "⥕",
                    RightFloor: "⌋",
                    rightharpoondown: "⇁",
                    rightharpoonup: "⇀",
                    rightleftarrows: "⇄",
                    rightleftharpoons: "⇌",
                    rightrightarrows: "⇉",
                    rightsquigarrow: "↝",
                    RightTee: "⊢",
                    RightTeeArrow: "↦",
                    RightTeeVector: "⥛",
                    rightthreetimes: "⋌",
                    RightTriangle: "⊳",
                    RightTriangleBar: "⧐",
                    RightTriangleEqual: "⊵",
                    RightUpDownVector: "⥏",
                    RightUpTeeVector: "⥜",
                    RightUpVector: "↾",
                    RightUpVectorBar: "⥔",
                    RightVector: "⇀",
                    RightVectorBar: "⥓",
                    ring: "˚",
                    risingdotseq: "≓",
                    rlarr: "⇄",
                    rlhar: "⇌",
                    rlm: "‏",
                    rmoust: "⎱",
                    rmoustache: "⎱",
                    rnmid: "⫮",
                    roang: "⟭",
                    roarr: "⇾",
                    robrk: "⟧",
                    ropar: "⦆",
                    ropf: "𝕣",
                    Ropf: "ℝ",
                    roplus: "⨮",
                    rotimes: "⨵",
                    RoundImplies: "⥰",
                    rpar: ")",
                    rpargt: "⦔",
                    rppolint: "⨒",
                    rrarr: "⇉",
                    Rrightarrow: "⇛",
                    rsaquo: "›",
                    rscr: "𝓇",
                    Rscr: "ℛ",
                    rsh: "↱",
                    Rsh: "↱",
                    rsqb: "]",
                    rsquo: "’",
                    rsquor: "’",
                    rthree: "⋌",
                    rtimes: "⋊",
                    rtri: "▹",
                    rtrie: "⊵",
                    rtrif: "▸",
                    rtriltri: "⧎",
                    RuleDelayed: "⧴",
                    ruluhar: "⥨",
                    rx: "℞",
                    sacute: "ś",
                    Sacute: "Ś",
                    sbquo: "‚",
                    sc: "≻",
                    Sc: "⪼",
                    scap: "⪸",
                    scaron: "š",
                    Scaron: "Š",
                    sccue: "≽",
                    sce: "⪰",
                    scE: "⪴",
                    scedil: "ş",
                    Scedil: "Ş",
                    scirc: "ŝ",
                    Scirc: "Ŝ",
                    scnap: "⪺",
                    scnE: "⪶",
                    scnsim: "⋩",
                    scpolint: "⨓",
                    scsim: "≿",
                    scy: "с",
                    Scy: "С",
                    sdot: "⋅",
                    sdotb: "⊡",
                    sdote: "⩦",
                    searhk: "⤥",
                    searr: "↘",
                    seArr: "⇘",
                    searrow: "↘",
                    sect: "§",
                    semi: ";",
                    seswar: "⤩",
                    setminus: "∖",
                    setmn: "∖",
                    sext: "✶",
                    sfr: "𝔰",
                    Sfr: "𝔖",
                    sfrown: "⌢",
                    sharp: "♯",
                    shchcy: "щ",
                    SHCHcy: "Щ",
                    shcy: "ш",
                    SHcy: "Ш",
                    ShortDownArrow: "↓",
                    ShortLeftArrow: "←",
                    shortmid: "∣",
                    shortparallel: "∥",
                    ShortRightArrow: "→",
                    ShortUpArrow: "↑",
                    shy: "­",
                    sigma: "σ",
                    Sigma: "Σ",
                    sigmaf: "ς",
                    sigmav: "ς",
                    sim: "∼",
                    simdot: "⩪",
                    sime: "≃",
                    simeq: "≃",
                    simg: "⪞",
                    simgE: "⪠",
                    siml: "⪝",
                    simlE: "⪟",
                    simne: "≆",
                    simplus: "⨤",
                    simrarr: "⥲",
                    slarr: "←",
                    SmallCircle: "∘",
                    smallsetminus: "∖",
                    smashp: "⨳",
                    smeparsl: "⧤",
                    smid: "∣",
                    smile: "⌣",
                    smt: "⪪",
                    smte: "⪬",
                    smtes: "⪬︀",
                    softcy: "ь",
                    SOFTcy: "Ь",
                    sol: "/",
                    solb: "⧄",
                    solbar: "⌿",
                    sopf: "𝕤",
                    Sopf: "𝕊",
                    spades: "♠",
                    spadesuit: "♠",
                    spar: "∥",
                    sqcap: "⊓",
                    sqcaps: "⊓︀",
                    sqcup: "⊔",
                    sqcups: "⊔︀",
                    Sqrt: "√",
                    sqsub: "⊏",
                    sqsube: "⊑",
                    sqsubset: "⊏",
                    sqsubseteq: "⊑",
                    sqsup: "⊐",
                    sqsupe: "⊒",
                    sqsupset: "⊐",
                    sqsupseteq: "⊒",
                    squ: "□",
                    square: "□",
                    Square: "□",
                    SquareIntersection: "⊓",
                    SquareSubset: "⊏",
                    SquareSubsetEqual: "⊑",
                    SquareSuperset: "⊐",
                    SquareSupersetEqual: "⊒",
                    SquareUnion: "⊔",
                    squarf: "▪",
                    squf: "▪",
                    srarr: "→",
                    sscr: "𝓈",
                    Sscr: "𝒮",
                    ssetmn: "∖",
                    ssmile: "⌣",
                    sstarf: "⋆",
                    star: "☆",
                    Star: "⋆",
                    starf: "★",
                    straightepsilon: "ϵ",
                    straightphi: "ϕ",
                    strns: "¯",
                    sub: "⊂",
                    Sub: "⋐",
                    subdot: "⪽",
                    sube: "⊆",
                    subE: "⫅",
                    subedot: "⫃",
                    submult: "⫁",
                    subne: "⊊",
                    subnE: "⫋",
                    subplus: "⪿",
                    subrarr: "⥹",
                    subset: "⊂",
                    Subset: "⋐",
                    subseteq: "⊆",
                    subseteqq: "⫅",
                    SubsetEqual: "⊆",
                    subsetneq: "⊊",
                    subsetneqq: "⫋",
                    subsim: "⫇",
                    subsub: "⫕",
                    subsup: "⫓",
                    succ: "≻",
                    succapprox: "⪸",
                    succcurlyeq: "≽",
                    Succeeds: "≻",
                    SucceedsEqual: "⪰",
                    SucceedsSlantEqual: "≽",
                    SucceedsTilde: "≿",
                    succeq: "⪰",
                    succnapprox: "⪺",
                    succneqq: "⪶",
                    succnsim: "⋩",
                    succsim: "≿",
                    SuchThat: "∋",
                    sum: "∑",
                    Sum: "∑",
                    sung: "♪",
                    sup: "⊃",
                    Sup: "⋑",
                    sup1: "¹",
                    sup2: "²",
                    sup3: "³",
                    supdot: "⪾",
                    supdsub: "⫘",
                    supe: "⊇",
                    supE: "⫆",
                    supedot: "⫄",
                    Superset: "⊃",
                    SupersetEqual: "⊇",
                    suphsol: "⟉",
                    suphsub: "⫗",
                    suplarr: "⥻",
                    supmult: "⫂",
                    supne: "⊋",
                    supnE: "⫌",
                    supplus: "⫀",
                    supset: "⊃",
                    Supset: "⋑",
                    supseteq: "⊇",
                    supseteqq: "⫆",
                    supsetneq: "⊋",
                    supsetneqq: "⫌",
                    supsim: "⫈",
                    supsub: "⫔",
                    supsup: "⫖",
                    swarhk: "⤦",
                    swarr: "↙",
                    swArr: "⇙",
                    swarrow: "↙",
                    swnwar: "⤪",
                    szlig: "ß",
                    Tab: "\t",
                    target: "⌖",
                    tau: "τ",
                    Tau: "Τ",
                    tbrk: "⎴",
                    tcaron: "ť",
                    Tcaron: "Ť",
                    tcedil: "ţ",
                    Tcedil: "Ţ",
                    tcy: "т",
                    Tcy: "Т",
                    tdot: "⃛",
                    telrec: "⌕",
                    tfr: "𝔱",
                    Tfr: "𝔗",
                    there4: "∴",
                    therefore: "∴",
                    Therefore: "∴",
                    theta: "θ",
                    Theta: "Θ",
                    thetasym: "ϑ",
                    thetav: "ϑ",
                    thickapprox: "≈",
                    thicksim: "∼",
                    ThickSpace: "  ",
                    thinsp: " ",
                    ThinSpace: " ",
                    thkap: "≈",
                    thksim: "∼",
                    thorn: "þ",
                    THORN: "Þ",
                    tilde: "˜",
                    Tilde: "∼",
                    TildeEqual: "≃",
                    TildeFullEqual: "≅",
                    TildeTilde: "≈",
                    times: "×",
                    timesb: "⊠",
                    timesbar: "⨱",
                    timesd: "⨰",
                    tint: "∭",
                    toea: "⤨",
                    top: "⊤",
                    topbot: "⌶",
                    topcir: "⫱",
                    topf: "𝕥",
                    Topf: "𝕋",
                    topfork: "⫚",
                    tosa: "⤩",
                    tprime: "‴",
                    trade: "™",
                    TRADE: "™",
                    triangle: "▵",
                    triangledown: "▿",
                    triangleleft: "◃",
                    trianglelefteq: "⊴",
                    triangleq: "≜",
                    triangleright: "▹",
                    trianglerighteq: "⊵",
                    tridot: "◬",
                    trie: "≜",
                    triminus: "⨺",
                    TripleDot: "⃛",
                    triplus: "⨹",
                    trisb: "⧍",
                    tritime: "⨻",
                    trpezium: "⏢",
                    tscr: "𝓉",
                    Tscr: "𝒯",
                    tscy: "ц",
                    TScy: "Ц",
                    tshcy: "ћ",
                    TSHcy: "Ћ",
                    tstrok: "ŧ",
                    Tstrok: "Ŧ",
                    twixt: "≬",
                    twoheadleftarrow: "↞",
                    twoheadrightarrow: "↠",
                    uacute: "ú",
                    Uacute: "Ú",
                    uarr: "↑",
                    uArr: "⇑",
                    Uarr: "↟",
                    Uarrocir: "⥉",
                    ubrcy: "ў",
                    Ubrcy: "Ў",
                    ubreve: "ŭ",
                    Ubreve: "Ŭ",
                    ucirc: "û",
                    Ucirc: "Û",
                    ucy: "у",
                    Ucy: "У",
                    udarr: "⇅",
                    udblac: "ű",
                    Udblac: "Ű",
                    udhar: "⥮",
                    ufisht: "⥾",
                    ufr: "𝔲",
                    Ufr: "𝔘",
                    ugrave: "ù",
                    Ugrave: "Ù",
                    uHar: "⥣",
                    uharl: "↿",
                    uharr: "↾",
                    uhblk: "▀",
                    ulcorn: "⌜",
                    ulcorner: "⌜",
                    ulcrop: "⌏",
                    ultri: "◸",
                    umacr: "ū",
                    Umacr: "Ū",
                    uml: "¨",
                    UnderBar: "_",
                    UnderBrace: "⏟",
                    UnderBracket: "⎵",
                    UnderParenthesis: "⏝",
                    Union: "⋃",
                    UnionPlus: "⊎",
                    uogon: "ų",
                    Uogon: "Ų",
                    uopf: "𝕦",
                    Uopf: "𝕌",
                    uparrow: "↑",
                    Uparrow: "⇑",
                    UpArrow: "↑",
                    UpArrowBar: "⤒",
                    UpArrowDownArrow: "⇅",
                    updownarrow: "↕",
                    Updownarrow: "⇕",
                    UpDownArrow: "↕",
                    UpEquilibrium: "⥮",
                    upharpoonleft: "↿",
                    upharpoonright: "↾",
                    uplus: "⊎",
                    UpperLeftArrow: "↖",
                    UpperRightArrow: "↗",
                    upsi: "υ",
                    Upsi: "ϒ",
                    upsih: "ϒ",
                    upsilon: "υ",
                    Upsilon: "Υ",
                    UpTee: "⊥",
                    UpTeeArrow: "↥",
                    upuparrows: "⇈",
                    urcorn: "⌝",
                    urcorner: "⌝",
                    urcrop: "⌎",
                    uring: "ů",
                    Uring: "Ů",
                    urtri: "◹",
                    uscr: "𝓊",
                    Uscr: "𝒰",
                    utdot: "⋰",
                    utilde: "ũ",
                    Utilde: "Ũ",
                    utri: "▵",
                    utrif: "▴",
                    uuarr: "⇈",
                    uuml: "ü",
                    Uuml: "Ü",
                    uwangle: "⦧",
                    vangrt: "⦜",
                    varepsilon: "ϵ",
                    varkappa: "ϰ",
                    varnothing: "∅",
                    varphi: "ϕ",
                    varpi: "ϖ",
                    varpropto: "∝",
                    varr: "↕",
                    vArr: "⇕",
                    varrho: "ϱ",
                    varsigma: "ς",
                    varsubsetneq: "⊊︀",
                    varsubsetneqq: "⫋︀",
                    varsupsetneq: "⊋︀",
                    varsupsetneqq: "⫌︀",
                    vartheta: "ϑ",
                    vartriangleleft: "⊲",
                    vartriangleright: "⊳",
                    vBar: "⫨",
                    Vbar: "⫫",
                    vBarv: "⫩",
                    vcy: "в",
                    Vcy: "В",
                    vdash: "⊢",
                    vDash: "⊨",
                    Vdash: "⊩",
                    VDash: "⊫",
                    Vdashl: "⫦",
                    vee: "∨",
                    Vee: "⋁",
                    veebar: "⊻",
                    veeeq: "≚",
                    vellip: "⋮",
                    verbar: "|",
                    Verbar: "‖",
                    vert: "|",
                    Vert: "‖",
                    VerticalBar: "∣",
                    VerticalLine: "|",
                    VerticalSeparator: "❘",
                    VerticalTilde: "≀",
                    VeryThinSpace: " ",
                    vfr: "𝔳",
                    Vfr: "𝔙",
                    vltri: "⊲",
                    vnsub: "⊂⃒",
                    vnsup: "⊃⃒",
                    vopf: "𝕧",
                    Vopf: "𝕍",
                    vprop: "∝",
                    vrtri: "⊳",
                    vscr: "𝓋",
                    Vscr: "𝒱",
                    vsubne: "⊊︀",
                    vsubnE: "⫋︀",
                    vsupne: "⊋︀",
                    vsupnE: "⫌︀",
                    Vvdash: "⊪",
                    vzigzag: "⦚",
                    wcirc: "ŵ",
                    Wcirc: "Ŵ",
                    wedbar: "⩟",
                    wedge: "∧",
                    Wedge: "⋀",
                    wedgeq: "≙",
                    weierp: "℘",
                    wfr: "𝔴",
                    Wfr: "𝔚",
                    wopf: "𝕨",
                    Wopf: "𝕎",
                    wp: "℘",
                    wr: "≀",
                    wreath: "≀",
                    wscr: "𝓌",
                    Wscr: "𝒲",
                    xcap: "⋂",
                    xcirc: "◯",
                    xcup: "⋃",
                    xdtri: "▽",
                    xfr: "𝔵",
                    Xfr: "𝔛",
                    xharr: "⟷",
                    xhArr: "⟺",
                    xi: "ξ",
                    Xi: "Ξ",
                    xlarr: "⟵",
                    xlArr: "⟸",
                    xmap: "⟼",
                    xnis: "⋻",
                    xodot: "⨀",
                    xopf: "𝕩",
                    Xopf: "𝕏",
                    xoplus: "⨁",
                    xotime: "⨂",
                    xrarr: "⟶",
                    xrArr: "⟹",
                    xscr: "𝓍",
                    Xscr: "𝒳",
                    xsqcup: "⨆",
                    xuplus: "⨄",
                    xutri: "△",
                    xvee: "⋁",
                    xwedge: "⋀",
                    yacute: "ý",
                    Yacute: "Ý",
                    yacy: "я",
                    YAcy: "Я",
                    ycirc: "ŷ",
                    Ycirc: "Ŷ",
                    ycy: "ы",
                    Ycy: "Ы",
                    yen: "¥",
                    yfr: "𝔶",
                    Yfr: "𝔜",
                    yicy: "ї",
                    YIcy: "Ї",
                    yopf: "𝕪",
                    Yopf: "𝕐",
                    yscr: "𝓎",
                    Yscr: "𝒴",
                    yucy: "ю",
                    YUcy: "Ю",
                    yuml: "ÿ",
                    Yuml: "Ÿ",
                    zacute: "ź",
                    Zacute: "Ź",
                    zcaron: "ž",
                    Zcaron: "Ž",
                    zcy: "з",
                    Zcy: "З",
                    zdot: "ż",
                    Zdot: "Ż",
                    zeetrf: "ℨ",
                    ZeroWidthSpace: "​",
                    zeta: "ζ",
                    Zeta: "Ζ",
                    zfr: "𝔷",
                    Zfr: "ℨ",
                    zhcy: "ж",
                    ZHcy: "Ж",
                    zigrarr: "⇝",
                    zopf: "𝕫",
                    Zopf: "ℤ",
                    zscr: "𝓏",
                    Zscr: "𝒵",
                    zwj: "‍",
                    zwnj: "‌"
                };
                var decodeMapLegacy = {
                    aacute: "á",
                    Aacute: "Á",
                    acirc: "â",
                    Acirc: "Â",
                    acute: "´",
                    aelig: "æ",
                    AElig: "Æ",
                    agrave: "à",
                    Agrave: "À",
                    amp: "&",
                    AMP: "&",
                    aring: "å",
                    Aring: "Å",
                    atilde: "ã",
                    Atilde: "Ã",
                    auml: "ä",
                    Auml: "Ä",
                    brvbar: "¦",
                    ccedil: "ç",
                    Ccedil: "Ç",
                    cedil: "¸",
                    cent: "¢",
                    copy: "©",
                    COPY: "©",
                    curren: "¤",
                    deg: "°",
                    divide: "÷",
                    eacute: "é",
                    Eacute: "É",
                    ecirc: "ê",
                    Ecirc: "Ê",
                    egrave: "è",
                    Egrave: "È",
                    eth: "ð",
                    ETH: "Ð",
                    euml: "ë",
                    Euml: "Ë",
                    frac12: "½",
                    frac14: "¼",
                    frac34: "¾",
                    gt: ">",
                    GT: ">",
                    iacute: "í",
                    Iacute: "Í",
                    icirc: "î",
                    Icirc: "Î",
                    iexcl: "¡",
                    igrave: "ì",
                    Igrave: "Ì",
                    iquest: "¿",
                    iuml: "ï",
                    Iuml: "Ï",
                    laquo: "«",
                    lt: "<",
                    LT: "<",
                    macr: "¯",
                    micro: "µ",
                    middot: "·",
                    nbsp: " ",
                    not: "¬",
                    ntilde: "ñ",
                    Ntilde: "Ñ",
                    oacute: "ó",
                    Oacute: "Ó",
                    ocirc: "ô",
                    Ocirc: "Ô",
                    ograve: "ò",
                    Ograve: "Ò",
                    ordf: "ª",
                    ordm: "º",
                    oslash: "ø",
                    Oslash: "Ø",
                    otilde: "õ",
                    Otilde: "Õ",
                    ouml: "ö",
                    Ouml: "Ö",
                    para: "¶",
                    plusmn: "±",
                    pound: "£",
                    quot: '"',
                    QUOT: '"',
                    raquo: "»",
                    reg: "®",
                    REG: "®",
                    sect: "§",
                    shy: "­",
                    sup1: "¹",
                    sup2: "²",
                    sup3: "³",
                    szlig: "ß",
                    thorn: "þ",
                    THORN: "Þ",
                    times: "×",
                    uacute: "ú",
                    Uacute: "Ú",
                    ucirc: "û",
                    Ucirc: "Û",
                    ugrave: "ù",
                    Ugrave: "Ù",
                    uml: "¨",
                    uuml: "ü",
                    Uuml: "Ü",
                    yacute: "ý",
                    Yacute: "Ý",
                    yen: "¥",
                    yuml: "ÿ"
                };
                var decodeMapNumeric = {
                    0: "�",
                    128: "€",
                    130: "‚",
                    131: "ƒ",
                    132: "„",
                    133: "…",
                    134: "†",
                    135: "‡",
                    136: "ˆ",
                    137: "‰",
                    138: "Š",
                    139: "‹",
                    140: "Œ",
                    142: "Ž",
                    145: "‘",
                    146: "’",
                    147: "“",
                    148: "”",
                    149: "•",
                    150: "–",
                    151: "—",
                    152: "˜",
                    153: "™",
                    154: "š",
                    155: "›",
                    156: "œ",
                    158: "ž",
                    159: "Ÿ"
                };
                var invalidReferenceCodePoints = [ 1, 2, 3, 4, 5, 6, 7, 8, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 64976, 64977, 64978, 64979, 64980, 64981, 64982, 64983, 64984, 64985, 64986, 64987, 64988, 64989, 64990, 64991, 64992, 64993, 64994, 64995, 64996, 64997, 64998, 64999, 65e3, 65001, 65002, 65003, 65004, 65005, 65006, 65007, 65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214, 393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894, 720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574, 1048575, 1114110, 1114111 ];
                var stringFromCharCode = String.fromCharCode;
                var object = {};
                var hasOwnProperty = object.hasOwnProperty;
                var has = function(object, propertyName) {
                    return hasOwnProperty.call(object, propertyName);
                };
                var contains = function(array, value) {
                    var index = -1;
                    var length = array.length;
                    while (++index < length) {
                        if (array[index] == value) {
                            return true;
                        }
                    }
                    return false;
                };
                var merge = function(options, defaults) {
                    if (!options) {
                        return defaults;
                    }
                    var result = {};
                    var key;
                    for (key in defaults) {
                        result[key] = has(options, key) ? options[key] : defaults[key];
                    }
                    return result;
                };
                var codePointToSymbol = function(codePoint, strict) {
                    var output = "";
                    if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
                        if (strict) {
                            parseError("character reference outside the permissible Unicode range");
                        }
                        return "�";
                    }
                    if (has(decodeMapNumeric, codePoint)) {
                        if (strict) {
                            parseError("disallowed character reference");
                        }
                        return decodeMapNumeric[codePoint];
                    }
                    if (strict && contains(invalidReferenceCodePoints, codePoint)) {
                        parseError("disallowed character reference");
                    }
                    if (codePoint > 65535) {
                        codePoint -= 65536;
                        output += stringFromCharCode(codePoint >>> 10 & 1023 | 55296);
                        codePoint = 56320 | codePoint & 1023;
                    }
                    output += stringFromCharCode(codePoint);
                    return output;
                };
                var hexEscape = function(codePoint) {
                    return "&#x" + codePoint.toString(16).toUpperCase() + ";";
                };
                var decEscape = function(codePoint) {
                    return "&#" + codePoint + ";";
                };
                var parseError = function(message) {
                    throw Error("Parse error: " + message);
                };
                var encode = function(string, options) {
                    options = merge(options, encode.options);
                    var strict = options.strict;
                    if (strict && regexInvalidRawCodePoint.test(string)) {
                        parseError("forbidden code point");
                    }
                    var encodeEverything = options.encodeEverything;
                    var useNamedReferences = options.useNamedReferences;
                    var allowUnsafeSymbols = options.allowUnsafeSymbols;
                    var escapeCodePoint = options.decimal ? decEscape : hexEscape;
                    var escapeBmpSymbol = function(symbol) {
                        return escapeCodePoint(symbol.charCodeAt(0));
                    };
                    if (encodeEverything) {
                        string = string.replace(regexAsciiWhitelist, (function(symbol) {
                            if (useNamedReferences && has(encodeMap, symbol)) {
                                return "&" + encodeMap[symbol] + ";";
                            }
                            return escapeBmpSymbol(symbol);
                        }));
                        if (useNamedReferences) {
                            string = string.replace(/&gt;\u20D2/g, "&nvgt;").replace(/&lt;\u20D2/g, "&nvlt;").replace(/&#x66;&#x6A;/g, "&fjlig;");
                        }
                        if (useNamedReferences) {
                            string = string.replace(regexEncodeNonAscii, (function(string) {
                                return "&" + encodeMap[string] + ";";
                            }));
                        }
                    } else if (useNamedReferences) {
                        if (!allowUnsafeSymbols) {
                            string = string.replace(regexEscape, (function(string) {
                                return "&" + encodeMap[string] + ";";
                            }));
                        }
                        string = string.replace(/&gt;\u20D2/g, "&nvgt;").replace(/&lt;\u20D2/g, "&nvlt;");
                        string = string.replace(regexEncodeNonAscii, (function(string) {
                            return "&" + encodeMap[string] + ";";
                        }));
                    } else if (!allowUnsafeSymbols) {
                        string = string.replace(regexEscape, escapeBmpSymbol);
                    }
                    return string.replace(regexAstralSymbols, (function($0) {
                        var high = $0.charCodeAt(0);
                        var low = $0.charCodeAt(1);
                        var codePoint = (high - 55296) * 1024 + low - 56320 + 65536;
                        return escapeCodePoint(codePoint);
                    })).replace(regexBmpWhitelist, escapeBmpSymbol);
                };
                encode.options = {
                    allowUnsafeSymbols: false,
                    encodeEverything: false,
                    strict: false,
                    useNamedReferences: false,
                    decimal: false
                };
                var decode = function(html, options) {
                    options = merge(options, decode.options);
                    var strict = options.strict;
                    if (strict && regexInvalidEntity.test(html)) {
                        parseError("malformed character reference");
                    }
                    return html.replace(regexDecode, (function($0, $1, $2, $3, $4, $5, $6, $7, $8) {
                        var codePoint;
                        var semicolon;
                        var decDigits;
                        var hexDigits;
                        var reference;
                        var next;
                        if ($1) {
                            reference = $1;
                            return decodeMap[reference];
                        }
                        if ($2) {
                            reference = $2;
                            next = $3;
                            if (next && options.isAttributeValue) {
                                if (strict && next == "=") {
                                    parseError("`&` did not start a character reference");
                                }
                                return $0;
                            } else {
                                if (strict) {
                                    parseError("named character reference was not terminated by a semicolon");
                                }
                                return decodeMapLegacy[reference] + (next || "");
                            }
                        }
                        if ($4) {
                            decDigits = $4;
                            semicolon = $5;
                            if (strict && !semicolon) {
                                parseError("character reference was not terminated by a semicolon");
                            }
                            codePoint = parseInt(decDigits, 10);
                            return codePointToSymbol(codePoint, strict);
                        }
                        if ($6) {
                            hexDigits = $6;
                            semicolon = $7;
                            if (strict && !semicolon) {
                                parseError("character reference was not terminated by a semicolon");
                            }
                            codePoint = parseInt(hexDigits, 16);
                            return codePointToSymbol(codePoint, strict);
                        }
                        if (strict) {
                            parseError("named character reference was not terminated by a semicolon");
                        }
                        return $0;
                    }));
                };
                decode.options = {
                    isAttributeValue: false,
                    strict: false
                };
                var escape = function(string) {
                    return string.replace(regexEscape, (function($0) {
                        return escapeMap[$0];
                    }));
                };
                var he = {
                    version: "1.2.0",
                    encode,
                    decode,
                    escape,
                    unescape: decode
                };
                if (true) {
                    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
                        return he;
                    }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
                } else {
                    var key;
                }
            })(this);
        },
        "./node_modules/node-html-parser/dist/back.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            function arr_back(arr) {
                return arr[arr.length - 1];
            }
            exports["default"] = arr_back;
        },
        "./node_modules/node-html-parser/dist/index.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.NodeType = exports.TextNode = exports.Node = exports.valid = exports["default"] = exports.parse = exports.HTMLElement = exports.CommentNode = void 0;
            var comment_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/comment.js");
            Object.defineProperty(exports, "CommentNode", {
                enumerable: true,
                get: function() {
                    return __importDefault(comment_1).default;
                }
            });
            var html_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/html.js");
            Object.defineProperty(exports, "HTMLElement", {
                enumerable: true,
                get: function() {
                    return __importDefault(html_1).default;
                }
            });
            var parse_1 = __webpack_require__("./node_modules/node-html-parser/dist/parse.js");
            Object.defineProperty(exports, "parse", {
                enumerable: true,
                get: function() {
                    return __importDefault(parse_1).default;
                }
            });
            Object.defineProperty(exports, "default", {
                enumerable: true,
                get: function() {
                    return __importDefault(parse_1).default;
                }
            });
            var valid_1 = __webpack_require__("./node_modules/node-html-parser/dist/valid.js");
            Object.defineProperty(exports, "valid", {
                enumerable: true,
                get: function() {
                    return __importDefault(valid_1).default;
                }
            });
            var node_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/node.js");
            Object.defineProperty(exports, "Node", {
                enumerable: true,
                get: function() {
                    return __importDefault(node_1).default;
                }
            });
            var text_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/text.js");
            Object.defineProperty(exports, "TextNode", {
                enumerable: true,
                get: function() {
                    return __importDefault(text_1).default;
                }
            });
            var type_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/type.js");
            Object.defineProperty(exports, "NodeType", {
                enumerable: true,
                get: function() {
                    return __importDefault(type_1).default;
                }
            });
        },
        "./node_modules/node-html-parser/dist/matcher.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var type_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/type.js"));
            function isTag(node) {
                return node && node.nodeType === type_1.default.ELEMENT_NODE;
            }
            function getAttributeValue(elem, name) {
                return isTag(elem) ? elem.getAttribute(name) : undefined;
            }
            function getName(elem) {
                return (elem && elem.rawTagName || "").toLowerCase();
            }
            function getChildren(node) {
                return node && node.childNodes;
            }
            function getParent(node) {
                return node ? node.parentNode : null;
            }
            function getText(node) {
                return node.text;
            }
            function removeSubsets(nodes) {
                var idx = nodes.length;
                var node;
                var ancestor;
                var replace;
                while (--idx > -1) {
                    node = ancestor = nodes[idx];
                    nodes[idx] = null;
                    replace = true;
                    while (ancestor) {
                        if (nodes.indexOf(ancestor) > -1) {
                            replace = false;
                            nodes.splice(idx, 1);
                            break;
                        }
                        ancestor = getParent(ancestor);
                    }
                    if (replace) {
                        nodes[idx] = node;
                    }
                }
                return nodes;
            }
            function existsOne(test, elems) {
                return elems.some((function(elem) {
                    return isTag(elem) ? test(elem) || existsOne(test, getChildren(elem)) : false;
                }));
            }
            function getSiblings(node) {
                var parent = getParent(node);
                return parent && getChildren(parent);
            }
            function hasAttrib(elem, name) {
                return getAttributeValue(elem, name) !== undefined;
            }
            function findOne(test, elems) {
                var elem = null;
                for (var i = 0, l = elems.length; i < l && !elem; i++) {
                    var el = elems[i];
                    if (test(el)) {
                        elem = el;
                    } else {
                        var childs = getChildren(el);
                        if (childs && childs.length > 0) {
                            elem = findOne(test, childs);
                        }
                    }
                }
                return elem;
            }
            function findAll(test, nodes) {
                var result = [];
                for (var i = 0, j = nodes.length; i < j; i++) {
                    if (!isTag(nodes[i])) continue;
                    if (test(nodes[i])) result.push(nodes[i]);
                    var childs = getChildren(nodes[i]);
                    if (childs) result = result.concat(findAll(test, childs));
                }
                return result;
            }
            exports["default"] = {
                isTag,
                getAttributeValue,
                getName,
                getChildren,
                getParent,
                getText,
                removeSubsets,
                existsOne,
                getSiblings,
                hasAttrib,
                findOne,
                findAll
            };
        },
        "./node_modules/node-html-parser/dist/nodes/comment.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __extends = this && this.__extends || function() {
                var extendStatics = function(d, b) {
                    extendStatics = Object.setPrototypeOf || {
                        __proto__: []
                    } instanceof Array && function(d, b) {
                        d.__proto__ = b;
                    } || function(d, b) {
                        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
                    };
                    return extendStatics(d, b);
                };
                return function(d, b) {
                    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
                    extendStatics(d, b);
                    function __() {
                        this.constructor = d;
                    }
                    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
                };
            }();
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var node_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/node.js"));
            var type_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/type.js"));
            var CommentNode = function(_super) {
                __extends(CommentNode, _super);
                function CommentNode(rawText, parentNode, range) {
                    var _this = _super.call(this, parentNode, range) || this;
                    _this.rawText = rawText;
                    _this.nodeType = type_1.default.COMMENT_NODE;
                    return _this;
                }
                CommentNode.prototype.clone = function() {
                    return new CommentNode(this.rawText, null);
                };
                Object.defineProperty(CommentNode.prototype, "text", {
                    get: function() {
                        return this.rawText;
                    },
                    enumerable: false,
                    configurable: true
                });
                CommentNode.prototype.toString = function() {
                    return "\x3c!--".concat(this.rawText, "--\x3e");
                };
                return CommentNode;
            }(node_1.default);
            exports["default"] = CommentNode;
        },
        "./node_modules/node-html-parser/dist/nodes/html.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __extends = this && this.__extends || function() {
                var extendStatics = function(d, b) {
                    extendStatics = Object.setPrototypeOf || {
                        __proto__: []
                    } instanceof Array && function(d, b) {
                        d.__proto__ = b;
                    } || function(d, b) {
                        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
                    };
                    return extendStatics(d, b);
                };
                return function(d, b) {
                    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
                    extendStatics(d, b);
                    function __() {
                        this.constructor = d;
                    }
                    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
                };
            }();
            var __assign = this && this.__assign || function() {
                __assign = Object.assign || function(t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                        s = arguments[i];
                        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, arguments);
            };
            var __spreadArray = this && this.__spreadArray || function(to, from, pack) {
                if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
                    if (ar || !(i in from)) {
                        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                        ar[i] = from[i];
                    }
                }
                return to.concat(ar || Array.prototype.slice.call(from));
            };
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.parse = exports.base_parse = void 0;
            var css_select_1 = __webpack_require__("./node_modules/css-select/lib/index.js");
            var he_1 = __importDefault(__webpack_require__("./node_modules/he/he.js"));
            var back_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/back.js"));
            var matcher_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/matcher.js"));
            var comment_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/comment.js"));
            var node_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/node.js"));
            var text_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/text.js"));
            var type_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/type.js"));
            var voidTags = new Set([ "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr" ]);
            function decode(val) {
                return JSON.parse(JSON.stringify(he_1.default.decode(val)));
            }
            var Htags = [ "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup" ];
            var Dtags = [ "details", "dialog", "dd", "div", "dt" ];
            var Ftags = [ "fieldset", "figcaption", "figure", "footer", "form" ];
            var tableTags = [ "table", "td", "tr" ];
            var htmlTags = [ "address", "article", "aside", "blockquote", "br", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "ul" ];
            var kBlockElements = new Set;
            function addToKBlockElement() {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var addToSet = function(array) {
                    for (var index = 0; index < array.length; index++) {
                        var element = array[index];
                        kBlockElements.add(element);
                        kBlockElements.add(element.toUpperCase());
                    }
                };
                for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
                    var arg = args_1[_a];
                    addToSet(arg);
                }
            }
            addToKBlockElement(Htags, Dtags, Ftags, tableTags, htmlTags);
            var DOMTokenList = function() {
                function DOMTokenList(valuesInit, afterUpdate) {
                    if (valuesInit === void 0) {
                        valuesInit = [];
                    }
                    if (afterUpdate === void 0) {
                        afterUpdate = function() {
                            return null;
                        };
                    }
                    this._set = new Set(valuesInit);
                    this._afterUpdate = afterUpdate;
                }
                DOMTokenList.prototype._validate = function(c) {
                    if (/\s/.test(c)) {
                        throw new Error("DOMException in DOMTokenList.add: The token '".concat(c, "' contains HTML space characters, which are not valid in tokens."));
                    }
                };
                DOMTokenList.prototype.add = function(c) {
                    this._validate(c);
                    this._set.add(c);
                    this._afterUpdate(this);
                };
                DOMTokenList.prototype.replace = function(c1, c2) {
                    this._validate(c2);
                    this._set.delete(c1);
                    this._set.add(c2);
                    this._afterUpdate(this);
                };
                DOMTokenList.prototype.remove = function(c) {
                    this._set.delete(c) && this._afterUpdate(this);
                };
                DOMTokenList.prototype.toggle = function(c) {
                    this._validate(c);
                    if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
                    this._afterUpdate(this);
                };
                DOMTokenList.prototype.contains = function(c) {
                    return this._set.has(c);
                };
                Object.defineProperty(DOMTokenList.prototype, "length", {
                    get: function() {
                        return this._set.size;
                    },
                    enumerable: false,
                    configurable: true
                });
                DOMTokenList.prototype.values = function() {
                    return this._set.values();
                };
                Object.defineProperty(DOMTokenList.prototype, "value", {
                    get: function() {
                        return Array.from(this._set.values());
                    },
                    enumerable: false,
                    configurable: true
                });
                DOMTokenList.prototype.toString = function() {
                    return Array.from(this._set.values()).join(" ");
                };
                return DOMTokenList;
            }();
            var HTMLElement = function(_super) {
                __extends(HTMLElement, _super);
                function HTMLElement(tagName, keyAttrs, rawAttrs, parentNode, range) {
                    if (rawAttrs === void 0) {
                        rawAttrs = "";
                    }
                    var _this = _super.call(this, parentNode, range) || this;
                    _this.rawAttrs = rawAttrs;
                    _this.nodeType = type_1.default.ELEMENT_NODE;
                    _this.rawTagName = tagName;
                    _this.rawAttrs = rawAttrs || "";
                    _this.id = keyAttrs.id || "";
                    _this.childNodes = [];
                    _this.classList = new DOMTokenList(keyAttrs.class ? keyAttrs.class.split(/\s+/) : [], (function(classList) {
                        return _this.setAttribute("class", classList.toString());
                    }));
                    if (keyAttrs.id) {
                        if (!rawAttrs) {
                            _this.rawAttrs = 'id="'.concat(keyAttrs.id, '"');
                        }
                    }
                    if (keyAttrs.class) {
                        if (!rawAttrs) {
                            var cls = 'class="'.concat(_this.classList.toString(), '"');
                            if (_this.rawAttrs) {
                                _this.rawAttrs += " ".concat(cls);
                            } else {
                                _this.rawAttrs = cls;
                            }
                        }
                    }
                    return _this;
                }
                HTMLElement.prototype.quoteAttribute = function(attr) {
                    if (attr == null) {
                        return "null";
                    }
                    return JSON.stringify(attr.replace(/"/g, "&quot;"));
                };
                HTMLElement.prototype.removeChild = function(node) {
                    this.childNodes = this.childNodes.filter((function(child) {
                        return child !== node;
                    }));
                    return this;
                };
                HTMLElement.prototype.exchangeChild = function(oldNode, newNode) {
                    var children = this.childNodes;
                    this.childNodes = children.map((function(child) {
                        if (child === oldNode) {
                            return newNode;
                        }
                        return child;
                    }));
                    return this;
                };
                Object.defineProperty(HTMLElement.prototype, "tagName", {
                    get: function() {
                        return this.rawTagName ? this.rawTagName.toUpperCase() : this.rawTagName;
                    },
                    set: function(newname) {
                        this.rawTagName = newname.toLowerCase();
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "localName", {
                    get: function() {
                        return this.rawTagName.toLowerCase();
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "isVoidElement", {
                    get: function() {
                        return voidTags.has(this.localName);
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "rawText", {
                    get: function() {
                        return this.childNodes.reduce((function(pre, cur) {
                            return pre += cur.rawText;
                        }), "");
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "textContent", {
                    get: function() {
                        return decode(this.rawText);
                    },
                    set: function(val) {
                        var content = [ new text_1.default(val, this) ];
                        this.childNodes = content;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "text", {
                    get: function() {
                        return decode(this.rawText);
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "structuredText", {
                    get: function() {
                        var currentBlock = [];
                        var blocks = [ currentBlock ];
                        function dfs(node) {
                            if (node.nodeType === type_1.default.ELEMENT_NODE) {
                                if (kBlockElements.has(node.rawTagName)) {
                                    if (currentBlock.length > 0) {
                                        blocks.push(currentBlock = []);
                                    }
                                    node.childNodes.forEach(dfs);
                                    if (currentBlock.length > 0) {
                                        blocks.push(currentBlock = []);
                                    }
                                } else {
                                    node.childNodes.forEach(dfs);
                                }
                            } else if (node.nodeType === type_1.default.TEXT_NODE) {
                                if (node.isWhitespace) {
                                    currentBlock.prependWhitespace = true;
                                } else {
                                    var text = node.trimmedText;
                                    if (currentBlock.prependWhitespace) {
                                        text = " ".concat(text);
                                        currentBlock.prependWhitespace = false;
                                    }
                                    currentBlock.push(text);
                                }
                            }
                        }
                        dfs(this);
                        return blocks.map((function(block) {
                            return block.join("").replace(/\s{2,}/g, " ");
                        })).join("\n").replace(/\s+$/, "");
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.toString = function() {
                    var tag = this.rawTagName;
                    if (tag) {
                        var attrs = this.rawAttrs ? " ".concat(this.rawAttrs) : "";
                        return this.isVoidElement ? "<".concat(tag).concat(attrs, ">") : "<".concat(tag).concat(attrs, ">").concat(this.innerHTML, "</").concat(tag, ">");
                    }
                    return this.innerHTML;
                };
                Object.defineProperty(HTMLElement.prototype, "innerHTML", {
                    get: function() {
                        return this.childNodes.map((function(child) {
                            return child.toString();
                        })).join("");
                    },
                    set: function(content) {
                        var r = parse(content);
                        var nodes = r.childNodes.length ? r.childNodes : [ new text_1.default(content, this) ];
                        resetParent(nodes, this);
                        resetParent(this.childNodes, null);
                        this.childNodes = nodes;
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.set_content = function(content, options) {
                    if (options === void 0) {
                        options = {};
                    }
                    if (content instanceof node_1.default) {
                        content = [ content ];
                    } else if (typeof content == "string") {
                        var r = parse(content, options);
                        content = r.childNodes.length ? r.childNodes : [ new text_1.default(content, this) ];
                    }
                    resetParent(this.childNodes, null);
                    resetParent(content, this);
                    this.childNodes = content;
                    return this;
                };
                HTMLElement.prototype.replaceWith = function() {
                    var _this = this;
                    var nodes = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        nodes[_i] = arguments[_i];
                    }
                    var parent = this.parentNode;
                    var content = nodes.map((function(node) {
                        if (node instanceof node_1.default) {
                            return [ node ];
                        } else if (typeof node == "string") {
                            var r = parse(node);
                            return r.childNodes.length ? r.childNodes : [ new text_1.default(node, _this) ];
                        }
                        return [];
                    })).flat();
                    var idx = parent.childNodes.findIndex((function(child) {
                        return child === _this;
                    }));
                    resetParent([ this ], null);
                    parent.childNodes = __spreadArray(__spreadArray(__spreadArray([], parent.childNodes.slice(0, idx), true), resetParent(content, parent), true), parent.childNodes.slice(idx + 1), true);
                };
                Object.defineProperty(HTMLElement.prototype, "outerHTML", {
                    get: function() {
                        return this.toString();
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.trimRight = function(pattern) {
                    for (var i = 0; i < this.childNodes.length; i++) {
                        var childNode = this.childNodes[i];
                        if (childNode.nodeType === type_1.default.ELEMENT_NODE) {
                            childNode.trimRight(pattern);
                        } else {
                            var index = childNode.rawText.search(pattern);
                            if (index > -1) {
                                childNode.rawText = childNode.rawText.substr(0, index);
                                this.childNodes.length = i + 1;
                            }
                        }
                    }
                    return this;
                };
                Object.defineProperty(HTMLElement.prototype, "structure", {
                    get: function() {
                        var res = [];
                        var indention = 0;
                        function write(str) {
                            res.push("  ".repeat(indention) + str);
                        }
                        function dfs(node) {
                            var idStr = node.id ? "#".concat(node.id) : "";
                            var classStr = node.classList.length ? ".".concat(node.classList.value.join(".")) : "";
                            write("".concat(node.rawTagName).concat(idStr).concat(classStr));
                            indention++;
                            node.childNodes.forEach((function(childNode) {
                                if (childNode.nodeType === type_1.default.ELEMENT_NODE) {
                                    dfs(childNode);
                                } else if (childNode.nodeType === type_1.default.TEXT_NODE) {
                                    if (!childNode.isWhitespace) {
                                        write("#text");
                                    }
                                }
                            }));
                            indention--;
                        }
                        dfs(this);
                        return res.join("\n");
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.removeWhitespace = function() {
                    var _this = this;
                    var o = 0;
                    this.childNodes.forEach((function(node) {
                        if (node.nodeType === type_1.default.TEXT_NODE) {
                            if (node.isWhitespace) {
                                return;
                            }
                            node.rawText = node.trimmedRawText;
                        } else if (node.nodeType === type_1.default.ELEMENT_NODE) {
                            node.removeWhitespace();
                        }
                        _this.childNodes[o++] = node;
                    }));
                    this.childNodes.length = o;
                    return this;
                };
                HTMLElement.prototype.querySelectorAll = function(selector) {
                    return (0, css_select_1.selectAll)(selector, this, {
                        xmlMode: true,
                        adapter: matcher_1.default
                    });
                };
                HTMLElement.prototype.querySelector = function(selector) {
                    return (0, css_select_1.selectOne)(selector, this, {
                        xmlMode: true,
                        adapter: matcher_1.default
                    });
                };
                HTMLElement.prototype.getElementsByTagName = function(tagName) {
                    var upperCasedTagName = tagName.toUpperCase();
                    var re = [];
                    var stack = [];
                    var currentNodeReference = this;
                    var index = 0;
                    while (index !== undefined) {
                        var child = void 0;
                        do {
                            child = currentNodeReference.childNodes[index++];
                        } while (index < currentNodeReference.childNodes.length && child === undefined);
                        if (child === undefined) {
                            currentNodeReference = currentNodeReference.parentNode;
                            index = stack.pop();
                            continue;
                        }
                        if (child.nodeType === type_1.default.ELEMENT_NODE) {
                            if (tagName === "*" || child.tagName === upperCasedTagName) re.push(child);
                            if (child.childNodes.length > 0) {
                                stack.push(index);
                                currentNodeReference = child;
                                index = 0;
                            }
                        }
                    }
                    return re;
                };
                HTMLElement.prototype.getElementById = function(id) {
                    var stack = [];
                    var currentNodeReference = this;
                    var index = 0;
                    while (index !== undefined) {
                        var child = void 0;
                        do {
                            child = currentNodeReference.childNodes[index++];
                        } while (index < currentNodeReference.childNodes.length && child === undefined);
                        if (child === undefined) {
                            currentNodeReference = currentNodeReference.parentNode;
                            index = stack.pop();
                            continue;
                        }
                        if (child.nodeType === type_1.default.ELEMENT_NODE) {
                            if (child.id === id) {
                                return child;
                            }
                            if (child.childNodes.length > 0) {
                                stack.push(index);
                                currentNodeReference = child;
                                index = 0;
                            }
                        }
                    }
                    return null;
                };
                HTMLElement.prototype.closest = function(selector) {
                    var mapChild = new Map;
                    var el = this;
                    var old = null;
                    function findOne(test, elems) {
                        var elem = null;
                        for (var i = 0, l = elems.length; i < l && !elem; i++) {
                            var el_1 = elems[i];
                            if (test(el_1)) {
                                elem = el_1;
                            } else {
                                var child = mapChild.get(el_1);
                                if (child) {
                                    elem = findOne(test, [ child ]);
                                }
                            }
                        }
                        return elem;
                    }
                    while (el) {
                        mapChild.set(el, old);
                        old = el;
                        el = el.parentNode;
                    }
                    el = this;
                    while (el) {
                        var e = (0, css_select_1.selectOne)(selector, el, {
                            xmlMode: true,
                            adapter: __assign(__assign({}, matcher_1.default), {
                                getChildren: function(node) {
                                    var child = mapChild.get(node);
                                    return child && [ child ];
                                },
                                getSiblings: function(node) {
                                    return [ node ];
                                },
                                findOne,
                                findAll: function() {
                                    return [];
                                }
                            })
                        });
                        if (e) {
                            return e;
                        }
                        el = el.parentNode;
                    }
                    return null;
                };
                HTMLElement.prototype.appendChild = function(node) {
                    node.remove();
                    this.childNodes.push(node);
                    node.parentNode = this;
                    return node;
                };
                Object.defineProperty(HTMLElement.prototype, "firstChild", {
                    get: function() {
                        return this.childNodes[0];
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "lastChild", {
                    get: function() {
                        return (0, back_1.default)(this.childNodes);
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "attrs", {
                    get: function() {
                        if (this._attrs) {
                            return this._attrs;
                        }
                        this._attrs = {};
                        var attrs = this.rawAttributes;
                        for (var key in attrs) {
                            var val = attrs[key] || "";
                            this._attrs[key.toLowerCase()] = decode(val);
                        }
                        return this._attrs;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "attributes", {
                    get: function() {
                        var ret_attrs = {};
                        var attrs = this.rawAttributes;
                        for (var key in attrs) {
                            var val = attrs[key] || "";
                            ret_attrs[key] = decode(val);
                        }
                        return ret_attrs;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "rawAttributes", {
                    get: function() {
                        if (this._rawAttrs) {
                            return this._rawAttrs;
                        }
                        var attrs = {};
                        if (this.rawAttrs) {
                            var re = /([a-zA-Z()#][a-zA-Z0-9-_:()#]*)(?:\s*=\s*((?:'[^']*')|(?:"[^"]*")|\S+))?/g;
                            var match = void 0;
                            while (match = re.exec(this.rawAttrs)) {
                                var key = match[1];
                                var val = match[2] || null;
                                if (val && (val[0] === "'" || val[0] === '"')) val = val.slice(1, val.length - 1);
                                attrs[key] = val;
                            }
                        }
                        this._rawAttrs = attrs;
                        return attrs;
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.removeAttribute = function(key) {
                    var attrs = this.rawAttributes;
                    delete attrs[key];
                    if (this._attrs) {
                        delete this._attrs[key];
                    }
                    this.rawAttrs = Object.keys(attrs).map((function(name) {
                        var val = JSON.stringify(attrs[name]);
                        if (val === undefined || val === "null") {
                            return name;
                        }
                        return "".concat(name, "=").concat(val);
                    })).join(" ");
                    if (key === "id") {
                        this.id = "";
                    }
                    return this;
                };
                HTMLElement.prototype.hasAttribute = function(key) {
                    return key.toLowerCase() in this.attrs;
                };
                HTMLElement.prototype.getAttribute = function(key) {
                    return this.attrs[key.toLowerCase()];
                };
                HTMLElement.prototype.setAttribute = function(key, value) {
                    var _this = this;
                    if (arguments.length < 2) {
                        throw new Error("Failed to execute 'setAttribute' on 'Element'");
                    }
                    var k2 = key.toLowerCase();
                    var attrs = this.rawAttributes;
                    for (var k in attrs) {
                        if (k.toLowerCase() === k2) {
                            key = k;
                            break;
                        }
                    }
                    attrs[key] = String(value);
                    if (this._attrs) {
                        this._attrs[k2] = decode(attrs[key]);
                    }
                    this.rawAttrs = Object.keys(attrs).map((function(name) {
                        var val = _this.quoteAttribute(attrs[name]);
                        if (val === "null" || val === '""') return name;
                        return "".concat(name, "=").concat(val);
                    })).join(" ");
                    if (key === "id") {
                        this.id = value;
                    }
                };
                HTMLElement.prototype.setAttributes = function(attributes) {
                    var _this = this;
                    if (this._attrs) {
                        delete this._attrs;
                    }
                    if (this._rawAttrs) {
                        delete this._rawAttrs;
                    }
                    this.rawAttrs = Object.keys(attributes).map((function(name) {
                        var val = attributes[name];
                        if (val === "null" || val === '""') return name;
                        return "".concat(name, "=").concat(_this.quoteAttribute(String(val)));
                    })).join(" ");
                    return this;
                };
                HTMLElement.prototype.insertAdjacentHTML = function(where, html) {
                    var _a, _b, _c;
                    var _this = this;
                    if (arguments.length < 2) {
                        throw new Error("2 arguments required");
                    }
                    var p = parse(html);
                    if (where === "afterend") {
                        var idx = this.parentNode.childNodes.findIndex((function(child) {
                            return child === _this;
                        }));
                        resetParent(p.childNodes, this.parentNode);
                        (_a = this.parentNode.childNodes).splice.apply(_a, __spreadArray([ idx + 1, 0 ], p.childNodes, false));
                    } else if (where === "afterbegin") {
                        resetParent(p.childNodes, this);
                        (_b = this.childNodes).unshift.apply(_b, p.childNodes);
                    } else if (where === "beforeend") {
                        p.childNodes.forEach((function(n) {
                            _this.appendChild(n);
                        }));
                    } else if (where === "beforebegin") {
                        var idx = this.parentNode.childNodes.findIndex((function(child) {
                            return child === _this;
                        }));
                        resetParent(p.childNodes, this.parentNode);
                        (_c = this.parentNode.childNodes).splice.apply(_c, __spreadArray([ idx, 0 ], p.childNodes, false));
                    } else {
                        throw new Error("The value provided ('".concat(where, "') is not one of 'beforebegin', 'afterbegin', 'beforeend', or 'afterend'"));
                    }
                    return this;
                };
                Object.defineProperty(HTMLElement.prototype, "nextSibling", {
                    get: function() {
                        if (this.parentNode) {
                            var children = this.parentNode.childNodes;
                            var i = 0;
                            while (i < children.length) {
                                var child = children[i++];
                                if (this === child) return children[i] || null;
                            }
                            return null;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "nextElementSibling", {
                    get: function() {
                        if (this.parentNode) {
                            var children = this.parentNode.childNodes;
                            var i = 0;
                            var find = false;
                            while (i < children.length) {
                                var child = children[i++];
                                if (find) {
                                    if (child instanceof HTMLElement) {
                                        return child || null;
                                    }
                                } else if (this === child) {
                                    find = true;
                                }
                            }
                            return null;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "previousSibling", {
                    get: function() {
                        if (this.parentNode) {
                            var children = this.parentNode.childNodes;
                            var i = children.length;
                            while (i > 0) {
                                var child = children[--i];
                                if (this === child) return children[i - 1] || null;
                            }
                            return null;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "previousElementSibling", {
                    get: function() {
                        if (this.parentNode) {
                            var children = this.parentNode.childNodes;
                            var i = children.length;
                            var find = false;
                            while (i > 0) {
                                var child = children[--i];
                                if (find) {
                                    if (child instanceof HTMLElement) {
                                        return child || null;
                                    }
                                } else if (this === child) {
                                    find = true;
                                }
                            }
                            return null;
                        }
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(HTMLElement.prototype, "classNames", {
                    get: function() {
                        return this.classList.toString();
                    },
                    enumerable: false,
                    configurable: true
                });
                HTMLElement.prototype.clone = function() {
                    return parse(this.toString()).firstChild;
                };
                return HTMLElement;
            }(node_1.default);
            exports["default"] = HTMLElement;
            var kMarkupPattern = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][-.:0-9_a-zA-Z]*)((?:\s+[^>]*?(?:(?:'[^']*')|(?:"[^"]*"))?)*)\s*(\/?)>/g;
            var kAttributePattern = /(?:^|\s)(id|class)\s*=\s*((?:'[^']*')|(?:"[^"]*")|\S+)/gi;
            var kSelfClosingElements = {
                area: true,
                AREA: true,
                base: true,
                BASE: true,
                br: true,
                BR: true,
                col: true,
                COL: true,
                hr: true,
                HR: true,
                img: true,
                IMG: true,
                input: true,
                INPUT: true,
                link: true,
                LINK: true,
                meta: true,
                META: true,
                source: true,
                SOURCE: true,
                embed: true,
                EMBED: true,
                param: true,
                PARAM: true,
                track: true,
                TRACK: true,
                wbr: true,
                WBR: true
            };
            var kElementsClosedByOpening = {
                li: {
                    li: true,
                    LI: true
                },
                LI: {
                    li: true,
                    LI: true
                },
                p: {
                    p: true,
                    div: true,
                    P: true,
                    DIV: true
                },
                P: {
                    p: true,
                    div: true,
                    P: true,
                    DIV: true
                },
                b: {
                    div: true,
                    DIV: true
                },
                B: {
                    div: true,
                    DIV: true
                },
                td: {
                    td: true,
                    th: true,
                    TD: true,
                    TH: true
                },
                TD: {
                    td: true,
                    th: true,
                    TD: true,
                    TH: true
                },
                th: {
                    td: true,
                    th: true,
                    TD: true,
                    TH: true
                },
                TH: {
                    td: true,
                    th: true,
                    TD: true,
                    TH: true
                },
                h1: {
                    h1: true,
                    H1: true
                },
                H1: {
                    h1: true,
                    H1: true
                },
                h2: {
                    h2: true,
                    H2: true
                },
                H2: {
                    h2: true,
                    H2: true
                },
                h3: {
                    h3: true,
                    H3: true
                },
                H3: {
                    h3: true,
                    H3: true
                },
                h4: {
                    h4: true,
                    H4: true
                },
                H4: {
                    h4: true,
                    H4: true
                },
                h5: {
                    h5: true,
                    H5: true
                },
                H5: {
                    h5: true,
                    H5: true
                },
                h6: {
                    h6: true,
                    H6: true
                },
                H6: {
                    h6: true,
                    H6: true
                }
            };
            var kElementsClosedByClosing = {
                li: {
                    ul: true,
                    ol: true,
                    UL: true,
                    OL: true
                },
                LI: {
                    ul: true,
                    ol: true,
                    UL: true,
                    OL: true
                },
                a: {
                    div: true,
                    DIV: true
                },
                A: {
                    div: true,
                    DIV: true
                },
                b: {
                    div: true,
                    DIV: true
                },
                B: {
                    div: true,
                    DIV: true
                },
                i: {
                    div: true,
                    DIV: true
                },
                I: {
                    div: true,
                    DIV: true
                },
                p: {
                    div: true,
                    DIV: true
                },
                P: {
                    div: true,
                    DIV: true
                },
                td: {
                    tr: true,
                    table: true,
                    TR: true,
                    TABLE: true
                },
                TD: {
                    tr: true,
                    table: true,
                    TR: true,
                    TABLE: true
                },
                th: {
                    tr: true,
                    table: true,
                    TR: true,
                    TABLE: true
                },
                TH: {
                    tr: true,
                    table: true,
                    TR: true,
                    TABLE: true
                }
            };
            var frameflag = "documentfragmentcontainer";
            function base_parse(data, options) {
                if (options === void 0) {
                    options = {
                        lowerCaseTagName: false,
                        comment: false
                    };
                }
                var elements = options.blockTextElements || {
                    script: true,
                    noscript: true,
                    style: true,
                    pre: true
                };
                var element_names = Object.keys(elements);
                var kBlockTextElements = element_names.map((function(it) {
                    return new RegExp("^".concat(it, "$"), "i");
                }));
                var kIgnoreElements = element_names.filter((function(it) {
                    return elements[it];
                })).map((function(it) {
                    return new RegExp("^".concat(it, "$"), "i");
                }));
                function element_should_be_ignore(tag) {
                    return kIgnoreElements.some((function(it) {
                        return it.test(tag);
                    }));
                }
                function is_block_text_element(tag) {
                    return kBlockTextElements.some((function(it) {
                        return it.test(tag);
                    }));
                }
                var createRange = function(startPos, endPos) {
                    return [ startPos - frameFlagOffset, endPos - frameFlagOffset ];
                };
                var root = new HTMLElement(null, {}, "", null, [ 0, data.length ]);
                var currentParent = root;
                var stack = [ root ];
                var lastTextPos = -1;
                var noNestedTagIndex = undefined;
                var match;
                data = "<".concat(frameflag, ">").concat(data, "</").concat(frameflag, ">");
                var lowerCaseTagName = options.lowerCaseTagName;
                var dataEndPos = data.length - (frameflag.length + 2);
                var frameFlagOffset = frameflag.length + 2;
                while (match = kMarkupPattern.exec(data)) {
                    var matchText = match[0], leadingSlash = match[1], tagName = match[2], attributes = match[3], closingSlash = match[4];
                    var matchLength = matchText.length;
                    var tagStartPos = kMarkupPattern.lastIndex - matchLength;
                    var tagEndPos = kMarkupPattern.lastIndex;
                    if (lastTextPos > -1) {
                        if (lastTextPos + matchLength < tagEndPos) {
                            var text = data.substring(lastTextPos, tagStartPos);
                            currentParent.appendChild(new text_1.default(text, currentParent, createRange(lastTextPos, tagStartPos)));
                        }
                    }
                    lastTextPos = kMarkupPattern.lastIndex;
                    if (tagName === frameflag) continue;
                    if (matchText[1] === "!") {
                        if (options.comment) {
                            var text = data.substring(tagStartPos + 4, tagEndPos - 3);
                            currentParent.appendChild(new comment_1.default(text, currentParent, createRange(tagStartPos, tagEndPos)));
                        }
                        continue;
                    }
                    if (lowerCaseTagName) tagName = tagName.toLowerCase();
                    if (!leadingSlash) {
                        var attrs = {};
                        for (var attMatch = void 0; attMatch = kAttributePattern.exec(attributes); ) {
                            var key = attMatch[1], val = attMatch[2];
                            var isQuoted = val[0] === "'" || val[0] === '"';
                            attrs[key.toLowerCase()] = isQuoted ? val.slice(1, val.length - 1) : val;
                        }
                        var parentTagName = currentParent.rawTagName;
                        if (!closingSlash && kElementsClosedByOpening[parentTagName]) {
                            if (kElementsClosedByOpening[parentTagName][tagName]) {
                                stack.pop();
                                currentParent = (0, back_1.default)(stack);
                            }
                        }
                        if (tagName === "a" || tagName === "A") {
                            if (noNestedTagIndex !== undefined) {
                                stack.splice(noNestedTagIndex);
                                currentParent = (0, back_1.default)(stack);
                            }
                            noNestedTagIndex = stack.length;
                        }
                        var tagEndPos_1 = kMarkupPattern.lastIndex;
                        var tagStartPos_1 = tagEndPos_1 - matchLength;
                        currentParent = currentParent.appendChild(new HTMLElement(tagName, attrs, attributes.slice(1), null, createRange(tagStartPos_1, tagEndPos_1)));
                        stack.push(currentParent);
                        if (is_block_text_element(tagName)) {
                            var closeMarkup = "</".concat(tagName, ">");
                            var closeIndex = lowerCaseTagName ? data.toLocaleLowerCase().indexOf(closeMarkup, kMarkupPattern.lastIndex) : data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
                            var textEndPos = closeIndex === -1 ? dataEndPos : closeIndex;
                            if (element_should_be_ignore(tagName)) {
                                var text = data.substring(tagEndPos_1, textEndPos);
                                if (text.length > 0 && /\S/.test(text)) {
                                    currentParent.appendChild(new text_1.default(text, currentParent, createRange(tagEndPos_1, textEndPos)));
                                }
                            }
                            if (closeIndex === -1) {
                                lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
                            } else {
                                lastTextPos = kMarkupPattern.lastIndex = closeIndex + closeMarkup.length;
                                leadingSlash = "/";
                            }
                        }
                    }
                    if (leadingSlash || closingSlash || kSelfClosingElements[tagName]) {
                        while (true) {
                            if (tagName === "a" || tagName === "A") noNestedTagIndex = undefined;
                            if (currentParent.rawTagName === tagName) {
                                currentParent.range[1] = createRange(-1, Math.max(lastTextPos, tagEndPos))[1];
                                stack.pop();
                                currentParent = (0, back_1.default)(stack);
                                break;
                            } else {
                                var parentTagName = currentParent.tagName;
                                if (kElementsClosedByClosing[parentTagName]) {
                                    if (kElementsClosedByClosing[parentTagName][tagName]) {
                                        stack.pop();
                                        currentParent = (0, back_1.default)(stack);
                                        continue;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                return stack;
            }
            exports.base_parse = base_parse;
            function parse(data, options) {
                if (options === void 0) {
                    options = {
                        lowerCaseTagName: false,
                        comment: false
                    };
                }
                var stack = base_parse(data, options);
                var root = stack[0];
                var _loop_1 = function() {
                    var last = stack.pop();
                    var oneBefore = (0, back_1.default)(stack);
                    if (last.parentNode && last.parentNode.parentNode) {
                        if (last.parentNode === oneBefore && last.tagName === oneBefore.tagName) {
                            if (options.parseNoneClosedTags !== true) {
                                oneBefore.removeChild(last);
                                last.childNodes.forEach((function(child) {
                                    oneBefore.parentNode.appendChild(child);
                                }));
                                stack.pop();
                            }
                        } else {
                            if (options.parseNoneClosedTags !== true) {
                                oneBefore.removeChild(last);
                                last.childNodes.forEach((function(child) {
                                    oneBefore.appendChild(child);
                                }));
                            }
                        }
                    } else {}
                };
                while (stack.length > 1) {
                    _loop_1();
                }
                return root;
            }
            exports.parse = parse;
            function resetParent(nodes, parent) {
                return nodes.map((function(node) {
                    node.parentNode = parent;
                    return node;
                }));
            }
        },
        "./node_modules/node-html-parser/dist/nodes/node.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var he_1 = __webpack_require__("./node_modules/he/he.js");
            var Node = function() {
                function Node(parentNode, range) {
                    if (parentNode === void 0) {
                        parentNode = null;
                    }
                    this.parentNode = parentNode;
                    this.childNodes = [];
                    Object.defineProperty(this, "range", {
                        enumerable: false,
                        writable: true,
                        configurable: true,
                        value: range !== null && range !== void 0 ? range : [ -1, -1 ]
                    });
                }
                Node.prototype.remove = function() {
                    var _this = this;
                    if (this.parentNode) {
                        var children = this.parentNode.childNodes;
                        this.parentNode.childNodes = children.filter((function(child) {
                            return _this !== child;
                        }));
                        this.parentNode = null;
                    }
                    return this;
                };
                Object.defineProperty(Node.prototype, "innerText", {
                    get: function() {
                        return this.rawText;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Node.prototype, "textContent", {
                    get: function() {
                        return (0, he_1.decode)(this.rawText);
                    },
                    set: function(val) {
                        this.rawText = (0, he_1.encode)(val);
                    },
                    enumerable: false,
                    configurable: true
                });
                return Node;
            }();
            exports["default"] = Node;
        },
        "./node_modules/node-html-parser/dist/nodes/text.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __extends = this && this.__extends || function() {
                var extendStatics = function(d, b) {
                    extendStatics = Object.setPrototypeOf || {
                        __proto__: []
                    } instanceof Array && function(d, b) {
                        d.__proto__ = b;
                    } || function(d, b) {
                        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
                    };
                    return extendStatics(d, b);
                };
                return function(d, b) {
                    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
                    extendStatics(d, b);
                    function __() {
                        this.constructor = d;
                    }
                    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
                };
            }();
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var he_1 = __webpack_require__("./node_modules/he/he.js");
            var node_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/node.js"));
            var type_1 = __importDefault(__webpack_require__("./node_modules/node-html-parser/dist/nodes/type.js"));
            var TextNode = function(_super) {
                __extends(TextNode, _super);
                function TextNode(rawText, parentNode, range) {
                    var _this = _super.call(this, parentNode, range) || this;
                    _this.nodeType = type_1.default.TEXT_NODE;
                    _this._rawText = rawText;
                    return _this;
                }
                TextNode.prototype.clone = function() {
                    return new TextNode(this._rawText, null);
                };
                Object.defineProperty(TextNode.prototype, "rawText", {
                    get: function() {
                        return this._rawText;
                    },
                    set: function(text) {
                        this._rawText = text;
                        this._trimmedRawText = void 0;
                        this._trimmedText = void 0;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(TextNode.prototype, "trimmedRawText", {
                    get: function() {
                        if (this._trimmedRawText !== undefined) return this._trimmedRawText;
                        this._trimmedRawText = trimText(this.rawText);
                        return this._trimmedRawText;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(TextNode.prototype, "trimmedText", {
                    get: function() {
                        if (this._trimmedText !== undefined) return this._trimmedText;
                        this._trimmedText = trimText(this.text);
                        return this._trimmedText;
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(TextNode.prototype, "text", {
                    get: function() {
                        return (0, he_1.decode)(this.rawText);
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(TextNode.prototype, "isWhitespace", {
                    get: function() {
                        return /^(\s|&nbsp;)*$/.test(this.rawText);
                    },
                    enumerable: false,
                    configurable: true
                });
                TextNode.prototype.toString = function() {
                    return this.rawText;
                };
                return TextNode;
            }(node_1.default);
            exports["default"] = TextNode;
            function trimText(text) {
                var i = 0;
                var startPos;
                var endPos;
                while (i >= 0 && i < text.length) {
                    if (/\S/.test(text[i])) {
                        if (startPos === undefined) {
                            startPos = i;
                            i = text.length;
                        } else {
                            endPos = i;
                            i = void 0;
                        }
                    }
                    if (startPos === undefined) i++; else i--;
                }
                if (startPos === undefined) startPos = 0;
                if (endPos === undefined) endPos = text.length - 1;
                var hasLeadingSpace = startPos > 0 && /[^\S\r\n]/.test(text[startPos - 1]);
                var hasTrailingSpace = endPos < text.length - 1 && /[^\S\r\n]/.test(text[endPos + 1]);
                return (hasLeadingSpace ? " " : "") + text.slice(startPos, endPos + 1) + (hasTrailingSpace ? " " : "");
            }
        },
        "./node_modules/node-html-parser/dist/nodes/type.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var NodeType;
            (function(NodeType) {
                NodeType[NodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
                NodeType[NodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
                NodeType[NodeType["COMMENT_NODE"] = 8] = "COMMENT_NODE";
            })(NodeType || (NodeType = {}));
            exports["default"] = NodeType;
        },
        "./node_modules/node-html-parser/dist/parse.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports["default"] = void 0;
            var html_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/html.js");
            Object.defineProperty(exports, "default", {
                enumerable: true,
                get: function() {
                    return html_1.parse;
                }
            });
        },
        "./node_modules/node-html-parser/dist/valid.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            var html_1 = __webpack_require__("./node_modules/node-html-parser/dist/nodes/html.js");
            function valid(data, options) {
                if (options === void 0) {
                    options = {
                        lowerCaseTagName: false,
                        comment: false
                    };
                }
                var stack = (0, html_1.base_parse)(data, options);
                return Boolean(stack.length === 1);
            }
            exports["default"] = valid;
        },
        "./node_modules/nth-check/lib/compile.js": function(__unused_webpack_module, exports, __webpack_require__) {
            "use strict";
            var __importDefault = this && this.__importDefault || function(mod) {
                return mod && mod.__esModule ? mod : {
                    default: mod
                };
            };
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.generate = exports.compile = void 0;
            var boolbase_1 = __importDefault(__webpack_require__("./node_modules/boolbase/index.js"));
            function compile(parsed) {
                var a = parsed[0];
                var b = parsed[1] - 1;
                if (b < 0 && a <= 0) return boolbase_1.default.falseFunc;
                if (a === -1) return function(index) {
                    return index <= b;
                };
                if (a === 0) return function(index) {
                    return index === b;
                };
                if (a === 1) return b < 0 ? boolbase_1.default.trueFunc : function(index) {
                    return index >= b;
                };
                var absA = Math.abs(a);
                var bMod = (b % absA + absA) % absA;
                return a > 1 ? function(index) {
                    return index >= b && index % absA === bMod;
                } : function(index) {
                    return index <= b && index % absA === bMod;
                };
            }
            exports.compile = compile;
            function generate(parsed) {
                var a = parsed[0];
                var b = parsed[1] - 1;
                var n = 0;
                if (a < 0) {
                    var aPos_1 = -a;
                    var minValue_1 = (b % aPos_1 + aPos_1) % aPos_1;
                    return function() {
                        var val = minValue_1 + aPos_1 * n++;
                        return val > b ? null : val;
                    };
                }
                if (a === 0) return b < 0 ? function() {
                    return null;
                } : function() {
                    return n++ === 0 ? b : null;
                };
                if (b < 0) {
                    b += a * Math.ceil(-b / a);
                }
                return function() {
                    return a * n++ + b;
                };
            }
            exports.generate = generate;
        },
        "./node_modules/nth-check/lib/index.js": (__unused_webpack_module, exports, __webpack_require__) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.sequence = exports.generate = exports.compile = exports.parse = void 0;
            var parse_js_1 = __webpack_require__("./node_modules/nth-check/lib/parse.js");
            Object.defineProperty(exports, "parse", {
                enumerable: true,
                get: function() {
                    return parse_js_1.parse;
                }
            });
            var compile_js_1 = __webpack_require__("./node_modules/nth-check/lib/compile.js");
            Object.defineProperty(exports, "compile", {
                enumerable: true,
                get: function() {
                    return compile_js_1.compile;
                }
            });
            Object.defineProperty(exports, "generate", {
                enumerable: true,
                get: function() {
                    return compile_js_1.generate;
                }
            });
            function nthCheck(formula) {
                return (0, compile_js_1.compile)((0, parse_js_1.parse)(formula));
            }
            exports["default"] = nthCheck;
            function sequence(formula) {
                return (0, compile_js_1.generate)((0, parse_js_1.parse)(formula));
            }
            exports.sequence = sequence;
        },
        "./node_modules/nth-check/lib/parse.js": (__unused_webpack_module, exports) => {
            "use strict";
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
            exports.parse = void 0;
            var whitespace = new Set([ 9, 10, 12, 13, 32 ]);
            var ZERO = "0".charCodeAt(0);
            var NINE = "9".charCodeAt(0);
            function parse(formula) {
                formula = formula.trim().toLowerCase();
                if (formula === "even") {
                    return [ 2, 0 ];
                } else if (formula === "odd") {
                    return [ 2, 1 ];
                }
                var idx = 0;
                var a = 0;
                var sign = readSign();
                var number = readNumber();
                if (idx < formula.length && formula.charAt(idx) === "n") {
                    idx++;
                    a = sign * (number !== null && number !== void 0 ? number : 1);
                    skipWhitespace();
                    if (idx < formula.length) {
                        sign = readSign();
                        skipWhitespace();
                        number = readNumber();
                    } else {
                        sign = number = 0;
                    }
                }
                if (number === null || idx < formula.length) {
                    throw new Error("n-th rule couldn't be parsed ('".concat(formula, "')"));
                }
                return [ a, sign * number ];
                function readSign() {
                    if (formula.charAt(idx) === "-") {
                        idx++;
                        return -1;
                    }
                    if (formula.charAt(idx) === "+") {
                        idx++;
                    }
                    return 1;
                }
                function readNumber() {
                    var start = idx;
                    var value = 0;
                    while (idx < formula.length && formula.charCodeAt(idx) >= ZERO && formula.charCodeAt(idx) <= NINE) {
                        value = value * 10 + (formula.charCodeAt(idx) - ZERO);
                        idx++;
                    }
                    return idx === start ? null : value;
                }
                function skipWhitespace() {
                    while (idx < formula.length && whitespace.has(formula.charCodeAt(idx))) {
                        idx++;
                    }
                }
            }
            exports.parse = parse;
        },
        dexie: module => {
            "use strict";
            module.exports = Dexie;
        },
        "webextension-polyfill": module => {
            "use strict";
            module.exports = browser;
        },
        "./node_modules/entities/lib/maps/decode.json": module => {
            "use strict";
            module.exports = JSON.parse('{"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376}');
        },
        "./node_modules/entities/lib/maps/entities.json": module => {
            "use strict";
            module.exports = JSON.parse('{"Aacute":"Á","aacute":"á","Abreve":"Ă","abreve":"ă","ac":"∾","acd":"∿","acE":"∾̳","Acirc":"Â","acirc":"â","acute":"´","Acy":"А","acy":"а","AElig":"Æ","aelig":"æ","af":"⁡","Afr":"𝔄","afr":"𝔞","Agrave":"À","agrave":"à","alefsym":"ℵ","aleph":"ℵ","Alpha":"Α","alpha":"α","Amacr":"Ā","amacr":"ā","amalg":"⨿","amp":"&","AMP":"&","andand":"⩕","And":"⩓","and":"∧","andd":"⩜","andslope":"⩘","andv":"⩚","ang":"∠","ange":"⦤","angle":"∠","angmsdaa":"⦨","angmsdab":"⦩","angmsdac":"⦪","angmsdad":"⦫","angmsdae":"⦬","angmsdaf":"⦭","angmsdag":"⦮","angmsdah":"⦯","angmsd":"∡","angrt":"∟","angrtvb":"⊾","angrtvbd":"⦝","angsph":"∢","angst":"Å","angzarr":"⍼","Aogon":"Ą","aogon":"ą","Aopf":"𝔸","aopf":"𝕒","apacir":"⩯","ap":"≈","apE":"⩰","ape":"≊","apid":"≋","apos":"\'","ApplyFunction":"⁡","approx":"≈","approxeq":"≊","Aring":"Å","aring":"å","Ascr":"𝒜","ascr":"𝒶","Assign":"≔","ast":"*","asymp":"≈","asympeq":"≍","Atilde":"Ã","atilde":"ã","Auml":"Ä","auml":"ä","awconint":"∳","awint":"⨑","backcong":"≌","backepsilon":"϶","backprime":"‵","backsim":"∽","backsimeq":"⋍","Backslash":"∖","Barv":"⫧","barvee":"⊽","barwed":"⌅","Barwed":"⌆","barwedge":"⌅","bbrk":"⎵","bbrktbrk":"⎶","bcong":"≌","Bcy":"Б","bcy":"б","bdquo":"„","becaus":"∵","because":"∵","Because":"∵","bemptyv":"⦰","bepsi":"϶","bernou":"ℬ","Bernoullis":"ℬ","Beta":"Β","beta":"β","beth":"ℶ","between":"≬","Bfr":"𝔅","bfr":"𝔟","bigcap":"⋂","bigcirc":"◯","bigcup":"⋃","bigodot":"⨀","bigoplus":"⨁","bigotimes":"⨂","bigsqcup":"⨆","bigstar":"★","bigtriangledown":"▽","bigtriangleup":"△","biguplus":"⨄","bigvee":"⋁","bigwedge":"⋀","bkarow":"⤍","blacklozenge":"⧫","blacksquare":"▪","blacktriangle":"▴","blacktriangledown":"▾","blacktriangleleft":"◂","blacktriangleright":"▸","blank":"␣","blk12":"▒","blk14":"░","blk34":"▓","block":"█","bne":"=⃥","bnequiv":"≡⃥","bNot":"⫭","bnot":"⌐","Bopf":"𝔹","bopf":"𝕓","bot":"⊥","bottom":"⊥","bowtie":"⋈","boxbox":"⧉","boxdl":"┐","boxdL":"╕","boxDl":"╖","boxDL":"╗","boxdr":"┌","boxdR":"╒","boxDr":"╓","boxDR":"╔","boxh":"─","boxH":"═","boxhd":"┬","boxHd":"╤","boxhD":"╥","boxHD":"╦","boxhu":"┴","boxHu":"╧","boxhU":"╨","boxHU":"╩","boxminus":"⊟","boxplus":"⊞","boxtimes":"⊠","boxul":"┘","boxuL":"╛","boxUl":"╜","boxUL":"╝","boxur":"└","boxuR":"╘","boxUr":"╙","boxUR":"╚","boxv":"│","boxV":"║","boxvh":"┼","boxvH":"╪","boxVh":"╫","boxVH":"╬","boxvl":"┤","boxvL":"╡","boxVl":"╢","boxVL":"╣","boxvr":"├","boxvR":"╞","boxVr":"╟","boxVR":"╠","bprime":"‵","breve":"˘","Breve":"˘","brvbar":"¦","bscr":"𝒷","Bscr":"ℬ","bsemi":"⁏","bsim":"∽","bsime":"⋍","bsolb":"⧅","bsol":"\\\\","bsolhsub":"⟈","bull":"•","bullet":"•","bump":"≎","bumpE":"⪮","bumpe":"≏","Bumpeq":"≎","bumpeq":"≏","Cacute":"Ć","cacute":"ć","capand":"⩄","capbrcup":"⩉","capcap":"⩋","cap":"∩","Cap":"⋒","capcup":"⩇","capdot":"⩀","CapitalDifferentialD":"ⅅ","caps":"∩︀","caret":"⁁","caron":"ˇ","Cayleys":"ℭ","ccaps":"⩍","Ccaron":"Č","ccaron":"č","Ccedil":"Ç","ccedil":"ç","Ccirc":"Ĉ","ccirc":"ĉ","Cconint":"∰","ccups":"⩌","ccupssm":"⩐","Cdot":"Ċ","cdot":"ċ","cedil":"¸","Cedilla":"¸","cemptyv":"⦲","cent":"¢","centerdot":"·","CenterDot":"·","cfr":"𝔠","Cfr":"ℭ","CHcy":"Ч","chcy":"ч","check":"✓","checkmark":"✓","Chi":"Χ","chi":"χ","circ":"ˆ","circeq":"≗","circlearrowleft":"↺","circlearrowright":"↻","circledast":"⊛","circledcirc":"⊚","circleddash":"⊝","CircleDot":"⊙","circledR":"®","circledS":"Ⓢ","CircleMinus":"⊖","CirclePlus":"⊕","CircleTimes":"⊗","cir":"○","cirE":"⧃","cire":"≗","cirfnint":"⨐","cirmid":"⫯","cirscir":"⧂","ClockwiseContourIntegral":"∲","CloseCurlyDoubleQuote":"”","CloseCurlyQuote":"’","clubs":"♣","clubsuit":"♣","colon":":","Colon":"∷","Colone":"⩴","colone":"≔","coloneq":"≔","comma":",","commat":"@","comp":"∁","compfn":"∘","complement":"∁","complexes":"ℂ","cong":"≅","congdot":"⩭","Congruent":"≡","conint":"∮","Conint":"∯","ContourIntegral":"∮","copf":"𝕔","Copf":"ℂ","coprod":"∐","Coproduct":"∐","copy":"©","COPY":"©","copysr":"℗","CounterClockwiseContourIntegral":"∳","crarr":"↵","cross":"✗","Cross":"⨯","Cscr":"𝒞","cscr":"𝒸","csub":"⫏","csube":"⫑","csup":"⫐","csupe":"⫒","ctdot":"⋯","cudarrl":"⤸","cudarrr":"⤵","cuepr":"⋞","cuesc":"⋟","cularr":"↶","cularrp":"⤽","cupbrcap":"⩈","cupcap":"⩆","CupCap":"≍","cup":"∪","Cup":"⋓","cupcup":"⩊","cupdot":"⊍","cupor":"⩅","cups":"∪︀","curarr":"↷","curarrm":"⤼","curlyeqprec":"⋞","curlyeqsucc":"⋟","curlyvee":"⋎","curlywedge":"⋏","curren":"¤","curvearrowleft":"↶","curvearrowright":"↷","cuvee":"⋎","cuwed":"⋏","cwconint":"∲","cwint":"∱","cylcty":"⌭","dagger":"†","Dagger":"‡","daleth":"ℸ","darr":"↓","Darr":"↡","dArr":"⇓","dash":"‐","Dashv":"⫤","dashv":"⊣","dbkarow":"⤏","dblac":"˝","Dcaron":"Ď","dcaron":"ď","Dcy":"Д","dcy":"д","ddagger":"‡","ddarr":"⇊","DD":"ⅅ","dd":"ⅆ","DDotrahd":"⤑","ddotseq":"⩷","deg":"°","Del":"∇","Delta":"Δ","delta":"δ","demptyv":"⦱","dfisht":"⥿","Dfr":"𝔇","dfr":"𝔡","dHar":"⥥","dharl":"⇃","dharr":"⇂","DiacriticalAcute":"´","DiacriticalDot":"˙","DiacriticalDoubleAcute":"˝","DiacriticalGrave":"`","DiacriticalTilde":"˜","diam":"⋄","diamond":"⋄","Diamond":"⋄","diamondsuit":"♦","diams":"♦","die":"¨","DifferentialD":"ⅆ","digamma":"ϝ","disin":"⋲","div":"÷","divide":"÷","divideontimes":"⋇","divonx":"⋇","DJcy":"Ђ","djcy":"ђ","dlcorn":"⌞","dlcrop":"⌍","dollar":"$","Dopf":"𝔻","dopf":"𝕕","Dot":"¨","dot":"˙","DotDot":"⃜","doteq":"≐","doteqdot":"≑","DotEqual":"≐","dotminus":"∸","dotplus":"∔","dotsquare":"⊡","doublebarwedge":"⌆","DoubleContourIntegral":"∯","DoubleDot":"¨","DoubleDownArrow":"⇓","DoubleLeftArrow":"⇐","DoubleLeftRightArrow":"⇔","DoubleLeftTee":"⫤","DoubleLongLeftArrow":"⟸","DoubleLongLeftRightArrow":"⟺","DoubleLongRightArrow":"⟹","DoubleRightArrow":"⇒","DoubleRightTee":"⊨","DoubleUpArrow":"⇑","DoubleUpDownArrow":"⇕","DoubleVerticalBar":"∥","DownArrowBar":"⤓","downarrow":"↓","DownArrow":"↓","Downarrow":"⇓","DownArrowUpArrow":"⇵","DownBreve":"̑","downdownarrows":"⇊","downharpoonleft":"⇃","downharpoonright":"⇂","DownLeftRightVector":"⥐","DownLeftTeeVector":"⥞","DownLeftVectorBar":"⥖","DownLeftVector":"↽","DownRightTeeVector":"⥟","DownRightVectorBar":"⥗","DownRightVector":"⇁","DownTeeArrow":"↧","DownTee":"⊤","drbkarow":"⤐","drcorn":"⌟","drcrop":"⌌","Dscr":"𝒟","dscr":"𝒹","DScy":"Ѕ","dscy":"ѕ","dsol":"⧶","Dstrok":"Đ","dstrok":"đ","dtdot":"⋱","dtri":"▿","dtrif":"▾","duarr":"⇵","duhar":"⥯","dwangle":"⦦","DZcy":"Џ","dzcy":"џ","dzigrarr":"⟿","Eacute":"É","eacute":"é","easter":"⩮","Ecaron":"Ě","ecaron":"ě","Ecirc":"Ê","ecirc":"ê","ecir":"≖","ecolon":"≕","Ecy":"Э","ecy":"э","eDDot":"⩷","Edot":"Ė","edot":"ė","eDot":"≑","ee":"ⅇ","efDot":"≒","Efr":"𝔈","efr":"𝔢","eg":"⪚","Egrave":"È","egrave":"è","egs":"⪖","egsdot":"⪘","el":"⪙","Element":"∈","elinters":"⏧","ell":"ℓ","els":"⪕","elsdot":"⪗","Emacr":"Ē","emacr":"ē","empty":"∅","emptyset":"∅","EmptySmallSquare":"◻","emptyv":"∅","EmptyVerySmallSquare":"▫","emsp13":" ","emsp14":" ","emsp":" ","ENG":"Ŋ","eng":"ŋ","ensp":" ","Eogon":"Ę","eogon":"ę","Eopf":"𝔼","eopf":"𝕖","epar":"⋕","eparsl":"⧣","eplus":"⩱","epsi":"ε","Epsilon":"Ε","epsilon":"ε","epsiv":"ϵ","eqcirc":"≖","eqcolon":"≕","eqsim":"≂","eqslantgtr":"⪖","eqslantless":"⪕","Equal":"⩵","equals":"=","EqualTilde":"≂","equest":"≟","Equilibrium":"⇌","equiv":"≡","equivDD":"⩸","eqvparsl":"⧥","erarr":"⥱","erDot":"≓","escr":"ℯ","Escr":"ℰ","esdot":"≐","Esim":"⩳","esim":"≂","Eta":"Η","eta":"η","ETH":"Ð","eth":"ð","Euml":"Ë","euml":"ë","euro":"€","excl":"!","exist":"∃","Exists":"∃","expectation":"ℰ","exponentiale":"ⅇ","ExponentialE":"ⅇ","fallingdotseq":"≒","Fcy":"Ф","fcy":"ф","female":"♀","ffilig":"ﬃ","fflig":"ﬀ","ffllig":"ﬄ","Ffr":"𝔉","ffr":"𝔣","filig":"ﬁ","FilledSmallSquare":"◼","FilledVerySmallSquare":"▪","fjlig":"fj","flat":"♭","fllig":"ﬂ","fltns":"▱","fnof":"ƒ","Fopf":"𝔽","fopf":"𝕗","forall":"∀","ForAll":"∀","fork":"⋔","forkv":"⫙","Fouriertrf":"ℱ","fpartint":"⨍","frac12":"½","frac13":"⅓","frac14":"¼","frac15":"⅕","frac16":"⅙","frac18":"⅛","frac23":"⅔","frac25":"⅖","frac34":"¾","frac35":"⅗","frac38":"⅜","frac45":"⅘","frac56":"⅚","frac58":"⅝","frac78":"⅞","frasl":"⁄","frown":"⌢","fscr":"𝒻","Fscr":"ℱ","gacute":"ǵ","Gamma":"Γ","gamma":"γ","Gammad":"Ϝ","gammad":"ϝ","gap":"⪆","Gbreve":"Ğ","gbreve":"ğ","Gcedil":"Ģ","Gcirc":"Ĝ","gcirc":"ĝ","Gcy":"Г","gcy":"г","Gdot":"Ġ","gdot":"ġ","ge":"≥","gE":"≧","gEl":"⪌","gel":"⋛","geq":"≥","geqq":"≧","geqslant":"⩾","gescc":"⪩","ges":"⩾","gesdot":"⪀","gesdoto":"⪂","gesdotol":"⪄","gesl":"⋛︀","gesles":"⪔","Gfr":"𝔊","gfr":"𝔤","gg":"≫","Gg":"⋙","ggg":"⋙","gimel":"ℷ","GJcy":"Ѓ","gjcy":"ѓ","gla":"⪥","gl":"≷","glE":"⪒","glj":"⪤","gnap":"⪊","gnapprox":"⪊","gne":"⪈","gnE":"≩","gneq":"⪈","gneqq":"≩","gnsim":"⋧","Gopf":"𝔾","gopf":"𝕘","grave":"`","GreaterEqual":"≥","GreaterEqualLess":"⋛","GreaterFullEqual":"≧","GreaterGreater":"⪢","GreaterLess":"≷","GreaterSlantEqual":"⩾","GreaterTilde":"≳","Gscr":"𝒢","gscr":"ℊ","gsim":"≳","gsime":"⪎","gsiml":"⪐","gtcc":"⪧","gtcir":"⩺","gt":">","GT":">","Gt":"≫","gtdot":"⋗","gtlPar":"⦕","gtquest":"⩼","gtrapprox":"⪆","gtrarr":"⥸","gtrdot":"⋗","gtreqless":"⋛","gtreqqless":"⪌","gtrless":"≷","gtrsim":"≳","gvertneqq":"≩︀","gvnE":"≩︀","Hacek":"ˇ","hairsp":" ","half":"½","hamilt":"ℋ","HARDcy":"Ъ","hardcy":"ъ","harrcir":"⥈","harr":"↔","hArr":"⇔","harrw":"↭","Hat":"^","hbar":"ℏ","Hcirc":"Ĥ","hcirc":"ĥ","hearts":"♥","heartsuit":"♥","hellip":"…","hercon":"⊹","hfr":"𝔥","Hfr":"ℌ","HilbertSpace":"ℋ","hksearow":"⤥","hkswarow":"⤦","hoarr":"⇿","homtht":"∻","hookleftarrow":"↩","hookrightarrow":"↪","hopf":"𝕙","Hopf":"ℍ","horbar":"―","HorizontalLine":"─","hscr":"𝒽","Hscr":"ℋ","hslash":"ℏ","Hstrok":"Ħ","hstrok":"ħ","HumpDownHump":"≎","HumpEqual":"≏","hybull":"⁃","hyphen":"‐","Iacute":"Í","iacute":"í","ic":"⁣","Icirc":"Î","icirc":"î","Icy":"И","icy":"и","Idot":"İ","IEcy":"Е","iecy":"е","iexcl":"¡","iff":"⇔","ifr":"𝔦","Ifr":"ℑ","Igrave":"Ì","igrave":"ì","ii":"ⅈ","iiiint":"⨌","iiint":"∭","iinfin":"⧜","iiota":"℩","IJlig":"Ĳ","ijlig":"ĳ","Imacr":"Ī","imacr":"ī","image":"ℑ","ImaginaryI":"ⅈ","imagline":"ℐ","imagpart":"ℑ","imath":"ı","Im":"ℑ","imof":"⊷","imped":"Ƶ","Implies":"⇒","incare":"℅","in":"∈","infin":"∞","infintie":"⧝","inodot":"ı","intcal":"⊺","int":"∫","Int":"∬","integers":"ℤ","Integral":"∫","intercal":"⊺","Intersection":"⋂","intlarhk":"⨗","intprod":"⨼","InvisibleComma":"⁣","InvisibleTimes":"⁢","IOcy":"Ё","iocy":"ё","Iogon":"Į","iogon":"į","Iopf":"𝕀","iopf":"𝕚","Iota":"Ι","iota":"ι","iprod":"⨼","iquest":"¿","iscr":"𝒾","Iscr":"ℐ","isin":"∈","isindot":"⋵","isinE":"⋹","isins":"⋴","isinsv":"⋳","isinv":"∈","it":"⁢","Itilde":"Ĩ","itilde":"ĩ","Iukcy":"І","iukcy":"і","Iuml":"Ï","iuml":"ï","Jcirc":"Ĵ","jcirc":"ĵ","Jcy":"Й","jcy":"й","Jfr":"𝔍","jfr":"𝔧","jmath":"ȷ","Jopf":"𝕁","jopf":"𝕛","Jscr":"𝒥","jscr":"𝒿","Jsercy":"Ј","jsercy":"ј","Jukcy":"Є","jukcy":"є","Kappa":"Κ","kappa":"κ","kappav":"ϰ","Kcedil":"Ķ","kcedil":"ķ","Kcy":"К","kcy":"к","Kfr":"𝔎","kfr":"𝔨","kgreen":"ĸ","KHcy":"Х","khcy":"х","KJcy":"Ќ","kjcy":"ќ","Kopf":"𝕂","kopf":"𝕜","Kscr":"𝒦","kscr":"𝓀","lAarr":"⇚","Lacute":"Ĺ","lacute":"ĺ","laemptyv":"⦴","lagran":"ℒ","Lambda":"Λ","lambda":"λ","lang":"⟨","Lang":"⟪","langd":"⦑","langle":"⟨","lap":"⪅","Laplacetrf":"ℒ","laquo":"«","larrb":"⇤","larrbfs":"⤟","larr":"←","Larr":"↞","lArr":"⇐","larrfs":"⤝","larrhk":"↩","larrlp":"↫","larrpl":"⤹","larrsim":"⥳","larrtl":"↢","latail":"⤙","lAtail":"⤛","lat":"⪫","late":"⪭","lates":"⪭︀","lbarr":"⤌","lBarr":"⤎","lbbrk":"❲","lbrace":"{","lbrack":"[","lbrke":"⦋","lbrksld":"⦏","lbrkslu":"⦍","Lcaron":"Ľ","lcaron":"ľ","Lcedil":"Ļ","lcedil":"ļ","lceil":"⌈","lcub":"{","Lcy":"Л","lcy":"л","ldca":"⤶","ldquo":"“","ldquor":"„","ldrdhar":"⥧","ldrushar":"⥋","ldsh":"↲","le":"≤","lE":"≦","LeftAngleBracket":"⟨","LeftArrowBar":"⇤","leftarrow":"←","LeftArrow":"←","Leftarrow":"⇐","LeftArrowRightArrow":"⇆","leftarrowtail":"↢","LeftCeiling":"⌈","LeftDoubleBracket":"⟦","LeftDownTeeVector":"⥡","LeftDownVectorBar":"⥙","LeftDownVector":"⇃","LeftFloor":"⌊","leftharpoondown":"↽","leftharpoonup":"↼","leftleftarrows":"⇇","leftrightarrow":"↔","LeftRightArrow":"↔","Leftrightarrow":"⇔","leftrightarrows":"⇆","leftrightharpoons":"⇋","leftrightsquigarrow":"↭","LeftRightVector":"⥎","LeftTeeArrow":"↤","LeftTee":"⊣","LeftTeeVector":"⥚","leftthreetimes":"⋋","LeftTriangleBar":"⧏","LeftTriangle":"⊲","LeftTriangleEqual":"⊴","LeftUpDownVector":"⥑","LeftUpTeeVector":"⥠","LeftUpVectorBar":"⥘","LeftUpVector":"↿","LeftVectorBar":"⥒","LeftVector":"↼","lEg":"⪋","leg":"⋚","leq":"≤","leqq":"≦","leqslant":"⩽","lescc":"⪨","les":"⩽","lesdot":"⩿","lesdoto":"⪁","lesdotor":"⪃","lesg":"⋚︀","lesges":"⪓","lessapprox":"⪅","lessdot":"⋖","lesseqgtr":"⋚","lesseqqgtr":"⪋","LessEqualGreater":"⋚","LessFullEqual":"≦","LessGreater":"≶","lessgtr":"≶","LessLess":"⪡","lesssim":"≲","LessSlantEqual":"⩽","LessTilde":"≲","lfisht":"⥼","lfloor":"⌊","Lfr":"𝔏","lfr":"𝔩","lg":"≶","lgE":"⪑","lHar":"⥢","lhard":"↽","lharu":"↼","lharul":"⥪","lhblk":"▄","LJcy":"Љ","ljcy":"љ","llarr":"⇇","ll":"≪","Ll":"⋘","llcorner":"⌞","Lleftarrow":"⇚","llhard":"⥫","lltri":"◺","Lmidot":"Ŀ","lmidot":"ŀ","lmoustache":"⎰","lmoust":"⎰","lnap":"⪉","lnapprox":"⪉","lne":"⪇","lnE":"≨","lneq":"⪇","lneqq":"≨","lnsim":"⋦","loang":"⟬","loarr":"⇽","lobrk":"⟦","longleftarrow":"⟵","LongLeftArrow":"⟵","Longleftarrow":"⟸","longleftrightarrow":"⟷","LongLeftRightArrow":"⟷","Longleftrightarrow":"⟺","longmapsto":"⟼","longrightarrow":"⟶","LongRightArrow":"⟶","Longrightarrow":"⟹","looparrowleft":"↫","looparrowright":"↬","lopar":"⦅","Lopf":"𝕃","lopf":"𝕝","loplus":"⨭","lotimes":"⨴","lowast":"∗","lowbar":"_","LowerLeftArrow":"↙","LowerRightArrow":"↘","loz":"◊","lozenge":"◊","lozf":"⧫","lpar":"(","lparlt":"⦓","lrarr":"⇆","lrcorner":"⌟","lrhar":"⇋","lrhard":"⥭","lrm":"‎","lrtri":"⊿","lsaquo":"‹","lscr":"𝓁","Lscr":"ℒ","lsh":"↰","Lsh":"↰","lsim":"≲","lsime":"⪍","lsimg":"⪏","lsqb":"[","lsquo":"‘","lsquor":"‚","Lstrok":"Ł","lstrok":"ł","ltcc":"⪦","ltcir":"⩹","lt":"<","LT":"<","Lt":"≪","ltdot":"⋖","lthree":"⋋","ltimes":"⋉","ltlarr":"⥶","ltquest":"⩻","ltri":"◃","ltrie":"⊴","ltrif":"◂","ltrPar":"⦖","lurdshar":"⥊","luruhar":"⥦","lvertneqq":"≨︀","lvnE":"≨︀","macr":"¯","male":"♂","malt":"✠","maltese":"✠","Map":"⤅","map":"↦","mapsto":"↦","mapstodown":"↧","mapstoleft":"↤","mapstoup":"↥","marker":"▮","mcomma":"⨩","Mcy":"М","mcy":"м","mdash":"—","mDDot":"∺","measuredangle":"∡","MediumSpace":" ","Mellintrf":"ℳ","Mfr":"𝔐","mfr":"𝔪","mho":"℧","micro":"µ","midast":"*","midcir":"⫰","mid":"∣","middot":"·","minusb":"⊟","minus":"−","minusd":"∸","minusdu":"⨪","MinusPlus":"∓","mlcp":"⫛","mldr":"…","mnplus":"∓","models":"⊧","Mopf":"𝕄","mopf":"𝕞","mp":"∓","mscr":"𝓂","Mscr":"ℳ","mstpos":"∾","Mu":"Μ","mu":"μ","multimap":"⊸","mumap":"⊸","nabla":"∇","Nacute":"Ń","nacute":"ń","nang":"∠⃒","nap":"≉","napE":"⩰̸","napid":"≋̸","napos":"ŉ","napprox":"≉","natural":"♮","naturals":"ℕ","natur":"♮","nbsp":" ","nbump":"≎̸","nbumpe":"≏̸","ncap":"⩃","Ncaron":"Ň","ncaron":"ň","Ncedil":"Ņ","ncedil":"ņ","ncong":"≇","ncongdot":"⩭̸","ncup":"⩂","Ncy":"Н","ncy":"н","ndash":"–","nearhk":"⤤","nearr":"↗","neArr":"⇗","nearrow":"↗","ne":"≠","nedot":"≐̸","NegativeMediumSpace":"​","NegativeThickSpace":"​","NegativeThinSpace":"​","NegativeVeryThinSpace":"​","nequiv":"≢","nesear":"⤨","nesim":"≂̸","NestedGreaterGreater":"≫","NestedLessLess":"≪","NewLine":"\\n","nexist":"∄","nexists":"∄","Nfr":"𝔑","nfr":"𝔫","ngE":"≧̸","nge":"≱","ngeq":"≱","ngeqq":"≧̸","ngeqslant":"⩾̸","nges":"⩾̸","nGg":"⋙̸","ngsim":"≵","nGt":"≫⃒","ngt":"≯","ngtr":"≯","nGtv":"≫̸","nharr":"↮","nhArr":"⇎","nhpar":"⫲","ni":"∋","nis":"⋼","nisd":"⋺","niv":"∋","NJcy":"Њ","njcy":"њ","nlarr":"↚","nlArr":"⇍","nldr":"‥","nlE":"≦̸","nle":"≰","nleftarrow":"↚","nLeftarrow":"⇍","nleftrightarrow":"↮","nLeftrightarrow":"⇎","nleq":"≰","nleqq":"≦̸","nleqslant":"⩽̸","nles":"⩽̸","nless":"≮","nLl":"⋘̸","nlsim":"≴","nLt":"≪⃒","nlt":"≮","nltri":"⋪","nltrie":"⋬","nLtv":"≪̸","nmid":"∤","NoBreak":"⁠","NonBreakingSpace":" ","nopf":"𝕟","Nopf":"ℕ","Not":"⫬","not":"¬","NotCongruent":"≢","NotCupCap":"≭","NotDoubleVerticalBar":"∦","NotElement":"∉","NotEqual":"≠","NotEqualTilde":"≂̸","NotExists":"∄","NotGreater":"≯","NotGreaterEqual":"≱","NotGreaterFullEqual":"≧̸","NotGreaterGreater":"≫̸","NotGreaterLess":"≹","NotGreaterSlantEqual":"⩾̸","NotGreaterTilde":"≵","NotHumpDownHump":"≎̸","NotHumpEqual":"≏̸","notin":"∉","notindot":"⋵̸","notinE":"⋹̸","notinva":"∉","notinvb":"⋷","notinvc":"⋶","NotLeftTriangleBar":"⧏̸","NotLeftTriangle":"⋪","NotLeftTriangleEqual":"⋬","NotLess":"≮","NotLessEqual":"≰","NotLessGreater":"≸","NotLessLess":"≪̸","NotLessSlantEqual":"⩽̸","NotLessTilde":"≴","NotNestedGreaterGreater":"⪢̸","NotNestedLessLess":"⪡̸","notni":"∌","notniva":"∌","notnivb":"⋾","notnivc":"⋽","NotPrecedes":"⊀","NotPrecedesEqual":"⪯̸","NotPrecedesSlantEqual":"⋠","NotReverseElement":"∌","NotRightTriangleBar":"⧐̸","NotRightTriangle":"⋫","NotRightTriangleEqual":"⋭","NotSquareSubset":"⊏̸","NotSquareSubsetEqual":"⋢","NotSquareSuperset":"⊐̸","NotSquareSupersetEqual":"⋣","NotSubset":"⊂⃒","NotSubsetEqual":"⊈","NotSucceeds":"⊁","NotSucceedsEqual":"⪰̸","NotSucceedsSlantEqual":"⋡","NotSucceedsTilde":"≿̸","NotSuperset":"⊃⃒","NotSupersetEqual":"⊉","NotTilde":"≁","NotTildeEqual":"≄","NotTildeFullEqual":"≇","NotTildeTilde":"≉","NotVerticalBar":"∤","nparallel":"∦","npar":"∦","nparsl":"⫽⃥","npart":"∂̸","npolint":"⨔","npr":"⊀","nprcue":"⋠","nprec":"⊀","npreceq":"⪯̸","npre":"⪯̸","nrarrc":"⤳̸","nrarr":"↛","nrArr":"⇏","nrarrw":"↝̸","nrightarrow":"↛","nRightarrow":"⇏","nrtri":"⋫","nrtrie":"⋭","nsc":"⊁","nsccue":"⋡","nsce":"⪰̸","Nscr":"𝒩","nscr":"𝓃","nshortmid":"∤","nshortparallel":"∦","nsim":"≁","nsime":"≄","nsimeq":"≄","nsmid":"∤","nspar":"∦","nsqsube":"⋢","nsqsupe":"⋣","nsub":"⊄","nsubE":"⫅̸","nsube":"⊈","nsubset":"⊂⃒","nsubseteq":"⊈","nsubseteqq":"⫅̸","nsucc":"⊁","nsucceq":"⪰̸","nsup":"⊅","nsupE":"⫆̸","nsupe":"⊉","nsupset":"⊃⃒","nsupseteq":"⊉","nsupseteqq":"⫆̸","ntgl":"≹","Ntilde":"Ñ","ntilde":"ñ","ntlg":"≸","ntriangleleft":"⋪","ntrianglelefteq":"⋬","ntriangleright":"⋫","ntrianglerighteq":"⋭","Nu":"Ν","nu":"ν","num":"#","numero":"№","numsp":" ","nvap":"≍⃒","nvdash":"⊬","nvDash":"⊭","nVdash":"⊮","nVDash":"⊯","nvge":"≥⃒","nvgt":">⃒","nvHarr":"⤄","nvinfin":"⧞","nvlArr":"⤂","nvle":"≤⃒","nvlt":"<⃒","nvltrie":"⊴⃒","nvrArr":"⤃","nvrtrie":"⊵⃒","nvsim":"∼⃒","nwarhk":"⤣","nwarr":"↖","nwArr":"⇖","nwarrow":"↖","nwnear":"⤧","Oacute":"Ó","oacute":"ó","oast":"⊛","Ocirc":"Ô","ocirc":"ô","ocir":"⊚","Ocy":"О","ocy":"о","odash":"⊝","Odblac":"Ő","odblac":"ő","odiv":"⨸","odot":"⊙","odsold":"⦼","OElig":"Œ","oelig":"œ","ofcir":"⦿","Ofr":"𝔒","ofr":"𝔬","ogon":"˛","Ograve":"Ò","ograve":"ò","ogt":"⧁","ohbar":"⦵","ohm":"Ω","oint":"∮","olarr":"↺","olcir":"⦾","olcross":"⦻","oline":"‾","olt":"⧀","Omacr":"Ō","omacr":"ō","Omega":"Ω","omega":"ω","Omicron":"Ο","omicron":"ο","omid":"⦶","ominus":"⊖","Oopf":"𝕆","oopf":"𝕠","opar":"⦷","OpenCurlyDoubleQuote":"“","OpenCurlyQuote":"‘","operp":"⦹","oplus":"⊕","orarr":"↻","Or":"⩔","or":"∨","ord":"⩝","order":"ℴ","orderof":"ℴ","ordf":"ª","ordm":"º","origof":"⊶","oror":"⩖","orslope":"⩗","orv":"⩛","oS":"Ⓢ","Oscr":"𝒪","oscr":"ℴ","Oslash":"Ø","oslash":"ø","osol":"⊘","Otilde":"Õ","otilde":"õ","otimesas":"⨶","Otimes":"⨷","otimes":"⊗","Ouml":"Ö","ouml":"ö","ovbar":"⌽","OverBar":"‾","OverBrace":"⏞","OverBracket":"⎴","OverParenthesis":"⏜","para":"¶","parallel":"∥","par":"∥","parsim":"⫳","parsl":"⫽","part":"∂","PartialD":"∂","Pcy":"П","pcy":"п","percnt":"%","period":".","permil":"‰","perp":"⊥","pertenk":"‱","Pfr":"𝔓","pfr":"𝔭","Phi":"Φ","phi":"φ","phiv":"ϕ","phmmat":"ℳ","phone":"☎","Pi":"Π","pi":"π","pitchfork":"⋔","piv":"ϖ","planck":"ℏ","planckh":"ℎ","plankv":"ℏ","plusacir":"⨣","plusb":"⊞","pluscir":"⨢","plus":"+","plusdo":"∔","plusdu":"⨥","pluse":"⩲","PlusMinus":"±","plusmn":"±","plussim":"⨦","plustwo":"⨧","pm":"±","Poincareplane":"ℌ","pointint":"⨕","popf":"𝕡","Popf":"ℙ","pound":"£","prap":"⪷","Pr":"⪻","pr":"≺","prcue":"≼","precapprox":"⪷","prec":"≺","preccurlyeq":"≼","Precedes":"≺","PrecedesEqual":"⪯","PrecedesSlantEqual":"≼","PrecedesTilde":"≾","preceq":"⪯","precnapprox":"⪹","precneqq":"⪵","precnsim":"⋨","pre":"⪯","prE":"⪳","precsim":"≾","prime":"′","Prime":"″","primes":"ℙ","prnap":"⪹","prnE":"⪵","prnsim":"⋨","prod":"∏","Product":"∏","profalar":"⌮","profline":"⌒","profsurf":"⌓","prop":"∝","Proportional":"∝","Proportion":"∷","propto":"∝","prsim":"≾","prurel":"⊰","Pscr":"𝒫","pscr":"𝓅","Psi":"Ψ","psi":"ψ","puncsp":" ","Qfr":"𝔔","qfr":"𝔮","qint":"⨌","qopf":"𝕢","Qopf":"ℚ","qprime":"⁗","Qscr":"𝒬","qscr":"𝓆","quaternions":"ℍ","quatint":"⨖","quest":"?","questeq":"≟","quot":"\\"","QUOT":"\\"","rAarr":"⇛","race":"∽̱","Racute":"Ŕ","racute":"ŕ","radic":"√","raemptyv":"⦳","rang":"⟩","Rang":"⟫","rangd":"⦒","range":"⦥","rangle":"⟩","raquo":"»","rarrap":"⥵","rarrb":"⇥","rarrbfs":"⤠","rarrc":"⤳","rarr":"→","Rarr":"↠","rArr":"⇒","rarrfs":"⤞","rarrhk":"↪","rarrlp":"↬","rarrpl":"⥅","rarrsim":"⥴","Rarrtl":"⤖","rarrtl":"↣","rarrw":"↝","ratail":"⤚","rAtail":"⤜","ratio":"∶","rationals":"ℚ","rbarr":"⤍","rBarr":"⤏","RBarr":"⤐","rbbrk":"❳","rbrace":"}","rbrack":"]","rbrke":"⦌","rbrksld":"⦎","rbrkslu":"⦐","Rcaron":"Ř","rcaron":"ř","Rcedil":"Ŗ","rcedil":"ŗ","rceil":"⌉","rcub":"}","Rcy":"Р","rcy":"р","rdca":"⤷","rdldhar":"⥩","rdquo":"”","rdquor":"”","rdsh":"↳","real":"ℜ","realine":"ℛ","realpart":"ℜ","reals":"ℝ","Re":"ℜ","rect":"▭","reg":"®","REG":"®","ReverseElement":"∋","ReverseEquilibrium":"⇋","ReverseUpEquilibrium":"⥯","rfisht":"⥽","rfloor":"⌋","rfr":"𝔯","Rfr":"ℜ","rHar":"⥤","rhard":"⇁","rharu":"⇀","rharul":"⥬","Rho":"Ρ","rho":"ρ","rhov":"ϱ","RightAngleBracket":"⟩","RightArrowBar":"⇥","rightarrow":"→","RightArrow":"→","Rightarrow":"⇒","RightArrowLeftArrow":"⇄","rightarrowtail":"↣","RightCeiling":"⌉","RightDoubleBracket":"⟧","RightDownTeeVector":"⥝","RightDownVectorBar":"⥕","RightDownVector":"⇂","RightFloor":"⌋","rightharpoondown":"⇁","rightharpoonup":"⇀","rightleftarrows":"⇄","rightleftharpoons":"⇌","rightrightarrows":"⇉","rightsquigarrow":"↝","RightTeeArrow":"↦","RightTee":"⊢","RightTeeVector":"⥛","rightthreetimes":"⋌","RightTriangleBar":"⧐","RightTriangle":"⊳","RightTriangleEqual":"⊵","RightUpDownVector":"⥏","RightUpTeeVector":"⥜","RightUpVectorBar":"⥔","RightUpVector":"↾","RightVectorBar":"⥓","RightVector":"⇀","ring":"˚","risingdotseq":"≓","rlarr":"⇄","rlhar":"⇌","rlm":"‏","rmoustache":"⎱","rmoust":"⎱","rnmid":"⫮","roang":"⟭","roarr":"⇾","robrk":"⟧","ropar":"⦆","ropf":"𝕣","Ropf":"ℝ","roplus":"⨮","rotimes":"⨵","RoundImplies":"⥰","rpar":")","rpargt":"⦔","rppolint":"⨒","rrarr":"⇉","Rrightarrow":"⇛","rsaquo":"›","rscr":"𝓇","Rscr":"ℛ","rsh":"↱","Rsh":"↱","rsqb":"]","rsquo":"’","rsquor":"’","rthree":"⋌","rtimes":"⋊","rtri":"▹","rtrie":"⊵","rtrif":"▸","rtriltri":"⧎","RuleDelayed":"⧴","ruluhar":"⥨","rx":"℞","Sacute":"Ś","sacute":"ś","sbquo":"‚","scap":"⪸","Scaron":"Š","scaron":"š","Sc":"⪼","sc":"≻","sccue":"≽","sce":"⪰","scE":"⪴","Scedil":"Ş","scedil":"ş","Scirc":"Ŝ","scirc":"ŝ","scnap":"⪺","scnE":"⪶","scnsim":"⋩","scpolint":"⨓","scsim":"≿","Scy":"С","scy":"с","sdotb":"⊡","sdot":"⋅","sdote":"⩦","searhk":"⤥","searr":"↘","seArr":"⇘","searrow":"↘","sect":"§","semi":";","seswar":"⤩","setminus":"∖","setmn":"∖","sext":"✶","Sfr":"𝔖","sfr":"𝔰","sfrown":"⌢","sharp":"♯","SHCHcy":"Щ","shchcy":"щ","SHcy":"Ш","shcy":"ш","ShortDownArrow":"↓","ShortLeftArrow":"←","shortmid":"∣","shortparallel":"∥","ShortRightArrow":"→","ShortUpArrow":"↑","shy":"­","Sigma":"Σ","sigma":"σ","sigmaf":"ς","sigmav":"ς","sim":"∼","simdot":"⩪","sime":"≃","simeq":"≃","simg":"⪞","simgE":"⪠","siml":"⪝","simlE":"⪟","simne":"≆","simplus":"⨤","simrarr":"⥲","slarr":"←","SmallCircle":"∘","smallsetminus":"∖","smashp":"⨳","smeparsl":"⧤","smid":"∣","smile":"⌣","smt":"⪪","smte":"⪬","smtes":"⪬︀","SOFTcy":"Ь","softcy":"ь","solbar":"⌿","solb":"⧄","sol":"/","Sopf":"𝕊","sopf":"𝕤","spades":"♠","spadesuit":"♠","spar":"∥","sqcap":"⊓","sqcaps":"⊓︀","sqcup":"⊔","sqcups":"⊔︀","Sqrt":"√","sqsub":"⊏","sqsube":"⊑","sqsubset":"⊏","sqsubseteq":"⊑","sqsup":"⊐","sqsupe":"⊒","sqsupset":"⊐","sqsupseteq":"⊒","square":"□","Square":"□","SquareIntersection":"⊓","SquareSubset":"⊏","SquareSubsetEqual":"⊑","SquareSuperset":"⊐","SquareSupersetEqual":"⊒","SquareUnion":"⊔","squarf":"▪","squ":"□","squf":"▪","srarr":"→","Sscr":"𝒮","sscr":"𝓈","ssetmn":"∖","ssmile":"⌣","sstarf":"⋆","Star":"⋆","star":"☆","starf":"★","straightepsilon":"ϵ","straightphi":"ϕ","strns":"¯","sub":"⊂","Sub":"⋐","subdot":"⪽","subE":"⫅","sube":"⊆","subedot":"⫃","submult":"⫁","subnE":"⫋","subne":"⊊","subplus":"⪿","subrarr":"⥹","subset":"⊂","Subset":"⋐","subseteq":"⊆","subseteqq":"⫅","SubsetEqual":"⊆","subsetneq":"⊊","subsetneqq":"⫋","subsim":"⫇","subsub":"⫕","subsup":"⫓","succapprox":"⪸","succ":"≻","succcurlyeq":"≽","Succeeds":"≻","SucceedsEqual":"⪰","SucceedsSlantEqual":"≽","SucceedsTilde":"≿","succeq":"⪰","succnapprox":"⪺","succneqq":"⪶","succnsim":"⋩","succsim":"≿","SuchThat":"∋","sum":"∑","Sum":"∑","sung":"♪","sup1":"¹","sup2":"²","sup3":"³","sup":"⊃","Sup":"⋑","supdot":"⪾","supdsub":"⫘","supE":"⫆","supe":"⊇","supedot":"⫄","Superset":"⊃","SupersetEqual":"⊇","suphsol":"⟉","suphsub":"⫗","suplarr":"⥻","supmult":"⫂","supnE":"⫌","supne":"⊋","supplus":"⫀","supset":"⊃","Supset":"⋑","supseteq":"⊇","supseteqq":"⫆","supsetneq":"⊋","supsetneqq":"⫌","supsim":"⫈","supsub":"⫔","supsup":"⫖","swarhk":"⤦","swarr":"↙","swArr":"⇙","swarrow":"↙","swnwar":"⤪","szlig":"ß","Tab":"\\t","target":"⌖","Tau":"Τ","tau":"τ","tbrk":"⎴","Tcaron":"Ť","tcaron":"ť","Tcedil":"Ţ","tcedil":"ţ","Tcy":"Т","tcy":"т","tdot":"⃛","telrec":"⌕","Tfr":"𝔗","tfr":"𝔱","there4":"∴","therefore":"∴","Therefore":"∴","Theta":"Θ","theta":"θ","thetasym":"ϑ","thetav":"ϑ","thickapprox":"≈","thicksim":"∼","ThickSpace":"  ","ThinSpace":" ","thinsp":" ","thkap":"≈","thksim":"∼","THORN":"Þ","thorn":"þ","tilde":"˜","Tilde":"∼","TildeEqual":"≃","TildeFullEqual":"≅","TildeTilde":"≈","timesbar":"⨱","timesb":"⊠","times":"×","timesd":"⨰","tint":"∭","toea":"⤨","topbot":"⌶","topcir":"⫱","top":"⊤","Topf":"𝕋","topf":"𝕥","topfork":"⫚","tosa":"⤩","tprime":"‴","trade":"™","TRADE":"™","triangle":"▵","triangledown":"▿","triangleleft":"◃","trianglelefteq":"⊴","triangleq":"≜","triangleright":"▹","trianglerighteq":"⊵","tridot":"◬","trie":"≜","triminus":"⨺","TripleDot":"⃛","triplus":"⨹","trisb":"⧍","tritime":"⨻","trpezium":"⏢","Tscr":"𝒯","tscr":"𝓉","TScy":"Ц","tscy":"ц","TSHcy":"Ћ","tshcy":"ћ","Tstrok":"Ŧ","tstrok":"ŧ","twixt":"≬","twoheadleftarrow":"↞","twoheadrightarrow":"↠","Uacute":"Ú","uacute":"ú","uarr":"↑","Uarr":"↟","uArr":"⇑","Uarrocir":"⥉","Ubrcy":"Ў","ubrcy":"ў","Ubreve":"Ŭ","ubreve":"ŭ","Ucirc":"Û","ucirc":"û","Ucy":"У","ucy":"у","udarr":"⇅","Udblac":"Ű","udblac":"ű","udhar":"⥮","ufisht":"⥾","Ufr":"𝔘","ufr":"𝔲","Ugrave":"Ù","ugrave":"ù","uHar":"⥣","uharl":"↿","uharr":"↾","uhblk":"▀","ulcorn":"⌜","ulcorner":"⌜","ulcrop":"⌏","ultri":"◸","Umacr":"Ū","umacr":"ū","uml":"¨","UnderBar":"_","UnderBrace":"⏟","UnderBracket":"⎵","UnderParenthesis":"⏝","Union":"⋃","UnionPlus":"⊎","Uogon":"Ų","uogon":"ų","Uopf":"𝕌","uopf":"𝕦","UpArrowBar":"⤒","uparrow":"↑","UpArrow":"↑","Uparrow":"⇑","UpArrowDownArrow":"⇅","updownarrow":"↕","UpDownArrow":"↕","Updownarrow":"⇕","UpEquilibrium":"⥮","upharpoonleft":"↿","upharpoonright":"↾","uplus":"⊎","UpperLeftArrow":"↖","UpperRightArrow":"↗","upsi":"υ","Upsi":"ϒ","upsih":"ϒ","Upsilon":"Υ","upsilon":"υ","UpTeeArrow":"↥","UpTee":"⊥","upuparrows":"⇈","urcorn":"⌝","urcorner":"⌝","urcrop":"⌎","Uring":"Ů","uring":"ů","urtri":"◹","Uscr":"𝒰","uscr":"𝓊","utdot":"⋰","Utilde":"Ũ","utilde":"ũ","utri":"▵","utrif":"▴","uuarr":"⇈","Uuml":"Ü","uuml":"ü","uwangle":"⦧","vangrt":"⦜","varepsilon":"ϵ","varkappa":"ϰ","varnothing":"∅","varphi":"ϕ","varpi":"ϖ","varpropto":"∝","varr":"↕","vArr":"⇕","varrho":"ϱ","varsigma":"ς","varsubsetneq":"⊊︀","varsubsetneqq":"⫋︀","varsupsetneq":"⊋︀","varsupsetneqq":"⫌︀","vartheta":"ϑ","vartriangleleft":"⊲","vartriangleright":"⊳","vBar":"⫨","Vbar":"⫫","vBarv":"⫩","Vcy":"В","vcy":"в","vdash":"⊢","vDash":"⊨","Vdash":"⊩","VDash":"⊫","Vdashl":"⫦","veebar":"⊻","vee":"∨","Vee":"⋁","veeeq":"≚","vellip":"⋮","verbar":"|","Verbar":"‖","vert":"|","Vert":"‖","VerticalBar":"∣","VerticalLine":"|","VerticalSeparator":"❘","VerticalTilde":"≀","VeryThinSpace":" ","Vfr":"𝔙","vfr":"𝔳","vltri":"⊲","vnsub":"⊂⃒","vnsup":"⊃⃒","Vopf":"𝕍","vopf":"𝕧","vprop":"∝","vrtri":"⊳","Vscr":"𝒱","vscr":"𝓋","vsubnE":"⫋︀","vsubne":"⊊︀","vsupnE":"⫌︀","vsupne":"⊋︀","Vvdash":"⊪","vzigzag":"⦚","Wcirc":"Ŵ","wcirc":"ŵ","wedbar":"⩟","wedge":"∧","Wedge":"⋀","wedgeq":"≙","weierp":"℘","Wfr":"𝔚","wfr":"𝔴","Wopf":"𝕎","wopf":"𝕨","wp":"℘","wr":"≀","wreath":"≀","Wscr":"𝒲","wscr":"𝓌","xcap":"⋂","xcirc":"◯","xcup":"⋃","xdtri":"▽","Xfr":"𝔛","xfr":"𝔵","xharr":"⟷","xhArr":"⟺","Xi":"Ξ","xi":"ξ","xlarr":"⟵","xlArr":"⟸","xmap":"⟼","xnis":"⋻","xodot":"⨀","Xopf":"𝕏","xopf":"𝕩","xoplus":"⨁","xotime":"⨂","xrarr":"⟶","xrArr":"⟹","Xscr":"𝒳","xscr":"𝓍","xsqcup":"⨆","xuplus":"⨄","xutri":"△","xvee":"⋁","xwedge":"⋀","Yacute":"Ý","yacute":"ý","YAcy":"Я","yacy":"я","Ycirc":"Ŷ","ycirc":"ŷ","Ycy":"Ы","ycy":"ы","yen":"¥","Yfr":"𝔜","yfr":"𝔶","YIcy":"Ї","yicy":"ї","Yopf":"𝕐","yopf":"𝕪","Yscr":"𝒴","yscr":"𝓎","YUcy":"Ю","yucy":"ю","yuml":"ÿ","Yuml":"Ÿ","Zacute":"Ź","zacute":"ź","Zcaron":"Ž","zcaron":"ž","Zcy":"З","zcy":"з","Zdot":"Ż","zdot":"ż","zeetrf":"ℨ","ZeroWidthSpace":"​","Zeta":"Ζ","zeta":"ζ","zfr":"𝔷","Zfr":"ℨ","ZHcy":"Ж","zhcy":"ж","zigrarr":"⇝","zopf":"𝕫","Zopf":"ℤ","Zscr":"𝒵","zscr":"𝓏","zwj":"‍","zwnj":"‌"}');
        },
        "./node_modules/entities/lib/maps/legacy.json": module => {
            "use strict";
            module.exports = JSON.parse('{"Aacute":"Á","aacute":"á","Acirc":"Â","acirc":"â","acute":"´","AElig":"Æ","aelig":"æ","Agrave":"À","agrave":"à","amp":"&","AMP":"&","Aring":"Å","aring":"å","Atilde":"Ã","atilde":"ã","Auml":"Ä","auml":"ä","brvbar":"¦","Ccedil":"Ç","ccedil":"ç","cedil":"¸","cent":"¢","copy":"©","COPY":"©","curren":"¤","deg":"°","divide":"÷","Eacute":"É","eacute":"é","Ecirc":"Ê","ecirc":"ê","Egrave":"È","egrave":"è","ETH":"Ð","eth":"ð","Euml":"Ë","euml":"ë","frac12":"½","frac14":"¼","frac34":"¾","gt":">","GT":">","Iacute":"Í","iacute":"í","Icirc":"Î","icirc":"î","iexcl":"¡","Igrave":"Ì","igrave":"ì","iquest":"¿","Iuml":"Ï","iuml":"ï","laquo":"«","lt":"<","LT":"<","macr":"¯","micro":"µ","middot":"·","nbsp":" ","not":"¬","Ntilde":"Ñ","ntilde":"ñ","Oacute":"Ó","oacute":"ó","Ocirc":"Ô","ocirc":"ô","Ograve":"Ò","ograve":"ò","ordf":"ª","ordm":"º","Oslash":"Ø","oslash":"ø","Otilde":"Õ","otilde":"õ","Ouml":"Ö","ouml":"ö","para":"¶","plusmn":"±","pound":"£","quot":"\\"","QUOT":"\\"","raquo":"»","reg":"®","REG":"®","sect":"§","shy":"­","sup1":"¹","sup2":"²","sup3":"³","szlig":"ß","THORN":"Þ","thorn":"þ","times":"×","Uacute":"Ú","uacute":"ú","Ucirc":"Û","ucirc":"û","Ugrave":"Ù","ugrave":"ù","uml":"¨","Uuml":"Ü","uuml":"ü","Yacute":"Ý","yacute":"ý","yen":"¥","yuml":"ÿ"}');
        },
        "./node_modules/entities/lib/maps/xml.json": module => {
            "use strict";
            module.exports = JSON.parse('{"amp":"&","apos":"\'","gt":">","lt":"<","quot":"\\""}');
        }
    };
    var __webpack_module_cache__ = {};
    function __webpack_require__(moduleId) {
        var cachedModule = __webpack_module_cache__[moduleId];
        if (cachedModule !== undefined) {
            return cachedModule.exports;
        }
        var module = __webpack_module_cache__[moduleId] = {
            id: moduleId,
            loaded: false,
            exports: {}
        };
        __webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
        module.loaded = true;
        return module.exports;
    }
    (() => {
        __webpack_require__.d = (exports, definition) => {
            for (var key in definition) {
                if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
                    Object.defineProperty(exports, key, {
                        enumerable: true,
                        get: definition[key]
                    });
                }
            }
        };
    })();
    (() => {
        __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    })();
    (() => {
        __webpack_require__.r = exports => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(exports, Symbol.toStringTag, {
                    value: "Module"
                });
            }
            Object.defineProperty(exports, "__esModule", {
                value: true
            });
        };
    })();
    (() => {
        __webpack_require__.nmd = module => {
            module.paths = [];
            if (!module.children) module.children = [];
            return module;
        };
    })();
    var __webpack_exports__ = {};
    (() => {
        try {
            importScripts("vendor/webextension-polyfill/dist/browser-polyfill.js", "vendor/dexie/dist/dexie.js");
        } catch (e) {
            console.error("importScripts error", e);
        }
        const browser = __webpack_require__("webextension-polyfill");
        const {ensureAlarmIsSet} = __webpack_require__("./src/extension-lib/Functions/alarms.js");
        const {initBackgroundServices} = __webpack_require__("./src/extension-lib/BackgroundServices/index.js");
        const init = async () => {
            const {config, syncer} = await initBackgroundServices();
            console.debug("Started service worker.", config);
            browser.action.onClicked.addListener((() => {
                browser.tabs.create({
                    url: config.appUrl + "sync?src=ext-click-v3"
                });
            }));
            const ensureSyncAlarmIsSet = async reason => ensureAlarmIsSet("sync-interval", 15, reason);
            await ensureSyncAlarmIsSet("load");
            browser.runtime.onInstalled.addListener((async ({reason}) => {
                await browser.alarms.clearAll();
                await ensureSyncAlarmIsSet(reason);
            }));
            browser.alarms.onAlarm.addListener((alarm => {
                if (alarm.name === "sync-interval") {
                    syncer.sync("alarm");
                }
            }));
            console.debug("Beginning startup sync in 10 seconds...");
            setTimeout((() => {
                syncer.sync("startup").catch((err => {
                    console.error("Startup sync error", err);
                }));
            }), 1e4);
        };
        init().catch((err => {
            console.error("Service worker init error", err);
        }));
    })();
})();