var port = null;
var result = "0";
var browser = browser || chrome;

function onNativeMessage(message) {
    console.log("onNativeMessage");
    //console.log("message: " + JSON.stringify(message));
    if (JSON.stringify(message) == '{"text":"application/x-gamania.beanfun.webstart.mozilla.1.0.0.2"}') {
        result = "1";
    }

}

function onDisconnected() {
    console.log("onDisconnected");
    if (browser.runtime.lastError.message == "Specified native messaging host not found.") {
        result = "2";
    }
    port = null;
}



browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        port = browser.runtime.connectNative("beanfun");
        if (port != null) {
            port.onMessage.addListener(onNativeMessage);
            port.onDisconnect.addListener(onDisconnected);
            //console.log("result: " + result);
            setTimeout(function () { }, 500);
            sendResponse({ farewell: result });
        }
        else {
            alert('port is null');
        }

    });

// Check whether new version is installed
browser.runtime.onInstalled.addListener(function (details) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };
    if (details.reason == "install") {
        console.log("This is a first install!");
        //alert('This is a first install!');
        browser.tabs.reload();
    } else if (details.reason == "update") {
        var thisVersion = browser.runtime.getManifest().version;
        console.log("thisVersion: " + thisVersion);
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    }
});
