/*
 * Copyright 2005,2006 WSO2, Inc. http://wso2.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var xhReq;
var serviceGroupId;
var userNameString;
var numDaysToKeepCookie = 2;
var locationString = self.location.href;

/* This will be the defalt value, real https port will be
   filtered out from self.location.href;
 */
var httpsPort = 9443;


/*two variables to hold the width and the height of the
message box*/
var messageBoxWidth = 300;
var messageBoxHeight = 90;
var warningMessageImage = '../images/oops.gif';
var informationMessageImage = '../images/information.gif';
var warningnMessagebackColor = '#FFC';
var informationMessagebackColor = '#BBF';
var runPoleHash = false;

/*constants for Message types*/
var INFORMATION_MESSAGE = 1;
var WARNING_MESSAGE = 2;

/* Endpoint reference holder */
var URL;
var serverURL;

var lastHash;

var userName;

var isServerRestarting = false;

var tabcount = 0;

var tabCharactors = " ";

var requestFromServerPending = false;

/*
 mainMenuObject will be used to hold the <a/> objects, that's been used clicked in main
 menu items.
*/
var mainMenuObjectId = null;
var mainMenuObjectIndex = -1;

var sessionCookieValue;


var XSLTHelper;// handles all the xslt related operations


/*
@param isAbsPath : Used to indicate whether the usr provided is a absolute path. This is needed to reuse this
					method from outside the admin service.
*/
/*public*/
function processXML(xml, xslFileName, objDiv, isAbsPath) {
    var xsltHelperObj = new XSLTHelper();
    xsltHelperObj.transform(objDiv,xml,xslFileName,isAbsPath);
}

/*public */
function finishLogin() {
    userNameString = "<nobr>Signed in as <strong>" + userName +
                     "</strong>&nbsp;&nbsp;|&nbsp;&nbsp;<a id='logOutA' href='#' onclick='javascript:logout(); return false;'>Sign Out</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href='docs/administratorguide.html' target='_blank'>Help</a></nobr>";
    document.getElementById("meta").innerHTML = userNameString;
    document.getElementById("logincontainer").style.display = "none";
    //document.getElementById("userGreeting").style.display = "inline";
    //		document.getElementById("container").style.display = "inline";
    document.getElementById("navigation").style.display = "inline";
    document.getElementById("content").style.display = "inline";
    updateRegisterLink();
}

/*private*/
function updateRegisterLink() {


    var bodyXML = ' <ns1:isServerRegistered xmlns:ns1="http://org.apache.axis2/xsd"/>';
    var callURL = serverURL + "/" + GLOBAL_SERVICE_STRING ;
    send("isServerRegistered", bodyXML, "", callURL, "", false, updateRegisterLinkCallback);
}

/*private*/
function updateRegisterLinkCallback() {
    if (!onError()) {
        return;
    }
    if (xhReq.responseXML.getElementsByTagName("return")[0].firstChild.nodeValue != "true") {
        document.getElementById("meta").innerHTML +=
        "&nbsp;&nbsp;|&nbsp;&nbsp;<a href='#' onclick='javascript:registerProduct(); return false;'>Register</a>";
    }

    showHomeMenu();

    runPoleHash = true;
    initialize();

}

/*private*/
function loginFail() {
    alertWarning("Login failed. Please recheck the user name and password and try again.");
}

/*public*/
function registerProduct() {
    var bodyXML = ' <ns1:getServerData xmlns:ns1="http://org.apache.axis2/xsd"/>';

    var callURL = serverURL + "/" + SERVER_ADMIN_STRING ;
    send("getServerData", bodyXML, "", callURL, "", false, registerProductCallback);
}

/*This will be the main method to Call to destination*/

