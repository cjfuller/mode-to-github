// TODO(tom) "Log out" button?

var saveToGitHubButton = null;
var saveToGitHubOptions = null;

var sendState = null;

$(document).ready(function() {
    createButton();

    // Poll twice a second for whether the query view is visible
    setInterval(function() {
        var buttonBar = $("#query-button-bar");
        if (buttonBar.size() > 0) {
            if (buttonBar.find("#saveToGitHubButton").size() === 0) {
                saveToGitHubButton.insertAfter(buttonBar.find("#view-save"));
            }
        }
    }, 500);
});

function createButton() {
    saveToGitHubButton = $('<div id="saveToGitHubButton" class="goog-inline-block jfk-button jfk-button-standard" role="button" style="-webkit-user-select: none;" tabindex="0">Save Query to GitHub</div>');
    saveToGitHubButton.click(function() {
        if (sendState !== null) {
            // We're already saving something.
            return;
        }

        chrome.runtime.sendMessage({
            type: "checkGitHubLogin"
        }, function(info) {
            if (info.loggedIn) {
                saveToGitHubOptions.show();
                $("#github-repo", saveToGitHubOptions).val(info.defaultRepo);
            } else {
                $(".error", loginToGitHubOptions).html("");
                loginToGitHubOptions.show();
            }
        });

    });

    loginToGitHubOptions = $(
        '<div class="goog-modalpopup modal-dialog wizard-dialog" ' +
            'tabindex="0" style="width:670px; height: 260px; left: 50%; ' +
            'margin-left: -335px; display: none">' +
          '<div class="modal-dialog-title">' + 
            '<span id="wizard-title" class="modal-dialog-title-text">' +
              'Log in to GitHub</span>' + 
            '<span class="modal-dialog-title-close"></span>' +
          '</div>' +
          '<div style="position: absolute; right: 42px; left: 42px; ' +
              'height: 454px">' +
            '<article class="wizard-step">' +
              'In order to save to GitHub, please authenticate with your ' +
              'GitHub account.' +
              '<div class="error" style="color: red"></div>' +
            '</article>' +
          '</div>' +
          '<div style="position: absolute; right: 42px; bottom: 30px; ' +
              'left: 42px; margin-top: 10px;">' +
            '<div role="button" class="goog-inline-block jfk-button ' +
              'jfk-button-action wizard-submit-button">Log In</div>' +
            '<div role="button" class="goog-inline-block jfk-button ' +
              'jfk-button-standard wizard-cancel-button" ' +
              'style="float: right; margin-right: 0px">Cancel</div>' +
          '</div>' +
        '</div>');
    $(".modal-dialog-title-close", loginToGitHubOptions).click(function() {
        loginToGitHubOptions.hide();
    });
    $(".wizard-cancel-button", loginToGitHubOptions).click(function() {
        loginToGitHubOptions.hide();
    });
    $(".wizard-submit-button", loginToGitHubOptions).click(function() {
        chrome.runtime.sendMessage({
            type: "loginToGitHub"
        });
    });
    $("body").append(loginToGitHubOptions);

    saveToGitHubOptions = $(
        '<div class="goog-modalpopup modal-dialog wizard-dialog" ' +
            'tabindex="0" style="width:670px; height: 260px; left: 50%; ' +
            'margin-left: -335px; display: none">' +
          '<div class="modal-dialog-title">' + 
            '<span id="wizard-title" class="modal-dialog-title-text">' +
              'Save to GitHub</span>' + 
            '<span class="modal-dialog-title-close"></span>' +
          '</div>' +
          '<div style="position: absolute; right: 42px; left: 42px; ' +
              'height: 454px">' +
            '<article class="wizard-step">' +
              '<table><tbody>' +
                '<tr><th>Repository</th><td><input id="github-repo" ' +
                  'type="text" class="jfk-textinput"' +
                  'placeholder="owner/repo"></td></tr>' +
                '<tr><th>Path</th><td><input id="github-path" ' +
                  'type="text" class="jfk-textinput"' +
                  'placeholder="path/to/file"></td></tr>' +
                '<tr><th>Filename</th><td><input id="github-name" ' +
                  'type="text" class="jfk-textinput"' +
                  'placeholder="filename (w/o extension)"></td></tr>' +
                '<tr><th>Title</th><td><input id="github-title" ' +
                  'type="text" class="jfk-textinput"></td></tr>' +
                '<tr><th>Description</th><td><input id="github-description" ' +
                  'type="text" class="jfk-textinput"></td></tr>' +
              '</tbody></table>' +
            '</article>' +
          '</div>' +
          '<div style="position: absolute; right: 42px; bottom: 30px; ' +
              'left: 42px; margin-top: 10px;">' +
            '<div role="button" class="goog-inline-block jfk-button ' +
              'jfk-button-action wizard-submit-button">Save</div>' +
            '<div role="button" class="goog-inline-block jfk-button ' +
              'jfk-button-standard wizard-cancel-button" ' +
              'style="float: right; margin-right: 0px">Cancel</div>' +
          '</div>' +
        '</div>');
    $(".modal-dialog-title-close", saveToGitHubOptions).click(function() {
        saveToGitHubOptions.hide();
    });
    $(".wizard-cancel-button", saveToGitHubOptions).click(function() {
        saveToGitHubOptions.hide();
    });
    $(".wizard-submit-button", saveToGitHubOptions).click(function() {
        var repo = $("#github-repo").val();
        var path = $("#github-path").val();
        var name = $("#github-name").val();
        var title = $("#github-title").val();
        var description = $("#github-description").val();

        if (repo !== "" && repo.split("/").length === 2 &&
            path !== "" && name !== "" && title !== "" && description !== "") {

            $(".wizard-submit-button", saveToGitHubOptions).addClass(
                "jfk-button-disabled");

            saveToGitHub(repo, path, name, title, description);
        }
    });
    $("body").append(saveToGitHubOptions);
}

function saveToGitHub(repo, path, name, title, description) {
    // TODO(tom): Clear old title & description if they exist?
    // TODO(tom): Linting of path & name
    var text = [
        '// Title: ', title, "\n",
        '// Description: ', description, "\n\n"
    ];

    // Extract the actual query out of the annoying CodeMirror markup
    var nodes = $(".CodeMirror-code pre");
    $.each(nodes, function(idx, el) {
        $.each($(el).contents(), function(idx2, child) {
            if (child.nodeType === 1) {
                text.push(child.innerText);
            } else if (child.nodeType === 3) {
                text.push(child.textContent);
            }
        });
        text.push("\n");
    });

    var finalText = text.join("");

    saveToGitHubButton.addClass("jfk-button-disabled");
    sendState = "sending";

    chrome.runtime.sendMessage({
        type: "saveToGitHub",
        content: finalText,
        repo: repo,
        path: path,
        name: name + '.sql',
        title: title,
        description: description
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type && request.type === "loggedInToGitHub") {
            loginToGitHubOptions.hide();
            saveToGitHubOptions.show();
        }

        if (request.type && request.type === "loginToGitHubError") {
            $(".error", loginToGitHubOptions).html(
                "Error logging in: " + request.message);
        }

        if (request.type && request.type === "savedToGitHub") {
            saveToGitHubButton.removeClass("jfk-button-disabled");
            saveToGitHubOptions.hide();
            sendState = null;
        }

        if (request.type && request.type === "saveToGitHubError") {
            $(".error", loginToGitHubOptions).html(
                "Error saving query: " + request.message);
            saveToGitHubOptions.hide();
            loginToGitHubOptions.show();
        }
    });
