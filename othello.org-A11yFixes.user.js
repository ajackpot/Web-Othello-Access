	// ==UserScript==
// @name www.othello.org Accessibility Fixes
// @description    Improves the accessibility of www.othello.org
// @author         James Teh, ajackpot
// @copyright 2019-2022 Mozilla Corporation, Derek Riemer
// @license Mozilla Public License version 2.0
// @version        2019.1
// @include https://www.othello.org/*
// ==/UserScript==

/*** Functions for common tweaks. ***/

/**
 * Adds text to the given live region, and clears it a second later so it's no
 * longer perceivable.
 * @param {string} regionid an id of a region.
 */
function announce(text, regionId) {
	getLiveRegion(regionId)
		.then((region) => {
			region.innerText = text;
			setTimeout(() => {
				region.innerText = '';
			}, 1000);
		});
}

/**
 * create or fetch a live region that can be used with announce(). Returns a promise with the region.
 * @param {string} id the name of the new live region. This is an html id.
 * @return {!Promise<HTMLElement>} a div that contains the live region. This can typically be ignored, this exists to aid in chaining creation of non-existant regions.
 */
function getLiveRegion(id) {
	const updatePromise = new Promise((resolve, reject) => {
		if (!id) {
			reject('Need a valid id!');
			return;
		}
		const existingRegion = document.getElementById(id);
		if (existingRegion) {
			resolve(existingRegion);
			return;
		}
		const region = document.createElement('div');
		region.id = id;
		region.setAttribute('aria-live', 'polite');
		region.setAttribute('aria-atomic', 'true');
		region.style.position = 'absolute';
		region.style.width = '50px';
		region.style.height = '50px';
		region.style.opasity = 0;
		document.body.appendChild(region);
		// we need to delay a little to get the new region to actually read contents.
		// A11y APIs probably don't treat the relevant changes as "additions" until
		//an annimation frame has passed. It may, in reality be more like 2-4
		// annimation frames, so delay 134 ms to be safe.
		setTimeout(() => {
			resolve(region);
		}, 134);
	});
	return updatePromise;
}

function makeHeading(el, level) {
	el.setAttribute("role", "heading");
	el.setAttribute("aria-level", level);
}

function makeRegion(el, label) {
	el.setAttribute("role", "region");
	el.setAttribute("aria-label", label);
}

function makeButton(el, label) {
	el.setAttribute("role", "button");
	if (label) {
		el.setAttribute("aria-label", label);
		el.setAttribute("tabindex", "0");
	}
}

function makePresentational(el) {
	el.setAttribute("role", "presentation");
}

function setLabel(el, label) {
	el.setAttribute("aria-label", label);
}

function makeHidden(el) {
	el.setAttribute("aria-hidden", "true");
}

function setExpanded(el, expanded) {
	el.setAttribute("aria-expanded", expanded ? "true" : "false");
}

var idCounter = 0;
// Get a node's id. If it doesn't have one, make and set one first.
function setAriaIdIfNecessary(elem) {
	if (!elem.id) {
		elem.setAttribute("id", "axsg-" + idCounter++);
	}
	return elem.id;
}

function makeElementOwn(parentElement, listOfNodes) {
	ids = [];
	for (let node of listOfNodes) {
		ids.push(setAriaIdIfNecessary(node));
	}
	parentElement.setAttribute("aria-owns", ids.join(" "));
}

// Focus something even if it wasn't made focusable by the author.
function forceFocus(el) {
	let focusable = el.hasAttribute("tabindex");
	if (focusable) {
		el.focus();
		return;
	}
	el.setAttribute("tabindex", "-1");
	el.focus();
}

/*** Code to apply the tweaks when appropriate. ***/

function applyTweak(el, tweak) {
	if (Array.isArray(tweak.tweak)) {
		let [func, ...args] = tweak.tweak;
		func(el, ...args);
	} else {
		tweak.tweak(el);
	}
}

function applyTweaks(root, tweaks, checkRoot, forAttrChange = false) {
	for (let tweak of tweaks) {
		if (!forAttrChange || tweak.whenAttrChangedOnAncestor !== false) {
			for (let el of root.querySelectorAll(tweak.selector)) {
				try {
					applyTweak(el, tweak);
				} catch (e) {
					console.log("Exception while applying tweak for '" + tweak.selector + "': " + e);
				}
			}
		}
		if (checkRoot && root.matches(tweak.selector)) {
			try {
				applyTweak(root, tweak);
			} catch (e) {
				console.log("Exception while applying tweak for '" + tweak.selector + "': " + e);
			}
		}
	}
}

let observer = new MutationObserver(function (mutations) {
	for (let mutation of mutations) {
		try {
			if (mutation.type === "childList") {
				for (let node of mutation.addedNodes) {
					if (node.nodeType != Node.ELEMENT_NODE) {
						continue;
					}
					applyTweaks(node, DYNAMIC_TWEAKS, true);
				}
			} else if (mutation.type === "attributes") {
				applyTweaks(mutation.target, DYNAMIC_TWEAKS, true, true);
			}
		} catch (e) {
			// Catch exceptions for individual mutations so other mutations are still handled.
			console.log("Exception while handling mutation: " + e);
		}
	}
});