/*public*/
function send(operationName, bodyXML, xslFileName, callURL, objDiv, loginMethod, callBack) {

    /* For ulimate calls towards server; it has to be make sure that either cookies or service group session
       management is active.
    */
    if (!loginMethod) {
        if (!COOKIE_SESSION_MANAGEMENT && serviceGroupId == "") {
            alertWarning("You have to login before you call any service.");
            return;
        }
    }

    if (loginMethod) {
        deleteCookieFromSession(SESSION_COOKIE_NAME);
    }

    if (requestFromServerPending) {
        stopWaitAnimation();
        requestFromServerPending = false;
        xhReq.onreadystatechange = null;
        xhReq.abort();
    }

    xhReq = createXMLHttpRequest();
    if (callBack != null) {
        xhReq.onreadystatechange = callBack;
    } else {
        xhReq.onreadystatechange = function() {
            if (!onError()) {
                return;
            }
            if (loginMethod) {

                if (COOKIE_SESSION_MANAGEMENT) {
                    /*commented methods only for debuging purposes */
                    //                    alert('login :: ' + xhReq.getAllResponseHeaders());
                    /*sessionCookieValue = getJessionidCookie(xhReq.getResponseHeader("Set-Cookie"));

                    if (sessionCookieValue) {
                        setCookieForSession(SESSION_COOKIE_NAME, sessionCookieValue, false);
                    }
                    if (!sessionCookieValue) {
                        loginFail();
                        return;
                    }*/

                    var isLogInDone = xhReq.responseXML.getElementsByTagName("return")[0].firstChild.nodeValue;
                    if (isLogInDone != "true") {
                        loginFail();
                        return;
                    }
                    userName = document.formLogin.txtUserName.value;
                    finishLogin();
                } else {
                    serviceGroupId = null;
                    try {
                        try {
                            serviceGroupId =
                            xhReq.responseXML.getElementsByTagName("ServiceGroupId")[0].firstChild.nodeValue;
                        } catch(e) {
                        }
                        if (serviceGroupId == null) {
                            try {
                                serviceGroupId =
                                xhReq.responseXML.getElementsByTagName("axis2:ServiceGroupId")[0].firstChild.nodeValue;
                            } catch(e) {
                            }
                        }
                        var isLogInDone = xhReq.responseXML.getElementsByTagName("return")[0].firstChild.nodeValue;
                    } catch(e) {
                        loginFail();
                        return;
                    }
                    if (isLogInDone != "true") {
                        loginFail();
                        return;
                    }
                    if (serviceGroupId == "" || isLogInDone != "true") {
                        loginFail();
                    } else {
                        setCookie("serviceGroupId", serviceGroupId);
                        setCookie("userName", document.formLogin.txtUserName.value);
                        userName = document.formLogin.txtUserName.value;
                        finishLogin();
                    }


                    return;
                }
            }
            //alert("Response" + (new XMLSerializer()).serializeToString(getBody(xhReq.responseXML)));
            if (xslFileName != "" && objDiv != null) {
                var data = getBody(xhReq.responseXML);
                processXML(data, xslFileName, objDiv);
                showOnlyOneMain(objDiv);
            }

        };
    }

    //startWaitAnimation();
    if (COOKIE_SESSION_MANAGEMENT && !loginMethod) {
        //        setCookieForSession(SESSION_COOKIE_NAME, sessionCookieValue, true);
    }

    try {
        xhReq.open("POST", callURL, true);
    } catch(e) {
        alertWarning("Error while opening connection. ERROR message = " + e.message);
        return false;
    }

    xhReq.setRequestHeader('Content-Type', "text/xml");
    xhReq.setRequestHeader("SOAPAction", operationName);

    /*soapPayload will be based on Addressing final spec ontop of SOAP 11*/

    var soapPayload = '<?xml version="1.0" encoding="UTF-8"?>' +
                      ' <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
                      ' <soapenv:Header xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">';
    if (!loginMethod && !COOKIE_SESSION_MANAGEMENT) {
        soapPayload +=
        '<axis2:ServiceGroupId xmlns:axis2="http://ws.apache.org/namespaces/axis2">' +
        serviceGroupId + '</axis2:ServiceGroupId>';
    }
    soapPayload += ' <wsa:To>' + callURL + '</wsa:To>' +
                   ' <wsa:Action>' + operationName + '</wsa:Action>' +
                   ' <wsa:ReplyTo>' +
                   ' <wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>' +
                   ' </wsa:ReplyTo>' +
                   ' <wsa:MessageID>uuid:BABE23A9BE85EA7AE011327368520801</wsa:MessageID>' +
                   ' </soapenv:Header>' +
                   ' <soapenv:Body> ' + bodyXML +
                   ' </soapenv:Body>' +
                   ' </soapenv:Envelope>';

    requestFromServerPending = true;
    xhReq.send(soapPayload);

}

/* This function will be used as a xml to html transformation helper in callback objecs*/
/*public*/
function callbackhelper(xsltFile, objDiv, doNotLoadDiv) {
    var data = getBody(xhReq.responseXML);
    processXML(data, xsltFile, objDiv);
    if (!doNotLoadDiv) {
        showOnlyOneMain(objDiv);
    }
}

