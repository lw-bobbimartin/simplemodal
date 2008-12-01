/*
 * SimpleModal @VERSION - jQuery Plugin
 * http://www.ericmmartin.com/projects/simplemodal/
 * http://plugins.jquery.com/project/SimpleModal
 * http://code.google.com/p/simplemodal/
 *
 * Copyright (c) 2008 Eric Martin - http://ericmmartin.com
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Revision: $Id$
 */

/**
 * SimpleModal is a lightweight jQuery plugin that provides a simple
 * interface to create a modal dialog.
 *
 * The goal of SimpleModal is to provide developers with a cross-browser 
 * overlay and container that will be populated with data provided to
 * SimpleModal.
 *
 * There are two ways to call SimpleModal:
 * 1) As a chained function on a jQuery object, like $('#myDiv').modal();.
 * This call would place the DOM object, #myDiv, inside a modal dialog.
 * Chaining requires a jQuery object. An optional options object can be
 * passed as a parameter.
 *
 * @example $('<div>my data</div>').modal({options});
 * @example $('#myDiv').modal({options});
 * @example jQueryObject.modal({options});
 *
 * 2) As a stand-alone function, like $.modal(data). The data parameter
 * is required and an optional options object can be passed as a second
 * parameter. This method provides more flexibility in the types of data 
 * that are allowed. The data could be a DOM object, a jQuery object, HTML
 * or a string.
 * 
 * @example $.modal('<div>my data</div>', {options});
 * @example $.modal('my data', {options});
 * @example $.modal($('#myDiv'), {options});
 * @example $.modal(jQueryObject, {options});
 * @example $.modal(document.getElementById('myDiv'), {options}); 
 * 
 * A SimpleModal call can contain multiple elements, but only one modal 
 * dialog can be created at a time. Which means that all of the matched
 * elements will be displayed within the modal container.
 * 
 * SimpleModal internally sets the CSS needed to display the modal dialog
 * properly in all browsers, yet provides the developer with the flexibility
 * to easily control the look and feel. The styling for SimpleModal can be 
 * done through external stylesheets, or through SimpleModal, using the
 * overlayCss and/or containerCss options.
 *
 * SimpleModal has been tested in the following browsers:
 * - IE 6, 7
 * - Firefox 2
 * - Opera 9
 * - Safari 3
 *
 * @name SimpleModal
 * @type jQuery
 * @requires jQuery v1.1.2
 * @cat Plugins/Windows and Overlays
 * @author Eric Martin (http://ericmmartin.com)
 * @version @VERSION
 */
