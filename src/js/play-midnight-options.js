/*global PlayMidnightUtilities, PlayMidnight */
var PlayMidnightOptions = (function (_, PlayMidnight) {
  'use strict';

  // Our Friend
  var PMOptions = {};

  var _injected = false,
    _menuOpen = false,
    _backdrop = document.createElement('div'),
    _modal = document.createElement('div'),
    _cb;


  // Various Templates
  var _templates = {};

  _templates.icons = {
    name: 'polymerIconset',
    url: _.browser.url('dist/templates/polymer-icons.html'),
    target: 'body'
  };

  _templates.optionsPage = {
    name: 'optionsPage',
    url: _.browser.url('dist/templates/options.html'),
    target: 'body'
  };

  _templates.menuItem = {
    name: 'menuItem',
    url: _.browser.url('dist/templates/options-menu.html'),
    target: '#nav .nav-section:last-child',
    append: 1,
    events: function (ele) {
      ele.addEventListener('click', function (e) {
        // Prevent Click Bubbling to Document
        if (!_menuOpen) {
          e.stopPropagation();
        }

        showOptions();
      }, false);

      // Dumb Hack to get SVG to show up
      ele.querySelector('iron-icon').innerHTML += '';
    }
  };

  _templates.fabIcon = {
    name: 'fabIcon',
    url: _.browser.url('dist/templates/options-fab.html'),
    target: 'body',
    // enabled: function () {
    //   var userOptions = PlayMidnight.getUserOptions();
    //   return userOptions.fab;
    // },
    events: function (ele) {
      ele.addEventListener('click', function (e) {
        // Prevent Click Bubbling to Document
        if (!_menuOpen) {
          e.stopPropagation();
        }

        showOptions();
      }, false);
    }
  };

  _templates.recentActivity = {
    name: 'recentActivity',
    url: _.browser.url('dist/templates/menu-recent.html'),
    target: '#nav_collections',
    append: 2,
    enabled: function () {
      var userOptions = PlayMidnight.getUserOptions();
      return userOptions.recent;
    },
    events: function (ele) {
      // Dumb Hack to get SVG to show up
      ele.querySelector('iron-icon').innerHTML += '';
    }
  };

  _templates.soundSearch = {
    name: 'soundSearch',
    url: _.browser.url('dist/templates/ap-sound-search.html'),
    target: '.sj-right-drawer .autoplaylist-section',
    append: 1,
    enabled: function () {
      var userOptions = PlayMidnight.getUserOptions();
      return userOptions.soundSearch;
    }
  };


  // Load Options Templates and Inject
  async function createOptions() {
    _.inject(_templates, async function () {
      var userOptions = PlayMidnight.getUserOptions(),
        optionsGraph = PlayMidnight.getOptionsGraph(),
        optionsPage = _templates.optionsPage.element,
        optionsContainer = _templates.optionsPage.element.querySelector('section.options .options-container'),
        frag = await buildOptions(optionsGraph, userOptions),
        items;

      optionsContainer.appendChild(frag);
      optionsPage.querySelector('#pm-save-options').addEventListener('click', function () {
        saveOptions(userOptions);
      });

      document.body.classList.add('play-midnight-active');
    });
  }


  // Save Options
  function saveOptions(userOptions) {
    var optionsPage = _templates.optionsPage.element;
    var toSave = optionsPage.querySelectorAll('.play-midnight-option, .play-midnight-collection');
    var saveDialog = optionsPage.querySelector('.save-dialog');
    var options = {};

    for (var i = 0; i < toSave.length; i++) {
      var ele = toSave[i];
      var type = ele.type;
      var key = ele.key;

      if (type === 'boolean') {
        var checked = ele.querySelector('paper-toggle-button').hasAttribute('checked');
        options[key] = checked;
      }

      if (type === 'array') {
        var radio = ele.querySelector('.collection input:checked');
        var selected = ele.querySelector('.collection-item.selected');
        var singleKey = ele.single;

        delete selected.item.selected;

        options[key] = ele.collection;
        options[singleKey] = JSON.parse(JSON.stringify(selected.item));
      }
    }

    _.browser.save(options, function (options) {
      _.log('Options Saved Successfully!');

      saveDialog.classList.add('visible');
      setTimeout(function () {
        saveDialog.classList.remove('visible');

        setTimeout(function () {
          location.reload();
        }, 1000);
      }, 2000);
    });
  }


  // Build Options
  async function buildOptions(options, values) {
    var fragment, option, ele;

    fragment = document.createDocumentFragment();

    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        option = options[key];

        if (option.type === 'section') {
          ele = await buildSection(key, option, values);
          fragment.appendChild(ele);
        }

        if (option.type === 'array') {
          ele = await buildArray(key, option, values);
          fragment.appendChild(ele);
        }

        if (option.type === 'boolean') {
          ele = await buildBoolean(key, option, values);
          fragment.appendChild(ele);
        }

        if (option.type === 'string') {
          if (option.visible !== true) {
            continue;
          }

          ele = buildString(option);
          fragment.appendChild(ele);
        }
      }
    }

    return fragment;
  }


  // Build Section
  async function buildSection(key, option, values) {
    var fragment = document.createDocumentFragment();

    var title = _.createElement('<h3 class="play-midnight-section-title"></h3>');
    title.innerText = option.title;

    var content = await buildOptions(option.options, values);

    fragment.appendChild(title);
    fragment.appendChild(content);

    return fragment;
  }


  // Build string
  function buildString(option) {
    var text = _.createElement('<div class="play-midnight-text-area"></div>');
    text.innerHTML = option.description;

    return text;
  }


  // Build Array
  async function buildArray(key, option, values) {
    var fragment = document.createDocumentFragment();

    var singleKey = option.single;
    var collection = [];
    var collectionEle = _.createElement('<div class="collection"></div>');

    // Full Container
    var container = _.createElement('<div class="play-midnight-collection"></div>');
    container.type = option.type;
    container.key = key;
    container.single = singleKey;
    container.default = option.default;
    container.collection = collection;
    container.collectionEle = collectionEle;

    // Build Header
    var details = _.createElement('<div class="details"><div class="option-info"><div class="option-name"></div><div class="option-description"></div></div></div>');
    var title = document.createTextNode(option.title);
    var description = document.createTextNode(option.description);
    details.querySelector('.option-name').appendChild(title);
    details.querySelector('.option-description').appendChild(description);

    if (option.createable === true) {
      var button = await _.createPolymerElement('<paper-button class="material-primary" role="button"><svg viewBox="0 0 24 24" height="100%" width="100%" preserveAspectRatio="xMidYMid meet" fit="" style="pointer-events: none; display: block;"><g><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></g></svg></paper-button>');
      var form = await buildForm(singleKey, option);

      button.addEventListener('click', function () {
        form.classList.toggle('visible');
      });

      details.appendChild(button);

      container.appendChild(details);
      container.appendChild(form);
    } else {
      container.appendChild(details);
    }

    // Build Collection
    var initialCollection = values[key];
    for (var i = 0, len = initialCollection.length; i < len; i++) {
      var item = initialCollection[i];
      item.selected = _.equalObjects(item, values[singleKey]);

      createCollectionItem(item, collection, collectionEle, singleKey);
    }

    container.appendChild(collectionEle);
    fragment.appendChild(container);

    return fragment;
  }


  function createCollectionItem(item, collection, collectionEle, key) {
    if (collection.indexOf(item) > -1) {
      return;
    }

    var collectionItem = _.createElement('<div class="collection-item"><div class="remove-item"></div><input type="radio" /><div class="fields"></div></div>');
    collectionItem.classList.add(key);
    collectionItem.item = item;

    var radio = collectionItem.querySelector('input');
    radio.name = key;

    if (item.selected === true) {
      collectionItem.classList.add('selected');
      radio.checked = true;
    }

    // Build Up Keys
    for (var metaKey in item) {
      if (item.hasOwnProperty(metaKey)) {
        var meta = item[metaKey];

        if (metaKey === 'selected') {
          continue;
        }

        if (metaKey === 'color') {
          collectionItem.style.background = meta;
        }

        var itemField = _.createElement('<div class="field"></div>');
        itemField.classList.add('field-' + metaKey);
        itemField.innerText = meta;

        collectionItem.querySelector('.fields').appendChild(itemField);
      }
    }

    collection.push(item);
    collectionEle.appendChild(collectionItem);

    _.log('New Accent: %s', JSON.stringify(item));
    _.log('Collection: %s', JSON.stringify(collection));

    var deleteBtn = collectionItem.querySelector('.remove-item');
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();

      var item = this.parentNode;
      removeFromCollection(item);
    });

    collectionItem.addEventListener('click', function (e) {
      var selected = this.parentNode.querySelector('.selected');

      if (selected) {
        selected.classList.remove('selected');
      }

      this.classList.add('selected');
      this.querySelector('input').checked = true;
    });
  }


  // Build Form
  async function buildForm(key, option) {
    var form = _.createElement('<form class="add-new" action="javascript:;"></form>');
    form.key = key;

    var title = _.createElement('<h4 class="subtitle">Add New ' + _.toTitleCase(option.single) + '</h4>');
    form.appendChild(title);

    var singleOption = option.default;

    for (var meta in singleOption) {
      if (singleOption.hasOwnProperty(meta)) {
        var field = await _.createPolymerElement('<div class="play-midnight-input"><paper-input label="" floatinglabel></paper-input></div>');
        var input = field.querySelector('paper-input');
        input.setAttribute('label', _.toTitleCase(meta));
        input.setAttribute('aria-label', _.toTitleCase(meta));
        input.querySelector('input').id = meta;

        if (meta === 'color') {
          input.setAttribute('label', 'Color - #xxx, #xxxxxx, rgb(x,x,x)');
          input.setAttribute('aria-label', 'Color - #xxx, #xxxxxx, rgb(x,x,x)');
        }

        form.appendChild(field);
      }
    }

    var button = await _.createPolymerElement('<div class="form-action"><paper-button class="material-primary" role="button" tabindex="0" no-focus=""></paper-button></div>');
    button.querySelector('paper-button').innerText = 'Create ' + _.toTitleCase(option.single);

    button.addEventListener('click', function () {
      var fields = form.querySelectorAll('input');

      if (addToCollection(form)) {
        for (var i = 0; i < fields.length; i++) {
          var input = fields[i];

          input.value = '';
          input.setAttribute('no-focus', '');
        }

        form.classList.remove('visible');
      }
    });

    form.appendChild(button);

    return form;
  }


  // Add To Collection
  function addToCollection(form) {
    var collectionDiv = _.getParentElement(form, 'play-midnight-collection');
    var inputs = form.querySelectorAll('input');
    var collection = collectionDiv.collection;
    var collectionEle = collectionDiv.collectionEle;
    var key = form.key;
    var item = {};

    for (var i = 0; i < inputs.length; i++) {
      var ele = inputs[i];
      var meta = ele.id;
      var val = ele.value;

      item[meta] = val;

      if (val.length < 1) {
        return false;
      }

      if (meta === 'color') {
        if (!/(?:^#[a-fA-F\d]{6}$)|(?:^#[a-fA-F\d]{3}$)|(?:^rgb\([ ]*?([\d]{1,3})[ ]*?,[ ]*?([\d]{1,3})[ ]*?,[ ]*?([\d]{1,3})[ ]*?\)$)/.test(val)) {
          return false;
        }
      }
    }

    createCollectionItem(item, collection, collectionEle, key);
    return true;
  }


  // Remove From Collection
  function removeFromCollection(single) {
    var collectionDiv = _.getParentElement(single, 'play-midnight-collection');
    var key = collectionDiv.single;
    var collection = collectionDiv.collection;
    var collectionEle = collectionDiv.collectionEle;
    var collectionDefault = collectionDiv.default;
    var selected = single.classList.contains('selected');

    _.log('Removed Accent: %s', JSON.stringify(single.item));

    _.remove(single);
    collection.splice(collection.indexOf(single.item), 1);

    if (collectionEle.children.length < 1) {
      createCollectionItem(collectionDefault, collection, collectionEle, key);
    }

    if (selected) {
      collectionEle.children[0].click();
    }

    _.log('Collection: %s', JSON.stringify(collection));
  }



  // Build Boolean
  async function buildBoolean(key, option, values) {
    var fragment = document.createDocumentFragment();

    var details = await _.createPolymerElement('<div class="play-midnight-option"><div class="option-info"><div class="option-name"></div><div class="option-description"></div></div><paper-toggle-button></paper-toggle-button></div>');
    var title = document.createTextNode(option.title);
    var description = document.createTextNode(option.description);
    details.querySelector('.option-name').appendChild(title);
    details.querySelector('.option-description').appendChild(description);
    details.key = key;
    details.type = option.type;

    var checkbox = details.querySelector('paper-toggle-button');
    if (values[key]) {
      checkbox.setAttribute('checked', true);
    }

    fragment.appendChild(details);

    return fragment;
  }


  // Listener for Document.click when Menu is open
  function handleClick(e) {
    if (_menuOpen && !_.isClicked(e.target, _templates.optionsPage.element)) {
      hideOptions();
    }
  }


  // Show Options Page
  function showOptions() {
    document.addEventListener('click', handleClick, false);
    document.body.classList.add('is-pm-options');
    _menuOpen = true;
  }


  // Hide Options Page
  function hideOptions() {
    document.removeEventListener('click', handleClick);
    document.body.classList.remove('is-pm-options');
    _menuOpen = false;
  }


  // Parse Template html to fix relative paths
  function parseTemplate(template) {
    template = template.replace(/\{CHROME_DIR\}/g, _.browser.url('/dist'));
    template = template.replace(/\{VERSION_NUMBER\}/g, _.browser.url('/dist'));

    return _.createElement(template);
  }


  // Add Options to Object
  PMOptions.create = createOptions;
  PMOptions.show = showOptions;
  PMOptions.hide = hideOptions;


  // Add To Core
  PlayMidnight.Options = PMOptions;


  // Return Object for Modularity
  return PMOptions;
})(PlayMidnightUtilities, PlayMidnight);