/*public*/
function showOnlyOneMain(objDiv, isReloadDiv) {
    if (objDiv == null)
        return;

    var par = objDiv.parentNode;

    var len = par.childNodes.length;
    var count;
    for (count = 0; count < len; count++) {
        if (par.childNodes[count].nodeName == "DIV") {
            par.childNodes[count].style.display = 'none';
        }
    }
    objDiv.style.display = 'inline';
    var output = objDiv.attributes;
    var attLen = output.length;
    var c;
    var divNameStr;
    for (c = 0; c < attLen; c++) {
        if (output[c].name == 'id') {
            divNameStr = output[c].value;
        }
    }
    //alert(divNameStr);
    setDivTabsToMinus(objDiv);
    storeDiv(divNameStr, isReloadDiv)
}

/* This will set all the tabindexes in all the child divs to -1. This way no div will get focus
 * when some one is tabbing around. */
function setDivTabsToMinus(objDiv) {
    var divs = objDiv.getElementsByTagName("div");
    for (var index = 0; index < divs.length; index++) {
        divs[index].setAttribute("tabindex", "-1");
    }
}

/*public*/
function createXMLHttpRequest() {
    return Util.createXMLHttpRequest();
}

/*public*/
function createXSLTProcessor() {
    try {
        /* XSLT Processor for Firefox */
        return new XSLTProcessor();
    } catch(e) {
    }
}

/* This will filterout the body of the soap env for transformation or other purposes.
   Handles both Firefox and IE
*/
/*public*/
function getBody(xml) {
    try {
        return xml.getElementsByTagName("Body")[0].childNodes[0];
    } catch(e) {
    }
    try {
        return xml.getElementsByTagName(xml.firstChild.nextSibling.prefix +
                                        ":Body")[0].childNodes[0];
    } catch(e) {
    }
}

/*public*/
function login(userName, password) {
    var bodyXML = ' <ns1:login  xmlns:ns1="http://org.apache.axis2/xsd">\n' +
                  ' <arg0>' + userName + '</arg0>\n' +
                  ' <arg1>' + password + '</arg1>\n' +
                  ' </ns1:login>\n';
    var callURL = serverURL + "/" + GLOBAL_SERVICE_STRING + "/" + "login";

    send("login", bodyXML, "", callURL, "", true);
}

/*public*/
function logout() {
    // stopping all refressing methods
    stoppingRefreshingMethodsHook();
    historyStorage.reset();
    var bodyXML = ' <ns1:logout  xmlns:ns1="http://org.apache.axis2/xsd"/>\n';

    var callURL = serverURL + "/" + GLOBAL_SERVICE_STRING + "/" + "logout";
    send("logout", bodyXML, "", callURL, "", false, logoutCallback);


}

/*private*/
function logoutCallback() {
    if (!onError()) {
        return;
    }
    runPoleHash = false;
    logoutVisual();

}

/*private*/
function logoutVisual() {
    serviceGroupId = "";
    //    deleteCookie("serviceGroupId");
    //    deleteCookie("userName");

    deleteCookieFromSession(SESSION_COOKIE_NAME);

    document.formLogin.txtUserName.value = "";
    document.formLogin.txtPassword.value = "";
    //document.getElementById("container").style.display = "none";
    //document.getElementById("userGreeting").style.display = "none";
    document.getElementById("navigation").style.display = "none";
    document.getElementById("content").style.display = "none";
    document.getElementById("meta").innerHTML = "";
    document.getElementById("logincontainer").style.display = "inline";
}


var waitAnimationTimer;
var waitCount = 0;
/*private*/
function waitAnimationTimeout() {
    waitAnimationTimer = setTimeout(function() {
        updateWaitAnimation();
        waitAnimationTimeout();
    }, 200);

}
/*private*/
function stopWaitAnimation() {
    clearTimeout(waitAnimationTimer);
    waitCount = 4;
    //document.getElementById("waitAnimationDiv").style.display = "none";
    document.getElementById("waitAnimationDiv").style.background =
    "url(images/orange_circles.gif) transparent no-repeat left top;";
    document.getElementById("waitAnimationDiv").style.padding = "0;";
}

/*private*/
function startWaitAnimation() {
    var divToUpdate = document.getElementById("waitAnimationDiv");
    //alert("startWaitAnimation" + divToUpdate);
    divToUpdate.style.display = "inline";
    waitAnimationTimeout();
}

/*private*/
function updateWaitAnimation() {
    var divToUpdate = document.getElementById("waitAnimationDiv");
    //alert(divToUpdate.innerHTML);
    if (waitCount == 8) {
        waitCount = 1;
    } else {
        waitCount++;
    }
    divToUpdate.style.background =
    "url(images/waiting_ani_" + waitCount + ".gif) transparent no-repeat left top;";
    document.getElementById("waitAnimationDiv").style.padding = "0;";
}