function init() {
	applyTweaks(document, LOAD_TWEAKS, false);
	applyTweaks(document, DYNAMIC_TWEAKS, false);
	options = { childList: true, subtree: true };
	if (DYNAMIC_TWEAK_ATTRIBS.length > 0) {
		options.attributes = true;
		options.attributeFilter = DYNAMIC_TWEAK_ATTRIBS;
	}
	observer.observe(document, options);
}

/*** Define the actual tweaks. ***/

// Tweaks that only need to be applied on load.
const LOAD_TWEAKS = [
];

// Attributes that should be watched for changes and cause dynamic tweaks to be
// applied.
const DYNAMIC_TWEAK_ATTRIBS = ['style', 'class', '_mstaria-label'];

// Tweaks that must be applied whenever an element is added/changed.
const DYNAMIC_TWEAKS = [
	{selector: '#btn_nakaji',
		tweak: e => {
			document.addEventListener('keydown', (event) => {
				event = event || window.event;
				let keycode = event.keycode || event.which;
				if (keycode == 86 && event.altKey) e.click();
			}
			, false);
		},
	},
	{selector: 'div[style^="font-size: 13px; position: absolute; text-align: center; left: "]',
		tweak: makeHidden},
	{selector: 'div[style*="position: absolute; left: 13px; top: 13px; background-color: green; width: 394px; height: 394px;"]',
		tweak: [makeRegion, '오델로 보드']},
	{selector: '#pane_game_board',
		tweak: [makeRegion, '오델로 보드']},
	{selector: '.zahyox',
		tweak: makeHidden},
	{selector: '.zahyoy',
		tweak: makeHidden},
	{selector: 'div[style^="position: absolute; font-size: 20px"]',
		tweak: e => {
			e.setAttribute('role', 'img');
						e.setAttribute('aria-roledescription', '버튼');
let nextElem = e.nextElementSibling;
			let color = '빈칸';
			nextElem.setAttribute('aria-hidden', 'true');
			let previousElem1 = e.previousElementSibling;
			previousElem1.setAttribute('aria-hidden', 'true');
			if (previousElem1.style.display === 'block') color = '백';
			else {
				let previousElem2 = previousElem1.previousElementSibling;
				previousElem2.setAttribute('aria-hidden', 'true');
				if (previousElem2.style.display === 'block') color = '흑';
			}
			let stoneNumber = (Number([].slice.call(e.parentNode.children).indexOf(e)) / 4) - 5;
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			let coord = colNumber + rowNumber;
			if (e.getAttribute('data-axS-empty-cell') === 'true') {
				if (color !== '빈칸') announce(color + ' ' + coord + '에 착수함', 'axS-announce-new-stone');
			}
			else if (e.getAttribute('data-axS-empty-cell') === 'false') {
				if (color === '빈칸') announce(coord + ' 착수 취소됨', 'axS-announce-new-stone');
			}
			e.setAttribute('data-axS-empty-cell', (color === '빈칸' ? 'true' : 'false'));
			if (e.innerHTML === '') {
				e.setAttribute('aria-description', coord);
				e.removeAttribute('aria-labelledby');
				e.setAttribute('aria-label', color);
			}
			else {
				e.setAttribute('aria-description', color + ', ' + coord);
				e.removeAttribute('aria-label');
			e.id = coord + '-cell_1';
			nextElem.id = coord + '-cell_2';
				e.setAttribute('aria-labelledby', e.id + ' ' + nextElem.id);
			}
		},
	},
	{selector: '.d0',
		tweak: e => {
			e.setAttribute('role', 'img');
			e.setAttribute('aria-roledescription', '버튼');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = siblings.length < 128 ? 0 : siblings.length < 192 ? (siblings.indexOf(e) - 18) / 2 : (siblings.indexOf(e) - 1) / 3;
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-label', '빈칸, ' + colNumber + rowNumber);
			if (e.getAttribute('data-axS-empty-cell') === 'false') announce(colNumber + rowNumber + ' 착수 취소됨', 'axS-announce-new-stone');
			e.setAttribute('data-axS-empty-cell', 'true');
		},
	},
	{selector: '.d1',
		tweak: e => {
			e.setAttribute('role', 'img');
			e.setAttribute('aria-roledescription', '버튼');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = siblings.length < 128 ? 0 : siblings.length < 192 ? (siblings.indexOf(e) - 18) / 2 : (siblings.indexOf(e) - 1) / 3;
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-label', '흑, ' + colNumber + rowNumber);
			if (e.getAttribute('data-axS-empty-cell') === 'true') announce('흑 ' + colNumber + rowNumber + '에 착수함', 'axS-announce-new-stone');
			e.setAttribute('data-axS-empty-cell', 'false');
		},
	},
	{selector: '.d2',
		tweak: e => {
			e.setAttribute('role', 'img');
			e.setAttribute('aria-roledescription', '버튼');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = siblings.length < 128 ? 0 : siblings.length < 192 ? (siblings.indexOf(e) - 18) / 2 : (siblings.indexOf(e) - 1) / 3;
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-label', '백, ' + colNumber + rowNumber);
			if (e.getAttribute('data-axS-empty-cell') === 'true') announce('백 ' + colNumber + rowNumber + '에 착수함', 'axS-announce-new-stone');
			e.setAttribute('data-axS-empty-cell', 'false');
		},
	},
];

/** add your specific initialization here, so that if you ever update the framework from new skeleton your inits are not overridden. */
function userInit(){}

/*** Lights, camera, action! ***/
init();
userInit();
