/*global Promise, chrome, PlayMidnightUtilities */
// _ references Utilities
var PlayMidnight = (function(_){
	'use strict';

	// Our Friend
	var PM = {};

	// Dev Mode: Use CSS File rather than inline <style> (inline allows dynamic accent colors)
	var _dev = false;

	var VERSION_NUMBER = '2.0.3';

	// Reset Options when version less than
	var _resetOptions = '2.0.3';

	// Nuke All Options
	var _nukeOptions = '2.0.3';

	// All Options Defined
	var _optionsGraph = {}; // Full Options Tree (options.json)
	var _defaultOptions = {}; // Default Options
	var _userOptions = {}; // User Loaded Options


	// Favicon Attributes
	var _favicon = {
		// Load Newest Icon with Timestamp to prevent Caching
		url: chrome.extension.getURL('dist/images/favicon.ico') + '?v=' + Date.now()
	};


	// Stylesheets
	var _stylesheets = {
		main: {
			id: 'play-midnight-stylesheet',
			url: chrome.extension.getURL('dist/css/play-midnight.css'),
			html: '',
			enabled: function() {
				return _userOptions.enabled;
			}
		},

		options: {
			id: 'play-midnight-options',
			url: chrome.extension.getURL('dist/css/play-midnight-options.css'),
			html: ''
		}
	};


	// Replace Rules
	var _replaceRules = [
		{
			name: 'Accent Color',
			regex: /\#fb8521/gi,
			replace: function() {
				return _userOptions.accent.color;
			}
		}
	];



	// Load User Options from Chrome Storage
	function loadOptions(cb) {
		_.$http.get(chrome.extension.getURL('dist/options.json'))
			.then(function(options) {
				_optionsGraph = JSON.parse(options);
				_defaultOptions = parseOptions(_optionsGraph);

				_.log('Default Options Loaded');
				for (var key in _defaultOptions) {
					if (_defaultOptions.hasOwnProperty(key)) {
						_.log('%s: %s', key.toString().toUpperCase(), JSON.stringify(_defaultOptions[key]));
					}
				}

				chrome.storage.sync.get(_defaultOptions, function(options) {
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
					_parsed[key] = rules[option.default] || option.default;
				}
			}
		}

		return _parsed;
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

			chrome.storage.sync.set(_defaultOptions, function() {
				_userOptions = _defaultOptions;
				if (cb && typeof cb === 'function') {
					cb();
				}
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

			chrome.storage.sync.set(options, function() {
				_userOptions = options;
				if (cb && typeof cb === 'function') {
					cb();
				}
				return;
			});

		// Update Version Number
		} else if (_.versionCompare(options.version, VERSION_NUMBER) === -1) {
			_.log('PLAY MIDNIGHT: Updated to version %s', VERSION_NUMBER);

			chrome.storage.sync.set({ version: VERSION_NUMBER }, function() {
				_userOptions.version = VERSION_NUMBER;
				if (cb && typeof cb === 'function') {
					cb();
				}
				return;
			});

		// Options All Good
		} else {
			_userOptions = options;
			if (cb && typeof cb === 'function') {
				cb();
			}
			return;
		}

		// Something went wrong loading options, set user to default for this Run
		_userOptions = _defaultOptions;
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

					if (_userOptions.enabled) {
						for (var i = 0, len = _replaceRules.length; i < len; i++) {
							rule = _replaceRules[i];
							replace = rule.replace();

							stylesheet.html = stylesheet.html.replace(rule.regex, replace);
						}
					}

					temp = style.cloneNode();

					temp.id = stylesheet.id;
					temp.innerHTML = stylesheet.html;
					document.head.appendChild(temp);
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
            .then(function(stylesheets) {
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
		if (!_userOptions.favicon) {
			return;
		}

		var icon = document.createElement('link');

		// Remove Old Favicon
		var current = document.querySelectorAll('link[rel="SHORTCUT ICON"]');
		_.remove(current);

		icon.rel = 'shortcut icon';
		icon.href = _favicon.url;

		document.head.appendChild(icon);
	}


	// Update Queue
	function updateQueue() {
		if (!_userOptions.queue) {
			return;
		}

		document.querySelector('#queue-overlay').classList.add('pm-expanded-queue');
	}


	// Display Notification if new one exists
	function checkNotification() {
		var notificationUrl;

		// First Run
		if (_userOptions.lastRun === undefined || _userOptions.lastRun === null) {
			notificationUrl = chrome.extension.getURL('dist/templates/notifications/default.html');

        // New Version
		} else if (_.versionCompare(_userOptions.lastRun, VERSION_NUMBER) < 0) {
			notificationUrl = chrome.extension.getURL('dist/templates/notifications/' + VERSION_NUMBER + '.html');

        // Current Version
		} else {
			_.log('Already on Current Version (v%s), Skipping Modal', _userOptions.lastRun);
			return;
		}

		_.$http.get(notificationUrl).then(function(template) {
			_.log('Show notification for version: %s', VERSION_NUMBER);
			PM.Modal.show(template, function() {
				chrome.storage.sync.set({ lastRun: VERSION_NUMBER }, function() {
					_userOptions.lastRun = VERSION_NUMBER;
				});
			});
		}).catch(function() {
			_.log('No notification template exists for version: %s', VERSION_NUMBER);
			chrome.storage.sync.set({ lastRun: VERSION_NUMBER }, function() {
				_userOptions.lastRun = VERSION_NUMBER;
			});
		});
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

			chrome.storage.onChanged.addListener(function(changes) {
				_.log('PLAY MIDNIGHT: Option Changed!');

				for (var key in changes) {
					if (changes.hasOwnProperty(key)) {
						_.log('%s: %s', key.toString().toUpperCase(), JSON.stringify(changes[key]));
					}
				}
			});
		}
	}




	// Yay Initialize!
	function init() {
		_.setVerbose(_dev);

		loadOptions(function() {
			config();
			injectStyle();

			window.addEventListener('load', function() {
				PM.Options.create();
				updateFavicon();
				updateQueue();
				checkNotification();
			});
		});
	}


	function getUserOptions() {
		return _userOptions;
	}

	function getOptionsGraph() {
		return _optionsGraph;
	}

	// Expose to Outside World
	PM.version = VERSION_NUMBER;
	PM.getUserOptions = getUserOptions;
	PM.getOptionsGraph = getOptionsGraph;
    PM.init = init;


	// Return Object for Modularity
	return PM;
})(PlayMidnightUtilities);