/*public*/
function onError() {
    if (xhReq.readyState != 4) {
        return false;
    }
    stopWaitAnimation();
    cursorClear();
    requestFromServerPending = false;
    try {
        // We would try to capture exception that occurs in the region 400x over.
        // Current Axis2 implementation only support 500 error code, {Internal Server Error}
        // We would only considre SOAP11 SOAP faults.
        if (xhReq.status >= 400) {
            var errMessage = "Your session has expired please login";
            var httpBody = xhReq.responseXML;
            if (xhReq.responseXML != null) {

                if (httpBody.getElementsByTagName("faultstring")[0] != null) {
                    errMessage =
                    httpBody.getElementsByTagName("faultstring")[0].firstChild.nodeValue;
                }

                var errNode = getExceptionNode(httpBody);
                if (errNode != null) {
                    if (xmlSerializerToString(errNode).indexOf("Invalid Service Group Id") > 0 ||
                        xmlSerializerToString(errNode).indexOf("Access Denied. Please login first") >
                        0) {
                        errMessage = "Your session has expired please login";
                        logoutVisual();
                    }
                }

            } else {
                logoutVisual();
            }
            alertWarning(errMessage);
            return false;
        }
    } catch(e) {
        if (!isServerRestarting) {
            if (e.message.indexOf("NS_ERROR_NOT_AVAILABLE") > 0) {
                alertWarning("Could not connect to the server. Please try again in a moment.");
                stoppingRefreshingMethodsHook();
                return false;
            } else {
                alertWarning("An unknown error occured. In line number " + e.lineNumber +
                             " the error message was " + e.message);
                return false;
            }
        } else {
            alertMessage("The server is being restarted. <br/> Please login in a few seconds.");
            isServerRestarting = false;
        }
    }
    return true;
}

/*private*/
function getExceptionNode(xml) {
    try {
        if (xml.getElementsByTagName("Exception")[0] !=
            null) return xml.getElementsByTagName("Exception")[0];
    } catch(e) {
    }
    try {
        if (xml.getElementsByTagName(xml.firstChild.nextSibling.prefix + ":Exception")[0] !=
            null) return xml.getElementsByTagName(xml.firstChild.nextSibling.prefix +
                                                  ":Exception")[0];
    } catch(e) {
    }
    try {
        if (xml.getElementsByTagName("Fault")[0] !=
            null) return xml.getElementsByTagName("Fault")[0];
    } catch(e) {
    }
    try {
        if (xml.getElementsByTagName(xml.firstChild.nextSibling.prefix + ":Fault")[0] !=
            null) return xml.getElementsByTagName(xml.firstChild.nextSibling.prefix + ":Fault")[0];
    } catch(e) {
    }
    return null;
}


/*private*/
function setCookie(name, value, expires, secure) {
    document.cookie = name + "=" + escape(value) +
                      ((expires) ? "; expires=" + expires.toGMTString() : "") +
                      ((secure) ? "; secure" : "");
}

/*private*/
function getCookie(name) {
    var dc = document.cookie;
    var prefix = name + "=";
    var begin = dc.indexOf("; " + prefix);
    if (begin == -1) {
        begin = dc.indexOf(prefix);
        if (begin != 0) return null;
    } else {
        begin += 2;
    }
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
        end = dc.length;
    }
    return unescape(dc.substring(begin + prefix.length, end));
}
/*private*/
function getCookieForSession(cookieName) {
    var results = document.cookie.match(cookieName + '=(.*?)(;|$)');
    if (results)
        return (unescape(results[1]));
    else
        return null;

}

/*private*/
function setCookieForSession(cookieName, cookieValue, secure) {
    var cookieString = cookieName + "=" + escape(cookieValue);
    if (secure) {
        cookieString += "; secure";
    }
    document.cookie = cookieString;

}
/*private*/
function deleteCookieFromSession(cookieName) {
    var cookieDate = new Date ();
    // current date & time
    cookieDate.setTime(cookieDate.getTime() - 1);
    document.cookie = cookieName += "=; expires=" + cookieDate.toGMTString();
}

/*private*/
function deleteCookie(name) {
    document.cookie = name + "=" + "; EXPIRES=Thu, 01-Jan-70 00:00:01 GMT";

}

/*private*/
function getUserInput() {
    return getUserInputCustum("Please enter the parameter name", "Please enter the parameter value for ", true);
}

/*private
Will use the promt provided by the user prompting for parameters. If the useParamNameInPrompt is
true then the param value prompt will be appended the paramName to the back of the paramValuePrompt value.
*/