(function ($) {
	var ie6 = $.browser.msie && parseInt($.browser.version) == 6 && !window['XMLHttpRequest'],
		ieQuirks = $.browser.msie && !$.boxModel,
		w = [];

	/*
	 * Stand-alone function to create a modal dialog.
	 * 
	 * @param {string, object} data A string, jQuery object or DOM object
	 * @param {object} [options] An optional object containing options overrides
	 */
	$.modal = function (data, options) {
		return $.modal.impl.init(data, options);
	};

	/*
	 * Stand-alone close function to close the modal dialog
	 */
	$.modal.close = function () {
		$.modal.impl.close();
	};

	/*
	 * Chained function to create a modal dialog.
	 * 
	 * @param {object} [options] An optional object containing options overrides
	 */
	$.fn.modal = function (options) {
		return $.modal.impl.init(this, options);
	};

	/*
	 * SimpleModal default options
	 * 
	 * iframe: (Boolean:true) Use an IFRAME with every modal dialog, not just IE6. Useful for
	 *          blocking page content using OBJECT and EMBED tags.
	 * opacity: (Number:50) The opacity value for the overlay div, from 0 - 100
	 * overlayId: (String:'simplemodal-overlay') The DOM element id for the overlay div
	 * overlayCss: (Object:{}) The CSS styling for the overlay div
	 * containerId: (String:'simplemodal-container') The DOM element id for the container div
	 * containerCss: (Object:{}) The CSS styling for the container div
	 * dataCss: (Object:{}) The CSS styling for the data div
	 * zIndex: (Number: 1000) Starting z-index value
	 * close: (Boolean:true) Show closeHTML?
	 * closeHTML: (String:'<a class="modalCloseImg" title="Close"></a>') The title value of the 
	              default close link. Depends on close.
	 * closeClass: (String:'simplemodal-close') The CSS class used to bind to the close event
	 * position: (Array:null) Position of container [left, top]. can be number of pixels or percentage
	 * persist: (Boolean:false) Persist the data across modal calls? Only used for existing
	            DOM elements. If true, the data will be maintained across modal calls, if false,
				   the data will be reverted to its original state.
	 * onOpen: (Function:null) The callback function used in place of SimpleModal's open
	 * onShow: (Function:null) The callback function used after the modal dialog has opened
	 * onClose: (Function:null) The callback function used in place of SimpleModal's close
	 */
	$.modal.defaults = {
		iframe: true,
		opacity: 50,
		overlayId: 'simplemodal-overlay',
		overlayCss: {},
		containerId: 'simplemodal-container',
		containerCss: {},
		dataCss: {},
		zIndex: 1000,
		close: true,
		closeHTML: '<a class="modalCloseImg" title="Close"></a>',
		closeClass: 'simplemodal-close',
		position: null,
		persist: false,
		onOpen: null,
		onShow: null,
		onClose: null
	};

	/*
	 * Main modal object
	 */
	$.modal.impl = {
		/*
		 * Modal dialog options
		 */
		opts: null,
		/*
		 * Contains the modal dialog elements and is the object passed 
		 * back to the callback (onOpen, onShow, onClose) functions
		 */
		dialog: {},
		/*
		 * Initialize the modal dialog
		 */
		init: function (data, options) {
			// don't allow multiple calls
			if (this.dialog.data) {
				return false;
			}

			// merge defaults and user options
			this.opts = $.extend({}, $.modal.defaults, options);

			// keep track of z-index
			this.zIndex = this.opts.zIndex;

			// set the onClose callback flag
			this.occb = false;

			// determine how to handle the data based on its type
			if (typeof data == 'object') {
				// convert DOM object to a jQuery object
				data = data instanceof jQuery ? data : $(data);

				// if the object came from the DOM, keep track of its parent
				if (data.parent().parent().size() > 0) {
					this.dialog.parentNode = data.parent();

					// persist changes? if not, make a clone of the element
					if (!this.opts.persist) {
						this.dialog.orig = data.clone(true);
					}
				}
			}
			else if (typeof data == 'string' || typeof data == 'number') {
				// just insert the data as innerHTML
				data = $('<div/>').html(data);
			}
			else {
				// unsupported data type!
				alert('SimpleModal Error: Unsupported data type: ' + typeof data);
				return false;
			}
			this.dialog.data = data.addClass('simplemodal-data').css(this.opts.dataCss);
			data = null;

			// create the modal overlay, container and, if necessary, iframe
			this.create();

			// display the modal dialog
			this.open();

			// useful for adding events/manipulating data in the modal dialog
			if ($.isFunction(this.opts.onShow)) {
				this.opts.onShow.apply(this, [this.dialog]);
			}

			// don't break the chain =)
			return this;
		},
		/*
		 * Create and add the modal overlay and container to the page
		 */
		create: function () {
			// get the window properties
			w = this.getDimensions();

			// add an iframe to prevent select options from bleeding through
			if (this.opts.iframe || ie6) {
				this.dialog.iframe = $('<iframe src="javascript:false;"/>')
					.css($.extend(this.opts.iframeCss, {
						display: 'none',
						opacity: 0, 
						position: 'fixed',
						height: w[0],
						width: w[1],
						zIndex: this.opts.zIndex,
						top: 0,
						left: 0
					}))
					.appendTo('body');
			}

			// create the overlay
			this.dialog.overlay = $('<div/>')
				.attr('id', this.opts.overlayId)
				.addClass('simplemodal-overlay')
				.css($.extend(this.opts.overlayCss, {
					display: 'none',
					opacity: this.opts.opacity / 100,
					height: w[0],
					width: w[1],
					position: 'fixed',
					left: 0,
					top: 0,
					zIndex: this.opts.zIndex + 1
				}))
				.appendTo('body');

			// create the container
			this.dialog.container = $('<div/>')
				.attr('id', this.opts.containerId)
				.addClass('simplemodal-container')
				.css($.extend(this.opts.containerCss, {
					display: 'none',
					position: 'fixed', 
					zIndex: this.opts.zIndex + 2
				}))
				.append(this.opts.close 
					? $(this.opts.closeHTML).addClass(this.opts.closeClass)
					: '')
				.appendTo('body');

			this.setPosition();

			// fix issues with IE and create an iframe
			if (ie6 || ieQuirks) {
				this.fixIE();
			}

			// hide the data and add it to the container
			this.dialog.container.append(this.dialog.data.hide());
		},
		/*
		 * Bind events
		 */
		bindEvents: function () {
			var self = this;

			// bind the close event to any element with the closeClass class
			$('.' + this.opts.closeClass).bind('click.simplemodal', function (e) {
				e.preventDefault();
				self.close();
			});

			// update window size
			$(window).bind('resize.simplemodal', function () {
				// redetermine the window width/height
				w = self.getDimensions();

				// reposition the dialog
				self.setPosition();

				// update the iframe & overlay
				if (!ie6) {
					self.dialog.iframe.css({height: w[0], width: w[1]});
					self.dialog.overlay.css({height: w[0], width: w[1]});
				}
			});
		},
		/*
		 * Unbind events
		 */
		unbindEvents: function () {
			$('.' + this.opts.closeClass).unbind('click.simplemodal');
			$(window).unbind('resize.simplemodal');
		},
		/*
		 * Fix issues in IE 6
		 */
		fixIE: function () {
			// simulate fixed position - adapted from BlockUI
			$.each([this.dialog.iframe, this.dialog.overlay, this.dialog.container], function (i, el) {
				var s = el[0].style;
				s.position = 'absolute';
				if (i < 2) {
					s.setExpression('height','document.body.scrollHeight > document.body.offsetHeight ? document.body.scrollHeight : document.body.offsetHeight + "px"');
					s.setExpression('width','jQuery.boxModel && document.documentElement.clientWidth || document.body.clientWidth + "px"');
				}
				else {
					s.setExpression('top','(document.documentElement.clientHeight || document.body.clientHeight) / 2 - (this.offsetHeight / 2) + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"');
				}
			});
		},
		getDimensions: function () {
			var el = $(window);

			// fix a jQuery/Opera bug with determining the window height
			var h = $.browser.opera && $.browser.version > '9.5' && $.fn.jquery <= '1.2.6' ?
				document.documentElement['clientHeight'] : 
				el.height();

			return [h, el.width()];
		},
		setPosition: function () {
			var top = 0, 
				left = 0,
				hCenter = (w[0]/2) - (this.dialog.container.height()/2),
				vCenter = (w[1]/2) - (this.dialog.container.width()/2);

			if (this.opts.position && this.opts.position.constructor == Array) {
				top += this.opts.position[1] || hCenter;
				left += this.opts.position[0] || vCenter;
			} else {
				top += hCenter;
				left += vCenter;
			}
			this.dialog.container.css({left: left, top: top});
		},
		/*
		 * Open the modal dialog elements
		 * - Note: If you use the onOpen callback, you must "show" the 
		 *	        overlay and container elements manually 
		 *         (the iframe will be handled by SimpleModal)
		 */
		open: function () {
			// display the iframe
			if (this.dialog.iframe) {
				this.dialog.iframe.show();
			}

			if ($.isFunction(this.opts.onOpen)) {
				// execute the onOpen callback 
				this.opts.onOpen.apply(this, [this.dialog]);
			}
			else {
				// display the remaining elements
				this.dialog.overlay.show();
				this.dialog.container.show();
				this.dialog.data.show();
			}

			// bind default events
			this.bindEvents();
		},
		/*
		 * Close the modal dialog
		 * - Note: If you use an onClose callback, you must remove the 
		 *         overlay, container and iframe elements manually
		 *
		 * @param {boolean} external Indicates whether the call to this
		 *     function was internal or external. If it was external, the
		 *     onClose callback will be ignored
		 */
		close: function () {
			// prevent close when dialog does not exist
			if (!this.dialog.data) {
				return false;
			}

			if ($.isFunction(this.opts.onClose) && !this.occb) {
				// set the onClose callback flag
				this.occb = true;

				// execute the onClose callback
				this.opts.onClose.apply(this, [this.dialog]);
			}
			else {
				// if the data came from the DOM, put it back
				if (this.dialog.parentNode) {
					// save changes to the data?
					if (this.opts.persist) {
						// insert the (possibly) modified data back into the DOM
						this.dialog.data.hide().appendTo(this.dialog.parentNode);
					}
					else {
						// remove the current and insert the original, 
						// unmodified data back into the DOM
						this.dialog.data.remove();
						this.dialog.orig.appendTo(this.dialog.parentNode);
					}
				}
				else {
					// otherwise, remove it
					this.dialog.data.remove();
				}

				// remove the remaining elements
				this.dialog.container.remove();
				this.dialog.overlay.remove();
				if (this.dialog.iframe) {
					this.dialog.iframe.remove();
				}

				// reset the dialog object
				this.dialog = {};
			}

			// remove the default events
			this.unbindEvents();
		}
	};
})(jQuery);