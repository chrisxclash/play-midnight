jQuery(function($){

var PlayMidnightOptions = {
	defaults: {
		favicon: true,
		styled: true,
		theme: 'default'
	},

	load: function( callback ) {
		var self = this;
		chrome.storage.sync.get( self.defaults, function( options ) {
			callback( options );
		});
	},

	populate: function( options ) {
		var self = this;

		var favIcon = $('#play-midnight-options #favicon');
		var styled = $('#play-midnight-options #styled');
		var themeColor = $('#play-midnight-options #' + options.theme + '.theme-color');

		if ( options.favicon ) {
			favIcon.prop( 'checked', true ).closest('.option').addClass('selected');
		}

		if ( options.styled ) {
			styled.prop( 'checked', true ).closest('.option').addClass('selected');
		}

		themeColor.prop( 'checked', true ).closest('.option').addClass('selected');

		$('#play-midnight-options #save').addClass( options.theme );
		$('#play-midnight-options .option').on('click', function() {
			self.doSelect(this);
		});
	},

	doSelect: function( ele ) {
		var option = $(ele);
		var group = option.closest('.options-group');

		group.find('.selected').removeClass('selected');
		option.addClass('selected');
	},

	save: function( callback ) {
		var favicon = $('#play-midnight-options #favicon').is(':checked');
		var styled = $('#play-midnight-options #styled').is(':checked');
		var theme = $('#play-midnight-options .theme-color:checked').attr('id');
		var status = $('#play-midnight-options #status');

		chrome.storage.sync.set( {
			favicon: favicon,
			styled: styled,
			theme: theme
		}, function( ) {
			status.fadeIn(500, function() {
				setTimeout(function() {
					status.fadeOut(500, function() {
						callback();
					});
				}, 800);
			});
		});
	}
};

var PlayMidnight = {

	options: {

	},

	init: function() {
		var self = this;

		PlayMidnightOptions.load(function( options ) {
			self.options = options;
			self.injectStyle();
			self.updateFavicon();
			self.injectOptions( function() {
				PlayMidnightOptions.populate( self.options );
				$('#play-midnight-options #save').on( 'click', function(e) {
					e.preventDefault();

					PlayMidnightOptions.save( function() {
						location.reload(true);
					} );
				});

				$('#play-midnight-options #cancel').on( 'click', function(e) {
					e.preventDefault();

					$('#play-midnight-options').removeClass('show');
				});
			});
		});

		this.addCredits();
		this.addSortOptions();
	},

	injectStyle: function() {
		var style = null;
		if ( this.options.styled === true ) {
			var theme = this.options.theme;
			style = $('<link>', {
				rel: 'stylesheet',
				type: 'text/css',
				href: chrome.extension.getURL( 'css/play-midnight-' + theme + '.css')
			});
			$('head').append(style);
		} else {
			style = $('<link>', {
				rel: 'stylesheet',
				type: 'text/css',
				href: chrome.extension.getURL( 'css/play-midnight-options.css')
			});
			$('head').append(style);
		}
	},

	injectOptions: function( callback ) {
		var options = $('<div />', {
			id: 'play-midnight-options',
		});
		$.get(chrome.extension.getURL( 'assets/options.html'), function( htmls ) {
			options.html( htmls );
			$('body').append( options );

			var button = $('<button />', {
				id: 'btn-pm-options',
				class: 'button small vertical-align'
			}).append( $('<img />', {
				src: chrome.extension.getURL('icon48.png')
			})).append( '<span>Play Midnight Options</span>' );

			button.on( 'click', function() {
				$('#play-midnight-options').addClass('show');
			});

			$('#headerBar .nav-bar').prepend( button );

			callback();
		});
	},

	updateFavicon: function() {
		if ( this.options.favicon === true ) {
			var iconUrl = chrome.extension.getURL('images/favicon.ico') + '?v=' + Date.now();

			$('link[rel="SHORTCUT ICON"]').remove();
			$('head').append( $('<link>', {
				rel: 'shortcut icon',
				href: iconUrl
			}) );
		}
	},

	addCredits: function() {
		var donateUrl = 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KHH9ZJH42FF4J';
		var personalUrl = 'http://christieman.com/';

		var divider = $('<div', {
			class: 'nav-section-divider'
		});

		var header = $('<div>', {
			class: 'nav-section-header',
			text: 'PLAY MIDNIGHT - '
		}).append( $('<a>', { href: donateUrl, text: 'DONATE' }) );

		var credits = $('<ul>', { id: 'play-midnight' })
			.append( $('<li>', { class: 'nav-item-container' })
				.append( $('<a>', {
					href: personalUrl,
					text: 'By Chris Tieman'
				})));

		if ( !$('#playMidnight-credits').length ) {
			$('#nav').append(
				$('<div>', { id: 'playMidnight-credits', })
					.append(divider)
					.append(header)
					.append(credits));
		}
	},

	addSortOptions: function() {
		var sortHtml = [
			'<div id="recent-sort" class="tab-container">',
			' <a class="header-tab-title selected" data-reason="0">All</a>',
			' <a class="header-tab-title" data-reason="2">Added</a>',
			' <a class="header-tab-title" data-reason="3">Played</a>',
			' <a class="header-tab-title" data-reason="5">Created</a>',
			'</div>',
		].join('');

		// Add a link directly to Recent, after the first "Listen Now" link
		$('<a data-type="recent" class="nav-item-container tooltip" href="">Recent</a>')
			.insertAfter('#nav_collections a:first-child');

		// Add sort links to the header
		function toggleRecentUI() {
			// Only add them if "Recent" string is present and we're not already in this view.
			// Otherwise remove the UI completely.
			if ( $(this).children('.tab-text:contains(Recent)').length
				&& ! $(this).children('#recent-sort').length ) {
				$(this).append(sortHtml);
			} else {
				$('#recent-sort').remove();
			}
			$(this).one('DOMSubtreeModified', toggleRecentUI);
		}

		// Make sure this only fires once or else we would be in an infinite loop,
		// since the function itself modifies the DOM subtree.
		$('#breadcrumbs').one('DOMSubtreeModified', toggleRecentUI);

		// Filter toggling behavior
		$('#breadcrumbs').on('click', 'a', function() {
			var $this = $(this);
			var reason = parseInt($this.data('reason'));
			var selector = (reason == 0 ? '*' : '[data-reason=' + reason + ']');
			var $cards = $('#music-content .card');

			$this.addClass('selected').siblings().removeClass('selected');
			$cards.filter(selector).show();
			$cards.not(selector).hide();
		});
	}
};

PlayMidnight.init();


});