function getUserInputCustum(paramNamePrompt, paramValuePrompt, useParamNameInPrompt) {
    var returnArray = new Array();
    var tempValue = window.prompt(paramNamePrompt);
    if (tempValue == '' || tempValue == null) {
        return null;
    }
    returnArray[0] = tempValue;
    if (useParamNameInPrompt) {
        tempValue = window.prompt(paramValuePrompt + returnArray[0]);
    } else {
        tempValue = window.prompt(paramValuePrompt);
    }
    if (tempValue == '' || tempValue == null) {
        return null;
    }
    returnArray[1] = tempValue;
    return returnArray;
}

//function to store the div name
/*private*/
function storeDiv(divName, isReloadDiv) {
    if (lastHash != "___" + divName) {
        if (!isReloadDiv) {
            lastHash = "___" + divName;
            //alert("Storing div " + lastHash);
            if (mainMenuObjectId != null && mainMenuObjectIndex != -1) {
                dhtmlHistory.add(lastHash,
                {menuObj:mainMenuObjectId + ':' + mainMenuObjectIndex});

            } else {
                dhtmlHistory.add(lastHash, true);
            }
        }
    }
}

//convenience methods that call the alertInternal
//show a information message
/*public*/
function alertMessage(message) {
    alertInternal(message, INFORMATION_MESSAGE);
}

//show a warning message
/*public*/
function alertWarning(message) {
    var indexOfExceptionMsg = message.indexOf('; nested exception is: ');
    if (indexOfExceptionMsg != -1) {
        message = message.substring(0, indexOfExceptionMsg);
    }
    alertInternal(message, WARNING_MESSAGE);
}

// shows the a custom alert box
/*public*/
function alertInternal(message, style) {

    var messageBox = document.getElementById('alertMessageBox');
    var messageBoxTextArea = document.getElementById('alertMessageBoxMessageArea');
    //var messageBoxImage = document.getElementById('alertMessageBoxImg');alertMessageBox
    //set the left and top positions

    var theWidth;
    if (window.innerWidth)
    {
        theWidth = window.innerWidth
    }
    else if (document.documentElement && document.documentElement.clientWidth)
    {
        theWidth = document.documentElement.clientWidth
    }
    else if (document.body)
    {
        theWidth = document.body.clientWidth
    }

    var theHeight;
    if (window.innerHeight)
    {
        theHeight = window.innerHeight
    }
    else if (document.documentElement && document.documentElement.clientHeight)
    {
        theHeight = document.documentElement.clientHeight
    }
    else if (document.body)
    {
        theHeight = document.body.clientHeight
    }

    var leftPosition = theWidth / 2 - messageBoxWidth / 2 ;
    var topPosition = theHeight / 2 - messageBoxHeight / 2;
    var bkgr;
    messageBox.style.left = leftPosition + 'px';
    messageBox.style.top = topPosition + 'px';
    //set the width and height
    messageBox.style.width = messageBoxWidth + 'px';
    //    messageBox.style.height = messageBoxHeight+ 'px';

    //set the pictures depending on the style
    if (style == WARNING_MESSAGE) {
        bkgr =
        "url(" + warningMessageImage + ") " + warningnMessagebackColor + " no-repeat 15px 17px";
    } else if (style == INFORMATION_MESSAGE) {
        bkgr = "url(" + informationMessageImage + ") " + informationMessagebackColor +
               " no-repeat 15px 17px";
    }
    messageBox.style.background = bkgr;
    //set the message
    messageBoxTextArea.innerHTML = message;
    messageBox.style.display = 'inline';
    document.getElementById('alertBoxButton').focus();
    return false;
}

/*public*/
function trim(strToTrim) {
    return(strToTrim.replace(/^\s+|\s+$/g, ''));
}

/*public*/
function cursorWait() {
    document.body.style.cursor = 'wait';
}

/*public*/
function cursorClear() {
    document.body.style.cursor = 'default';
}


/*public*/
function restartServer() {
    var bodyXML = '<req:restartRequest xmlns:req="http://org.apache.axis2/xsd"/>\n';

    var callURL = serverURL + "/" + ADMIN_SERVER_URL ;
    isServerRestarting = true;
    send("restart", bodyXML, "", callURL, "", false, restartServerCallBack);
}

/*private*/
function restartServerCallBack() {
    if (!onError()) {
        return;
    }
    logoutVisual();
    stopWaitAnimation();
    alertMessage("The server is being restarted. <br/> Please login in a few seconds.");
    // stopping all refressing methods
    stoppingRefreshingMethodsHook();
}


/* History tracking code
   Underline project has to implement handleHistoryChange function.
*/
/*private*/
function initialize() {
    // initialize our DHTML history
    dhtmlHistory.initialize();
    historyStorage.reset();
    // subscribe to DHTML history change
    // events
    dhtmlHistory.addListener(
            handleHistoryChange);
}


