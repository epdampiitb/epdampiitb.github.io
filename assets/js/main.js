/*
	Forty by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	skel.breakpoints({
		xlarge: '(max-width: 1680px)',
		large: '(max-width: 1280px)',
		medium: '(max-width: 980px)',
		small: '(max-width: 736px)',
		xsmall: '(max-width: 480px)',
		xxsmall: '(max-width: 360px)'
	});

	/**
	 * Applies parallax scrolling to an element's background image.
	 * @return {jQuery} jQuery object.
	 */
	$.fn._parallax = (skel.vars.browser == 'ie' || skel.vars.browser == 'edge' || skel.vars.mobile) ? function() { return $(this) } : function(intensity) {

		var	$window = $(window),
			$this = $(this);

		if (this.length == 0 || intensity === 0)
			return $this;

		if (this.length > 1) {

			for (var i=0; i < this.length; i++)
				$(this[i])._parallax(intensity);

			return $this;

		}

		if (!intensity)
			intensity = 0.25;

		$this.each(function() {

			var $t = $(this),
				on, off;

			on = function() {

				$t.css('background-position', 'center 100%, center 100%, center 0px');

				$window
					.on('scroll._parallax', function() {

						var pos = parseInt($window.scrollTop()) - parseInt($t.position().top);

						$t.css('background-position', 'center ' + (pos * (-1 * intensity)) + 'px');

					});

			};

			off = function() {

				$t
					.css('background-position', '');

				$window
					.off('scroll._parallax');

			};

			skel.on('change', function() {

				if (skel.breakpoint('medium').active)
					(off)();
				else
					(on)();

			});

		});

		$window
			.off('load._parallax resize._parallax')
			.on('load._parallax resize._parallax', function() {
				$window.trigger('scroll');
			});

		return $(this);

	};

	$(function() {

		var	$window = $(window),
			$body = $('body'),
			$wrapper = $('#wrapper'),
			$header = $('#header'),
			$banner = $('#banner');

		// Disable animations/transitions until the page has loaded.
			$body.addClass('is-loading');

			$window.on('load pageshow', function() {
				window.setTimeout(function() {
					$body.removeClass('is-loading');
				}, 100);
			});

		// Clear transitioning state on unload/hide.
			$window.on('unload pagehide', function() {
				window.setTimeout(function() {
					$('.is-transitioning').removeClass('is-transitioning');
				}, 250);
			});

		// Fix: Enable IE-only tweaks.
			if (skel.vars.browser == 'ie' || skel.vars.browser == 'edge')
				$body.addClass('is-ie');

		// Fix: Placeholder polyfill.
			$('form').placeholder();

		// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize(
					'.important\\28 medium\\29',
					skel.breakpoint('medium').active
				);
			});

		// Scrolly.
			$('.scrolly').scrolly({
				offset: function() {
					return $header.height() - 2;
				}
			});

		// Tiles.
		// Tiles are now backed by a live <canvas> simulation (see physics.js)
		// rather than a background image, so only the whole-tile click
		// target is set up here.
			var $tiles = $('.tiles > article');

			$tiles.each(function() {

				var $this = $(this),
					$link = $this.find('.link');

				// Link.
					if ($link.length > 0) {

						$x = $link.clone()
							.text('')
							.addClass('primary')
							.appendTo($this);
						
						$x.attr('aria-label', $link.text());

						$link = $link.add($x);

						$link.on('click', function(event) {

							var href = $link.attr('href');

							// Prevent default.
								event.stopPropagation();
								event.preventDefault();

							// Start transitioning.
								$this.addClass('is-transitioning');
								$wrapper.addClass('is-transitioning');

							// Redirect.
								window.setTimeout(function() {

									if ($link.attr('target') == '_blank')
										window.open(href);
									else
										location.href = href;

								}, 500);

						});

					}

			});

		// Header.
			if (skel.vars.IEVersion < 9)
				$header.removeClass('alt');

			if ($banner.length > 0
			&&	$header.hasClass('alt')) {

				$window.on('resize', function() {
					$window.trigger('scroll');
				});

				$window.on('load', function() {

					$banner.scrollex({
						bottom:		$header.height() + 10,
						terminate:	function() { $header.removeClass('alt'); },
						enter:		function() { $header.addClass('alt'); },
						leave:		function() { $header.removeClass('alt'); $header.addClass('reveal'); }
					});

					window.setTimeout(function() {
						$window.triggerHandler('scroll');
					}, 100);

				});

			}

		// Banner.
			$banner.each(function() {

				var $this = $(this),
					$image = $this.find('.image'), $img = $image.find('img');

				// Banners driven by a <canvas> simulation must not get a
				// background image or parallax — both would sit on top of it.
					if ($this.find('canvas').length > 0)
						return;

				// Parallax.
					$this._parallax(0.275);

				// Image.
					if ($img.length > 0 && $img.attr('src')) {

						// Set image.
							$this.css('background-image', 'url(' + $img.attr('src') + ')');

						// Hide original.
							$image.hide();

					}

			});

		// Menu.
			var $menu = $('#menu'),
				$menuInner;

			$menu.wrapInner('<div class="inner"></div>');
			$menuInner = $menu.children('.inner');
			$menu._locked = false;

			$menu._lock = function() {

				if ($menu._locked)
					return false;

				$menu._locked = true;

				window.setTimeout(function() {
					$menu._locked = false;
				}, 350);

				return true;

			};

			// Accessibility: the menu is a modal dialog, so it has to expose
			// its open state, move focus in on open, restore it on close, and
			// keep Tab inside itself while it is open.
			var $menuToggle = $('a.menu-toggle'),
				menuReturnFocus = null;

			$menu.attr({
				'id': 'menu',
				'role': 'dialog',
				'aria-modal': 'true',
				'aria-label': 'Site menu',
				'aria-hidden': 'true'
			});
			$menuToggle.attr({ 'aria-controls': 'menu', 'aria-expanded': 'false' });

			function menuFocusable() {
				return $menu.find('a[href], button:not(:disabled)').filter(':visible');
			}

			$menu._setState = function(open) {

				$menu.attr('aria-hidden', open ? 'false' : 'true');
				$menuToggle.attr('aria-expanded', open ? 'true' : 'false');

				if (open) {
					menuReturnFocus = document.activeElement;
					window.setTimeout(function() {
						var $f = menuFocusable();
						if ($f.length)
							$f.first().trigger('focus');
					}, 60);
				}
				else if (menuReturnFocus && menuReturnFocus.focus) {
					menuReturnFocus.focus();
					menuReturnFocus = null;
				}

			};

			$menu._show = function() {

				if ($menu._lock()) {
					$body.addClass('is-menu-visible');
					$menu._setState(true);
				}

			};

			$menu._hide = function() {

				if ($menu._lock()) {
					$body.removeClass('is-menu-visible');
					$menu._setState(false);
				}

			};

			$menu._toggle = function() {

				if ($menu._lock()) {
					$body.toggleClass('is-menu-visible');
					$menu._setState($body.hasClass('is-menu-visible'));
				}

			};

			// Keep Tab cycling inside the open menu.
			$menu.on('keydown', function(event) {

				if (event.keyCode != 9 || !$body.hasClass('is-menu-visible'))
					return;

				var $f = menuFocusable();
				if (!$f.length)
					return;

				var first = $f.first()[0],
					last = $f.last()[0];

				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				}
				else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}

			});

			$menuInner
				.on('click', function(event) {
					event.stopPropagation();
				})
				.on('click', 'a', function(event) {

					var href = $(this).attr('href');

					event.preventDefault();
					event.stopPropagation();

					// Hide.
						$menu._hide();

					// Redirect.
						window.setTimeout(function() {
							window.location.href = href;
						}, 250);

				});

			$menu
				.appendTo($body)
				.on('click', function(event) {

					event.stopPropagation();
					event.preventDefault();

					$body.removeClass('is-menu-visible');

				})
				.append('<a class="close" href="#menu">Close</a>');

			$body
				.on('click', 'a[href="#menu"]', function(event) {

					event.stopPropagation();
					event.preventDefault();

					// Toggle.
						$menu._toggle();

				})
				.on('click', function(event) {

					// Hide.
						$menu._hide();

				})
				.on('keydown', function(event) {

					// Hide on escape.
						if (event.keyCode == 27)
							$menu._hide();

				});

	});

})(jQuery);
