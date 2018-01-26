/*global Promise, PlayMidnight, PlayMidnightUtilities */
var PlayMidnightInjector = (function (_, PM) {
  'use strict';

  // Our Friend
  var PMInjector = {};

  // Load Options Templates and Inject
  async function loadTemplates(_temps, cb) {
    var promises = [];

    // Invalid Templates
    if (!_temps || typeof _temps !== 'object') {
      if (typeof cb === 'function') {
        await cb(_temps);
      }
      return;
    }

    // Load Up Promises
    for (var key in _temps) {
      if (_temps.hasOwnProperty(key)) {
        if (!_temps[key] || !_temps[key].hasOwnProperty('url')) {
          continue;
        }

        promises.push(
          _.$http.get(_temps[key].url)
        );
      }
    }

    // No Templates had URLS
    if (!promises.length) {
      if (typeof cb === 'function') {
        await cb(_temps);
      }
      return;
    }

    // Load ALL Templates before injecting
    await Promise.all(promises)
      .then(async function (templateHtml) {
        // Populate Returned Templates
        var i = 0;
        for (var key in _temps) {
          if (_temps.hasOwnProperty(key)) {
            _temps[key].html = parseTemplate(templateHtml[i]) || '';
            _temps[key].element = await _.createPolymerElement(_temps[key].html) || document.createElement('div');
            i++;
          }
        }

        if (typeof cb === 'function') {
          await cb(_temps);
        }
      });
  }


  // Load Options Templates and Inject
  async function injectTemplates(_temps, cb) {
    var target;

    _.log('Starting Load Templates');
    await loadTemplates(_temps, async function (templates) {
      _.log('Injecting Templates');

      // No Templates?
      if (!templates || typeof templates !== 'object') {
        _.log('No Templates loaded?');
        if (typeof cb === 'function') {
          await cb();
        }
        return;
      }

      for (var key in templates) {
        if (templates.hasOwnProperty(key)) {
          if (templates[key].hasOwnProperty('enabled') && !templates[key].enabled()) {
            continue;
          }

          target = document.querySelector(templates[key].target);

          if (target) {
            if (templates[key].hasOwnProperty('append')) {
              target.insertBefore(templates[key].element, target.childNodes[templates[key].append]);
            } else {
              target.appendChild(templates[key].element);
            }
            _.garbage(window.getComputedStyle(templates[key].element).height);
          } else {
            _.log('Error finding target Element: %s', templates[key].target);
          }

          // Register Events, If Given
          if (typeof templates[key].events === 'function') {
            templates[key].events(templates[key].element);
          }
        }
      }

      if (typeof cb === 'function') {
        await cb();
      }
    });
  }


  // Parse Template html to fix relative paths
  function parseTemplate(template) {
    template = template.replace(/\{CHROME_DIR\}/g, _.browser.url('/dist'));
    template = template.replace(/\{VERSION_NUMBER\}/g, PM.version);

    return template;
  }


  // Add to utils
  _.inject = injectTemplates;


  // Return Object for Modularity
  return PMInjector;
})(PlayMidnightUtilities, PlayMidnight);