/*
Environment independednt String Transformer
*/

/*public*/
function xmlSerializerToString(payload) {
    var browser = Util.getBrowser();

    switch (browser) {
        case "gecko":
            var serializer = new XMLSerializer();
            return serializer.serializeToString(payload);
            break;
        case "ie":
            return payload.xml;
            break;
        case "ie7":
            return payload.xml;
            break;
        case "opera":
            var xmlSerializer = document.implementation.createLSSerializer();
            return xmlSerializer.writeToString(payload);
            break;
        case "safari":
        // use the safari method
            throw new Error("Not implemented");
        case "undefined":
            throw new Error("XMLHttp object could not be created");
    }
}

// THIS METOD WILL INJECT INTO ALL XSL, THAT USES axis2/services AND
// CHANGE THE SERVICE URL TO foo/bar

/*public*/
function openWindow(value) {
    // This will return a String of foo/bar/ OR foo/bar/Foo
    window.open(serviceURL + '/' + value);
}

/*public*/
function openExtraWindow(firstValue, lastValue) {
    window.open(firstValue + serviceURL + "/" + lastValue);
}

/* This is useful to check big XML fragments. For this alerts are not very useful*/
/*public*/
function showStuffInNewWindow(stuff) {
    var temp = window.open("_blank.html");
    temp.document.write("<textarea cols=120 rows=50> " + stuff + "</textarea>");
}


/*
	All functions of this nature will return the first value it finds. So do now use when you know that
	there can be more than one item that match (elementName + attName + attValue).
*/
/*public*/
function getElementWithAttribute(elementName, attName, attValue, parentObj) {
    var objList = parentObj.getElementsByTagName(elementName);
    if (objList.length > 0) {
        for (var d = 0; d < objList.length; d++) {
            if (attValue == getAttbute(attName, objList[d])) {
                return objList[d];
            }
        }
    } else {
        return null;
    }
}
/*
 * Will return the attribute values of the named attribute from the
 * object that is passed in.
 */
/*public*/
function getAttbute(attrName, objRef) {
    var attObj = getAttbuteObject(attrName, objRef);
    if (attObj != null) {
        return attObj.value;
    } else {
        return null;
    }
}

/*
 * Will return the attribute object of the named attribute from the
 * object[objRef] that is passed in.
 */
/*publc*/
function getAttbuteObject(attrName, objRef) {
    var output = objRef.attributes;

    if (output == null) return null;
    var attLen = output.length;
    var c;
    var divNameStr;
    for (c = 0; c < attLen; c++) {
        if (output[c].name == attrName) {
            return output[c];
        }
    }
}

/*
 * Will return a string with all the attributes in a name="value" format
 * seperated with a space.
 */
/*public*/
function getAttributeText(node) {
    var text_attributes = "";
    var output = node.attributes;
    if (output == null) return "";
    var attLen = output.length;
    var c;
    var divNameStr;
    for (c = 0; c < attLen; c++) {
        // Skiping the special attribute set by us.
        if (output[c].name != "truedomnodename") {
            text_attributes += " " + output[c].name + '="' + output[c].value + '"';
        }
    }
    return text_attributes;
}

/*
 * Will print out the DOM node that is passed into the method.
 * It will also add tabs.
 * If convertToLower is true all tagnames will be converted to lower case.
 */
/*public*/
function prettyPrintDOMNode(domNode, nonFirst, tabToUse, convertToLower) {
    if (!nonFirst) {
        tabcount = 0;
        if (tabToUse == null) {
            tabCharactors = "\t";
        } else {
            tabCharactors = tabToUse;
        }
    }
    if (domNode == null) {
        return "";
    }
    var dom_text = "";
    var dom_node_value = "";
    var len = domNode.childNodes.length;
    if (len > 0) {
        if (domNode.nodeName != "#document") {
            if (nonFirst) {
                dom_text += "\n";
            }
            dom_text += getCurTabs();
            dom_text +=
            "<" + getTrueDOMNodeNameFromNode(domNode, convertToLower) + getAttributeText(domNode) +
            ">";
            tabcount++;
        }
        for (var i = 0; i < len; i++) {
            if (i == 0) {
                dom_text += prettyPrintDOMNode(domNode.childNodes[i], true, "", convertToLower);
            } else {
                dom_text += prettyPrintDOMNode(domNode.childNodes[i], true, "", convertToLower);
            }
        }
        if (domNode.nodeName != "#document") {
            tabcount--;
            if (!(domNode.childNodes.length == 1 && domNode.childNodes[0].nodeName == "#text")) {
                dom_text += "\n" + getCurTabs();
            }
            dom_text += "</" + getTrueDOMNodeNameFromNode(domNode, convertToLower) + ">";
        }

    } else {
        if (domNode.nodeName == "#text") {
            dom_text += domNode.nodeValue;
        } else {
            dom_text += "\n" +
                        getCurTabs() + "<" + getTrueDOMNodeNameFromNode(domNode, convertToLower) +
                        getAttributeText(domNode) +
                        "/>";
        }
    }
    return dom_text;
}
// This will serialize the first node only.
/*public*/
function nodeStartToText(domNode) {
    if (domNode == null) {
        return "";
    }
    var dom_text = "";
    var len = domNode.childNodes.length;
    if (len > 0) {
        if (domNode.nodeName != "#document") {
            dom_text +=
            "<" + getTrueDOMNodeNameFromNode(domNode) + getAttributeText(domNode) + ">\n";
        }
    } else {
        if (domNode.nodeName == "#text") {
            dom_text += domNode.nodeValue;
        } else {
            dom_text +=
            "<" + getTrueDOMNodeNameFromNode(domNode) + getAttributeText(domNode) + "/>\n";
        }
    }
    return dom_text;
}

