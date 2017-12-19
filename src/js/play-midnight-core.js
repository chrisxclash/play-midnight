/*global Promise, chrome, PlayMidnightUtilities */
var PlayMidnight = (function (_) {
  'use strict';

  // Dev Mode: Use CSS File rather than inline <style> (inline allows dynamic accent colors)
  var _dev = false;

  var VERSION_NUMBER = '2.4.8';

  // Reset Options when version less than
  var _resetOptions = '2.1.0';

  // Nuke All Options
  var _nukeOptions = '2.1.0';

  // All Options Defined
  var _optionsGraph = {}; // Full Options Tree (options.json)
  var _defaultOptions = {}; // Default Options
  var _userOptions = {}; // User Loaded Options

  // Body Classlist
  var _classList = [];

  // Favicon Attributes
  var _favicon = {
    // Load Newest Icon with Timestamp to prevent Caching
    url: _.browser.url('dist/images/favicon.png') + '?v=' + Date.now()
  };

  // Observables
  var mainObserver = new MutationObserver(domUpdated);
  var loggerCache = {
    recentActivity: [],
    panes: false
  };

  // Stylesheets
  var _stylesheets = {
    accents: {
      id: 'play-midnight-accents',
      url: _.browser.url('dist/css/play-midnight-accents.css'),
      html: '',
      enabled: function () {
        return (_userOptions.enabled === false && _userOptions.accentsOnly);
      }
    },

    main: {
      id: 'play-midnight-stylesheet',
      url: _.browser.url('dist/css/play-midnight.css'),
      html: '',
      enabled: function () {
        return _userOptions.enabled;
      }
    },

    options: {
      id: 'play-midnight-options',
      url: _.browser.url('dist/css/play-midnight-options.css'),
      html: ''
    },

    globals: {
      id: 'play-midnight-globals',
      url: _.browser.url('dist/css/play-midnight-globals.css'),
      html: ''
    }
  };


  // Replace Rules
  var _replaceRules = [
    {
      name: 'Accent Color',
      regex: /\#fb8521/gi,
      replace: function () {
        return _userOptions.accent.color;
      }
    }, {
      name: 'Chrome URL',
      regex: /\{CHROME_DIR\}/gi,
      replace: function () {
        return _.browser.url('/dist');
      }
    }
  ];

  // Our Friend
  var PM = {
    version: VERSION_NUMBER,
    getUserOptions: getUserOptions,
    getOptionsGraph: getOptionsGraph,
    init: init
  };


  // Return Object for Modularity
  return PM;

  /////////////////////////////////////////////////////


  function init() {
    _.setVerbose(_dev);

    loadOptions(function () {
      config();
      injectStyle();
      fixSharedStyleElement();

      window.addEventListener('load', function () {
        PM.Options.create();

        updateFavicon();

        buildClassList({
          'enabled': 'enabled',
          'accentsOnly': 'accents-only',
          'fab': 'fab-icon',
          'topbar': 'topbar-dark',
          'queue': 'expanded-queue',
          'artistImage': 'no-header-image',
          'largeTable': 'large-table',
          // 'radio': 'no-radio',
          // 'songza': 'no-songza',
          'sidebar': 'static-sidebar',
          'staticPlaylists': 'static-playlists'
        });

        buildGroup("menus", [
          {
            key: "listenNow",
            url: '#/now'
          },
          {
            key: "topCharts",
            url: '#/wtc'
          },
          {
            key: "recent",
            url: '#/recents'
          },
          {
            key: "newReleases",
            url: '#/wnr'
          },
          {
            key: "myLibrary",
            url: '#/wmp'
          },
          {
            key: "podcasts",
            url: '#/podcasts'
          },
          {
            key: "browseStations",
            url: '#/wbs'
          },
          {
            key: "shop",
            url: '#/shop'
          },
          {
            key: "subscribe",
            url: '#/sub'
          }
        ], '#/now');

        buildGroup("playlists", [
          {
            key: "thumbsUp"
          },
          {
            key: "soundSearch"
          },
          {
            key: "lastAdded"
          },
          {
            key: "freePurchased"
          }
        ]);

        checkNotification();

        mainObserver.observe(document.querySelector('body'), { attributes: true, characterData: true, childList: true, subtree: true });
      });
    });
  }

  function domUpdated() {
    updatePaneBGs();
    updateRecentActivity();
  }

  function buildClassList(options) {
    var classList = [];

    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        var single = options[key];

        if (_userOptions[key]) {
          if (typeof single === 'string') {
            _classList.push(single);
          } else {
            _classList.push(single.class);
            _.callback(single.events);
          }
        }
      }
    }

    classList = _classList.join(' ');
    document.body.setAttribute('data-playmidnight', classList);
  }


  function buildGroup(name, options, def) {
    var disabled = [];
    var hashes = [];
    var list = '';
    var url;

    for (var i = 0; i < options.length; i++) {
      var option = options[i];

      if (!_userOptions[option.key]) {
        disabled.push(option.key);
        hashes.push(option.url);
      } else {
        if (!url) {
          url = option.url;
        }
      }
    }

    // Redirect if on one of the disabled tabs
    if (!window.location.hash.length || hashes.indexOf(window.location.hash) > -1) {
      window.location.href = url || def;
    }

    list = (disabled.length === options.length) ? 'ALL' : disabled.join(' ');
    document.body.setAttribute('data-playmidnight-' + name, list);
  }


  function getUserOptions() {
    return _userOptions;
  }


  function getOptionsGraph() {
    return _optionsGraph;
  }


  // Load User Options from Storage
  function loadOptions(cb) {
    _.$http.get(_.browser.url('dist/options.json'))
      .then(function (options) {
        _optionsGraph = JSON.parse(options);
        _defaultOptions = parseOptions(_optionsGraph);

        _.log('Default Options Loaded');
        for (var key in _defaultOptions) {
          if (_defaultOptions.hasOwnProperty(key)) {
            _.log('%s: %s', key.toString().toUpperCase(), JSON.stringify(_defaultOptions[key]));
          }
        }

        _.browser.get(_defaultOptions, function (options) {
          checkUpdated(options, cb);
        });
      });
  }


  // Parse Options
  function parseOptions(options, _parsed) {
    var option, rules;

    _parsed = _parsed || {};

    rules = {
      '{VERSION_NUMBER}': VERSION_NUMBER
    };

    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        option = options[key];

        if (option.type === 'section') {
          parseOptions(option.options, _parsed);
        } else if (option.type === 'array') {
          _parsed[option.single] = rules[option.default] || option.default;
          _parsed[key] = option.collection;
        } else {
          if (option.type === 'string' && option.saved === false) {
            continue;
          }

          _parsed[key] = rules[option.default] || option.default;
        }
      }
    }

    return _parsed;
  }

  // Update backgrounds of first to homepage panes to be black
  function updatePaneBGs() {
    if (!_userOptions.enabled) { return; }

    var backgroundColor = 'rgba(20,21,23,1)';
    var panes = document.querySelectorAll('#gpm-home-module-0, #gpm-home-module-1');

    for (var i = 0, len = panes.length; i < len; i++) {
      if (!loggerCache.panes) {
        loggerCache.panes = true;
        _.log('PLAY MIDNIGHT: Updating Homepage Single Pane Backgrounds (White -> Black)');
      }

      var pane = panes[i];
      if (pane.getAttribute('background-color') !== backgroundColor) {
        pane.setAttribute('background-color', backgroundColor);
      }
    }
  }

  // Update recent activity album sizes
  function updateRecentActivity() {
    var urlRegex = /(=s90)/;
    var gridItems = document.querySelectorAll('gpm-card-grid.mini sj-card');

    for (var i = 0, len = gridItems.length; i < len; i++) {
      var item = gridItems[i];

      if (!item) { continue; }

      var name = (item.getAttribute('play-label') || '').replace('Play ', '');
      var img = item.querySelector('img');

      if (img && urlRegex.test(img.src)) {
        if (loggerCache.recentActivity.indexOf(name) < 0) {
          loggerCache.recentActivity.push(name);
          _.log('PLAY MIDNIGHT: Updating Recent Activity Album Art For ' + name + ' (90x90 -> 150x150)');
        }

        img.setAttribute('src', img.src.replace('=s90', '=s150'));
      }
    }
  }

  // Check if Play Midnight has Updated, Reset options if needed
  function checkUpdated(options, cb) {
    var skipped = ['lastRun', 'accent', 'accents', 'queue'];

    // No Version Found (< v2.0.0)
    if (options.version === undefined || _.versionCompare(options.version, _nukeOptions) === -1) {
      if (options.version === undefined) {
        _.log('PLAY MIDNIGHT: No Current Options Found, Setting to Default');
      } else {
        _.log('PLAY MIDNIGHT: Nuking All Options to Default');
      }

      _.browser.save(_defaultOptions, function () {
        _userOptions = _defaultOptions;
        _.callback(cb);
        return;
      });

      // Version Older Than Required Reset (For Resetting to add new options)
    } else if (_.versionCompare(options.version, _resetOptions) === -1) {
      _.log('PLAY MIDNIGHT: Options Update, Forcing Reset');

      for (var key in _defaultOptions) {
        if (_defaultOptions.hasOwnProperty(key)) {
          if (options[key] === undefined || (Object.prototype.toString.call(options[key]) !== Object.prototype.toString.call(_defaultOptions[key]) && skipped.indexOf(key) === -1)) {
            _.log('Setting %s to default (User: %s, Default: %s)', key, JSON.stringify(options[key]), JSON.stringify(_defaultOptions[key]));
            options[key] = _defaultOptions[key];
          } else {
            _.log('Skipping %s, User Value: %s', key, JSON.stringify(options[key]));
          }
        }
      }

      _.browser.save(options, function () {
        _userOptions = options;
        _.callback(cb);
        return;
      });

      // Update Version Number
    } else if (_.versionCompare(options.version, VERSION_NUMBER) === -1) {
      _.log('PLAY MIDNIGHT: Updated to version %s', VERSION_NUMBER);

      _.browser.save({
        version: VERSION_NUMBER
      }, function () {
        _userOptions.version = VERSION_NUMBER;
        _.callback(cb);
        return;
      });

      // Options All Good
    } else {
      _userOptions = options;
      _.callback(cb);
      return;
    }

    // Something went wrong loading options, set user to default for this Run
    _userOptions = _defaultOptions;
  }

  function ready(callback)
  {
      // in case the document is already rendered
      if (document.readyState !== 'loading')
      {
          callback();
      }
      // modern browsers
      else if (document.addEventListener)
      {
          document.addEventListener('DOMContentLoaded', callback);
      }
      // IE <= 8
      else
      {
          document.attachEvent('onreadystatechange', function()
          {
              if (document.readyState === 'complete')
              {
                  callback();
              }
          });
      }
  }

  function getSharedStyleElement()
  {
      var styleElems = document.getElementsByTagName('style');

      for (var i = 0; i < styleElems.length; i++) {
          if (styleElems[i].getAttribute('include') === 'sj-shared-styles') {
              return styleElems[i];
          }
      }
  }

  function fixSharedStyleElement() {
    ready(function() {
      window.onload = function() {
        var n = 0;
        var accentColor = _userOptions.accent.color;
        var styleElem = getSharedStyleElement();
        var styleText = styleElem.innerHTML;
        var newStyleText = styleText.replace(/\#ff5722/gi, function() {
          ++n;
          return accentColor;
        });

        styleElem.innerHTML = newStyleText;
      };
    });
  }

  // Inject Stylesheet
  function injectStyle() {
    var promises = [];

    function doInject() {
      var stylesheet, link, style, replace, rule, key, temp;

      // Inject Stylesheet as <link>
      if (_dev) {
        _.log('DEV MODE ENABLED: Using <link> tag');
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';

        for (key in _stylesheets) {
          if (_stylesheets.hasOwnProperty(key)) {
            stylesheet = _stylesheets[key];

            if (stylesheet.hasOwnProperty('enabled') && !stylesheet.enabled()) {
              continue;
            }

            temp = link.cloneNode();

            temp.href = stylesheet.url;
            document.head.appendChild(temp);
          }
        }

        return;
      }

      _.log('DEV MODE DISABLED: Using <style> tag');
      style = document.createElement('style');
      style.type = 'text/css';

      for (key in _stylesheets) {
        if (_stylesheets.hasOwnProperty(key)) {
          stylesheet = _stylesheets[key];

          if (stylesheet.hasOwnProperty('enabled') && !stylesheet.enabled()) {
            continue;
          }

          if (_userOptions.enabled || _userOptions.accentsOnly) {
            for (var i = 0, len = _replaceRules.length; i < len; i++) {
              rule = _replaceRules[i];
              replace = rule.replace();

              stylesheet.html = stylesheet.html.replace(rule.regex, replace);
            }
          }

          temp = style.cloneNode();

          temp.id = stylesheet.id;
          temp.innerHTML = stylesheet.html;
          document.body.appendChild(temp);
        }
      }
    }

    for (var key in _stylesheets) {
      if (_stylesheets.hasOwnProperty(key)) {
        promises.push(
          _.$http.get(_stylesheets[key].url)
        );
      }
    }

    Promise.all(promises)
      .then(function (stylesheets) {
        var i = 0;
        for (var key in _stylesheets) {
          if (_stylesheets.hasOwnProperty(key)) {
            _stylesheets[key].html = stylesheets[i] || '';
            i++;
          }
        }

        doInject();
      });
  }


  // Update Favicon
  function updateFavicon() {
    if (!_userOptions.favicon && !_userOptions.faviconAccent) {
      return;
    }

    var stored = (localStorage.getItem('PM_ICON')) ? JSON.parse(localStorage.getItem('PM_ICON')) : undefined;
    var cached = (stored && stored.color === _userOptions.accent.color);
    var data = {
      url: _favicon.url,
      color: _userOptions.accent.color
    };

    if (_userOptions.faviconAccent) {
      if (!cached) {
        chrome.runtime.sendMessage(data, function (response) {
          localStorage.setItem('PM_ICON', JSON.stringify({
            url: response.url,
            color: _userOptions.accent.color
          }));
          createIcon(response.url);
        });
      } else {
        createIcon(stored.url);
      }
    } else {
      createIcon(data.url);
    }

    function createIcon(url) {
      // Remove Old Favicon
      var current = document.querySelectorAll('link[rel="SHORTCUT ICON"], link[rel="shortcut icon"], link[rel="icon"], link[href $= ".ico"]');
      _.remove(current);

      // Create Link Element
      var icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/png';
      icon.href = url;

      document.head.appendChild(icon);
    }
  }


  // Display Notification if new one exists
  function checkNotification() {
    if (!_userOptions.notify) {
      _.log('Notifications are disabled via user options, skipping check');
      return;
    }

    var notificationUrl = _.browser.url('dist/templates/notifications/' + VERSION_NUMBER + '.html');

    // No New Version
    if (typeof _userOptions.lastRun === 'string' && _.versionCompare(_userOptions.lastRun, VERSION_NUMBER) > -1) {
      _.log('Already on Current Version (v%s), Skipping Modal', _userOptions.lastRun);
      return;
    }

    // New User
    if (_userOptions.lastRun === null) {
      _.log('New user, loading default', VERSION_NUMBER);

      notificationUrl = _.browser.url('dist/templates/notifications/default.html');
      _.$http.get(notificationUrl).then(function (template) {
        _.log('Show Default Notification', VERSION_NUMBER);
        PM.Modal.show(template, function () {
          _.browser.save({
            lastRun: '0.0.0'
          }, function () {
            _userOptions.lastRun = '0.0.0';
          });
        });
      }).catch(function () {
        _.log('Failed to load Default Notification');
      });

      return;

      // Returning User, check for new modal
    } else {
      _.$http.get(notificationUrl).then(function (template) {
        _.log('Show notification for version: %s', VERSION_NUMBER);
        PM.Modal.show(template, function () {
          _.browser.save({
            lastRun: VERSION_NUMBER
          }, function () {
            _userOptions.lastRun = VERSION_NUMBER;
          });
        });
      }).catch(function () {
        _.log('No new notification for Current Version (v%s), Skipping Modal', VERSION_NUMBER);

        _.browser.save({
          lastRun: VERSION_NUMBER
        }, function () {
          _userOptions.lastRun = VERSION_NUMBER;
        });

        return;
      });
    }
  }


  // Configuration
  function config() {
    _.setVerbose(_userOptions.verbose || _dev);

    if (_.verbose()) {
      _.log('PLAY MIDNIGHT: Verbose Mode ENABLED');
      _.log('===========================================');
      _.log('PLAY MIDNIGHT: Loaded User Options');

      for (var key in _userOptions) {
        if (_userOptions.hasOwnProperty(key)) {
          _.log('%s: %s', key.toString().toUpperCase(), JSON.stringify(_userOptions[key]));
        }
      }

      chrome.storage.onChanged.addListener(function (changes) {
        _.log('PLAY MIDNIGHT: Option Changed!');
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) {
            _.log('%s: %s', key.toString().toUpperCase(), JSON.stringify(changes[key]));
          }
        }
      });
    }
  }

})(PlayMidnightUtilities);
