/* global browser, chrome */
var PlayMidnightBrowser = (function () {
  'use strict';

  // Our Friend
  var BR = {};

  // Get Browser
  var _browser = typeof browser === 'undefined' ? 'chrome' : 'firefox';

  BR.isFireFox = function () {
    return _browser === 'firefox';
  };

  BR.isChrome = function () {
    return _browser === 'chrome';
  };

  // Save To Storage
  BR.save = function (data, cb) {
    chrome.storage.sync.set(data, cb);
  };


  // Get From Storage
  BR.get = function (data, cb) {
    chrome.storage.sync.get(data, cb);
  };


  // Get Full URL
  BR.url = function (url) {
    return chrome.extension.getURL(url);
  };


  // Option Changed
  BR.changed = function (cb) {
    return chrome.storage.onChanged.addListener(cb);
  };


  // Return Object for Modularity
  return BR;
})();