/*
 * When creating a new node using document.createElement the new node that
 * is created will have a all capital value when you get the nodeName
 * so to get the correct serialization we set a new attribute named "trueDOMNodeName" on the
 * new elements that are created. This method will check whether there is an attribute set
 * and will return the nodeName accordingly.
 * If convertToLower is true then the node name will be converted into lower case and returned.
 */
/*public*/
function getTrueDOMNodeNameFromNode(objNode, convertToLower) {
    var trueNodeName = getAttbute("truedomnodename", objNode);
    if (trueNodeName == null) {
        trueNodeName = objNode.nodeName;
    }
    if (convertToLower) {
        return trueNodeName.toLowerCase();
    } else {
        return trueNodeName;
    }
}

/*
 * Will return the number of tabs to print for the current node being passed.
 */
/*public*/
function getCurTabs() {
    var tabs_text = "";
    for (var a = 0; a < tabcount; a++) {
        tabs_text += tabCharactors;
    }
    return tabs_text;
}

/*
 * Use to get a node from within an object hierarchy where there are objects
 * with the same name at different levels.
 */
/*public*/
function getNodeFromPath(pathString, domParent) {
    var items = pathString.split("/");
    var restOfThem = "";
    var lastStep = (items.length == 1);

    if (!lastStep) {
        for (var r = 1; r < items.length; r++) {
            restOfThem += items[r] + "/";
        }
        restOfThem = restOfThem.substring(0, restOfThem.length - 1);
    }
    var temp = domParent.getElementsByTagName(items[0]);
    if (temp == null) {
        return null;
    }
    if (temp.length < 1) {
        return null;
    }
    for (var u = 0; u < temp.length; u++) {
        var retEle;
        if (!lastStep) {
            retEle = getNodeFromPath(restOfThem, temp[u]);
        } else {
            retEle = temp[u];
        }
        if (retEle != null) {
            return retEle;
        }
    }
    return null;
}

/*public*/
function showResponseMessage(xhReq) {
    var data = getBody(xhReq.responseXML);
    var returnStore = data.getElementsByTagName("return")[0];
    alertMessage(returnStore.firstChild.nodeValue);
}

function isIE() {
    return Util.isIESupported();
}

/*
Utility class
*/
Util = {
    _msxml : [
            'MSXML2.XMLHTTP.3.0',
            'MSXML2.XMLHTTP',
            'Microsoft.XMLHTTP'
            ],

    getBrowser : function() {
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('opera') != -1) { // Opera (check first in case of spoof)
            return 'opera';
        } else if (ua.indexOf('msie 7') != -1) { // IE7
            return 'ie7';
        } else if (ua.indexOf('msie') != -1) { // IE
            return 'ie';
        } else if (ua.indexOf('safari') !=
                   -1) { // Safari (check before Gecko because it includes "like Gecko")
            return 'safari';
        } else if (ua.indexOf('gecko') != -1) { // Gecko
            return 'gecko';
        } else {
            return false;
        }
    },
    createXMLHttpRequest : function() {
        var xhrObject;

        try {
            xhrObject = new XMLHttpRequest();
        } catch(e) {
            for (var i = 0; i < this._msxml.length; ++i) {
                try
                {
                    // Instantiates XMLHttpRequest for IE and assign to http.
                    xhrObject = new ActiveXObject(this._msxml[i]);
                    break;
                }
                catch(e) {
                    // do nothing
                }
            }
        } finally {
            return xhrObject;
        }
    },

    isIESupported : function() {
        var browser = this.getBrowser();
        if (this.isIEXMLSupported() && (browser == "ie" || browser == "ie7")) {
            return true;
        }

        return false;

    },

    isIEXMLSupported: function() {
        if (!window.ActiveXObject) {
            return false;
        }
        try {
            new ActiveXObject("Microsoft.XMLDOM");
            return true;

        } catch(e) {
            return false;
        }
    }
};


/*
Create an instance of this and call the init method
*/
XSLTHelper = function() {
    this.req = null;
}
/*
 xslName is add to the array
*/
XSLTHelper.xsltCache = null;

XSLTHelper.init = function() {
    XSLTHelper.xsltCache = new Array();
}

XSLTHelper.add = function(xslName, xslObj) {
    XSLTHelper.xsltCache[xslName] = xslObj;
}
XSLTHelper.get = function(xslName) {
    return XSLTHelper.xsltCache[xslName];
}

XSLTHelper.prototype = {
    load : function(url,fileName) {
        try {
            if (window.XMLHttpRequest && window.XSLTProcessor) {
                this.req = new XMLHttpRequest();
                this.req.open("GET", url, false);
                //Sync call
                this.req.send(null);
                var httpStatus = this.req.status;
                if (httpStatus == 200) {
                    XSLTHelper.add(fileName, this.req.responseXML);
                } else {
                    this.defaultError.call(this);
                }

            } else if (window.ActiveXObject) {
                try {
                    this.req = new ActiveXObject("Microsoft.XMLDOM");
                    this.req.async = false;
                    this.req.load(url);
                    XSLTHelper.add(fileName, this.req);
                } catch(e) {
                    this.defaultError.call(this);
                }
            }

        } catch(e) {
            this.defaultError.call(this);
        }

    },

    defaultError : function() {
        alertWarning("Error Fetching XSLT file.")
    },

    transformMozilla : function(container,xmlDoc,fileName, isAbsPath, xslExtension) {
        var xslStyleSheet = XSLTHelper.get(fileName);
        if (xslStyleSheet == undefined) {
            var url = this.calculateURL(fileName, isAbsPath, xslExtension);
            this.load(url, fileName);
        }
        xslStyleSheet = XSLTHelper.get(fileName);
        if (xslStyleSheet == undefined || xslStyleSheet == null) {
            alertWarning("XSL Style Sheet is not available");
            return;
        }

        var xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xslStyleSheet);
        var fragment = xsltProcessor.transformToFragment(xmlDoc, document);

        container.innerHTML = "";
        container.appendChild(fragment);
    },

    transformIE : function(container,xmlDoc,fileName, isAbsPath, xslExtension){
        var xslStyleSheet = XSLTHelper.get(fileName);
        if (xslStyleSheet == undefined) {
            var url = this.calculateURL(fileName, isAbsPath, xslExtension);
            this.load(url, fileName);
        }
        xslStyleSheet = XSLTHelper.get(fileName);
        if (xslStyleSheet == undefined || xslStyleSheet == null) {
            alertWarning("XSL Style Sheet is not available");
            return;
        }

        var fragment = xmlDoc.transformNode(xslStyleSheet);
        container.innerHTML = "<div>"+fragment+"</div>";

    },

    calculateURL : function (fileName, isAbsPath, xslExtension) {
        var fullPath;

        if (!xslExtension) {
            xslExtension = 'core';
        }

        if (isAbsPath) {
            fullPath = fileName;
        }

        fullPath = URL + "/extensions/" + xslExtension + "/xslt/" + fileName;

        return fullPath;

    },

    /*
    @param container : DIV object. After transformation generated HTML will be injected to this location.
    @param xmlDoc    : XML DOM Document.
    @param fileName  : XSL file name. Make sure this being unique
	@param isAbsPath : Used to indicate whether the usr provided is a absolute path. This is needed to reuse this
					method from outside the admin service.
	@param xslExtension : Extension location
    */
    transform : function(container, xmlDoc, fileName, isAbsPath, xslExtension) {
        if (!this.isXSLTSupported()) {
            alertWarning("This browser does not support XSLT");
            return;
        }

        if (window.XMLHttpRequest && window.XSLTProcessor) {
            this.transformMozilla(container, xmlDoc, fileName, isAbsPath, xslExtension);

        } else if (window.ActiveXObject) {
            this.transformIE(container, xmlDoc, fileName, isAbsPath, xslExtension);
        }


    },
    isXSLTSupported : function() {
        return (window.XMLHttpRequest && window.XSLTProcessor) || Util.isIEXMLSupported();

    }

};











