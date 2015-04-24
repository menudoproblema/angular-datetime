"use strict";

angular.module("datetime", []);

angular.module("datetime").factory("datetime", function($locale){
	// Fetch date and time formats from $locale service
	var formats = $locale.DATETIME_FORMATS;
	// Valid format tokens. 1=sss, 2=''
	var tokenRE = /yyyy|yy|y|M{1,4}|dd?|EEEE?|HH?|hh?|mm?|ss?|([.,])sss|a|Z|ww|w|'(([^']+|'')*)'/g;
	// Token definition
	var definedTokens = {
		"y": {
			minLength: 1,
			maxLength: 4,
			min: 1,
			max: 9999,
			name: "year",
			type: "number"
		},
		"yy": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 99,
			name: "year",
			type: "number"
		},
		"yyyy": {
			minLength: 4,
			maxLength: 4,
			min: 1,
			max: 9999,
			name: "year",
			type: "number"
		},
		"MMMM": {
			name: "month",
			type: "select",
			select: formats.MONTH
		},
		"MMM": {
			name: "month",
			type: "select",
			select: formats.SHORTMONTH
		},
		"MM": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "month",
			type: "number"
		},
		"M": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "month",
			type: "number"
		},
		"dd": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 31,
			name: "date",
			type: "number"
		},
		"d": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 31,
			name: "date",
			type: "number"
		},
		"EEEE": {
			name: "day",
			type: "select",
			select: fixDay(formats.DAY)
		},
		"EEE": {
			name: "day",
			type: "select",
			select: fixDay(formats.SHORTDAY)
		},
		"HH": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 23,
			name: "hour",
			type: "number"
		},
		"H": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 23,
			name: "hour",
			type: "number"
		},
		"hh": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "hour12",
			type: "number"
		},
		"h": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "hour12",
			type: "number"
		},
		"mm": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "minute",
			type: "number"
		},
		"m": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "minute",
			type: "number"
		},
		"ss": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "second",
			type: "number"
		},
		"s": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "second",
			type: "number"
		},
		"milliPrefix": {
			name: "milliPrefix",
			type: "regex",
			regex: /[,.]/
		},
		"sss": {
			minLength: 3,
			maxLength: 3,
			min: 0,
			max: 999,
			name: "millisecond",
			type: "number"
		},
		"a": {
			name: "ampm",
			type: "select",
			select: formats.AMPMS
		},
		"ww": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 53,
			name: "week",
			type: "number"
		},
		"w": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 53,
			name: "week",
			type: "number"
		},
		"Z": {
			name: "timezone",
			type: "regex",
			regex: /[+-]\d{4}/
		},
		"string": {
			name: "string",
			type: "static"
		}
	};

	// Push Sunday to the end
	function fixDay(days) {
		var s = [], i;
		for (i = 1; i < days.length; i++) {
			s.push(days[i]);
		}
		s.push(days[0]);
//		console.log(s);
		return s;
	}

	// Use localizable formats
	function getFormat(format) {
		return formats[format] || format;
	}

	function createNode(token, value) {
		return {
			token: definedTokens[token],
			value: value,
			viewValue: value || "",
			offset: 0
		};
	}

	// Parse format to nodes
	function createNodes(format) {
		var nodes = [],
			pos = 0,
			match;

		while (true) {
			match = tokenRE.exec(format);

			if (!match) {
				if (pos < format.length) {
					nodes.push(createNode("string", format.substring(pos)));
				}
				break;
			}

			if (match.index > pos) {
				nodes.push(createNode("string", format.substring(pos, match.index)));
				pos = match.index;
			}

			if (match.index == pos) {
				if (match[1]) {
					nodes.push(createNode("string", match[1]));
					nodes.push(createNode("sss"));
				} else if (match[2]) {
					nodes.push(createNode("string", match[2].replace("''", "'")));
				} else {
					nodes.push(createNode(match[0]));
				}
				pos = tokenRE.lastIndex;
			}
		}

		// Build relationship between nodes
		var i;
		for (i = 0; i < nodes.length; i++) {
			nodes[i].next = nodes[i + 1] || null;
			nodes[i].prev = nodes[i - 1] || null;
			nodes[i].id = i;
		}

		return nodes;
	}

	function getInteger(str, pos) {
		str = str.substring(pos);
		var match = str.match(/^\d+/);
		return match && match[0];
	}

	function getMatch(str, pos, pattern) {
		var i = 0,
			strQ = str.toUpperCase(),
			patternQ = pattern.toUpperCase();

		while (strQ[pos + i] && strQ[pos + i] == patternQ[i]) {
			i++;
		}

		return str.substr(pos, i);
	}

	function getWeek(date) {
		var yearStart = new Date(date.getFullYear(), 0, 1);

		var weekStart = new Date(yearStart.getTime());

		if (weekStart.getDay() > 4) {
			weekStart.setDate(weekStart.getDate() + (1 - weekStart.getDay()) + 7);
		} else {
			weekStart.setDate(weekStart.getDate() + (1 - weekStart.getDay()));
		}
		var diff = date.getTime() - weekStart.getTime();

		return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
	}

	function num2str(num, minLength, maxLength) {
		var i;
		num = "" + num;
		if (num.length > maxLength) {
			num = num.substr(num.length - maxLength);
		} else if (num.length < minLength) {
			for (i = num.length; i < minLength; i++) {
				num = "0" + num;
			}
		}
		return num;
	}

	function setText(node, date, token) {
		switch (token.name) {
			case "year":
				node.value = date.getFullYear();
				break;
			case "month":
				node.value = date.getMonth() + 1;
				break;
			case "date":
				node.value = date.getDate();
				break;
			case "day":
				node.value = date.getDay() || 7;
				break;
			case "hour":
				node.value = date.getHours();
				break;
			case "hour12":
				node.value = date.getHours() % 12 || 12;
				break;
			case "ampm":
				node.value = date.getHours() < 12 ? 1 : 2;
				break;
			case "minute":
				node.value = date.getMinutes();
				break;
			case "second":
				node.value = date.getSeconds();
				break;
			case "millisecond":
				node.value = date.getMilliseconds();
				break;
			case "week":
				node.value = getWeek(date);
				break;
		}

		if (node.value < 0) {
			node.value = 0;
		}

		switch (token.type) {
			case "number":
				node.viewValue = num2str(node.value, token.minLength, token.maxLength);
				break;
			case "select":
				node.viewValue = token.select[node.value - 1];
				break;
			default:
				node.viewValue = node.value + "";
		}
	}

	function setDate(date, value, token) {
		var h;

		switch (token.name) {
			case "year":
				date.setFullYear(value);
				break;
			case "month":
				date.setMonth(value - 1);
				break;
			case "date":
				date.setDate(value);
				break;
			case "day":
				date.setDate(date.getDate() + (value - (date.getDay() || 7)));
				break;
			case "hour":
				date.setHours(value);
				break;
			case "hour12":
				date.setHours((date.getHours() < 12 ? 0 : 1) * 12 + value % 12);
				break;
			case "ampm":
				h = date.getHours();
				if ((h < 12) == (value == 2)) {
					date.setHours((h + 12) % 24);
				}
				break;
			case "minute":
				date.setMinutes(value);
				break;
			case "second":
				date.setSeconds(value);
				break;
			case "millisecond":
				date.setMilliseconds(value);
				break;
			case "week":
				date.setDate(date.getDate() + (value - getWeek(date)) * 7);
				break;
		}

		if (date.getFullYear() < 0) {
			date.setFullYear(0);
		}
	}

	// Re-calculate offset
	function calcOffset(nodes) {
		var i, offset = 0;
		for (i = 0; i < nodes.length; i++) {
			nodes[i].offset = offset;
			offset += nodes[i].viewValue.length;
		}
	}

	function parseNode(node, text, pos) {
		var p = node, m, match, value, j;
		switch (p.token.type) {
			case "static":
				if (text.lastIndexOf(p.value, pos) != pos) {
					throw {
						code: "TEXT_MISMATCH",
						message: 'Pattern value mismatch',
						text: text,
						node: p,
						pos: pos
					};
				}
				break;

			case "number":
				// Fail when meeting .sss
				value = getInteger(text, pos);
				if (value == null) {
					throw {
						code: "NUMBER_MISMATCH",
						message: "Invalid number",
						text: text,
						node: p,
						pos: pos
					};
				}
				if (value.length < p.token.minLength) {
					throw {
						code: "NUMBER_TOOSHORT",
						message: "The length of number is too short",
						text: text,
						node: p,
						pos: pos,
						match: value
					};
				}

				if (value.length > p.token.maxLength) {
					value = value.substr(0, p.token.maxLength);
				}

				p.value = +value;
				p.viewValue = value;
				break;

			case "select":
				match = "";
				for (j = 0; j < p.token.select.length; j++) {
					m = getMatch(text, pos, p.token.select[j]);
					if (m && m.length > match.length) {
						value = j;
						match = m;
					}
				}
				if (!match) {
					throw {
						code: "SELECT_MISMATCH",
						message: "Invalid select",
						text: text,
						node: p,
						pos: pos
					};
				}

				if (match != p.token.select[value]) {
					throw {
						code: "SELECT_INCOMPLETE",
						message: "Incomplete select",
						text: text,
						node: p,
						pos: pos,
						match: match,
						selected: p.token.select[value]
					};
				}

				p.value = value + 1;
				p.viewValue = match;
				break;

			case "regex":
				m = p.regex.exec(text.substr(pos));
				if (!m || m.index != 0) {
					throw {
						code: "REGEX_MISMATCH",
						message: "Regex doesn't match",
						text: text,
						node: p,
						pos: pos
					};
				}
				p.value = m[0];
				p.viewValue = m[0];
				break;
		}
	}

	// Main parsing loop. Loop through nodes, parse text, update date model.
	function parseLoop(nodes, text, date) {
		var i, pos, errorBuff;

		pos = 0;

		for (i = 0; i < nodes.length; i++) {
			try {
				parseNode(nodes[i], text, pos);
				setDate(date, nodes[i].value, nodes[i].token);
				pos += nodes[i].viewValue.length;
			} catch (err) {
				if (err.code == "NUMBER_TOOSHORT") {
					errorBuff = err;
					pos += err.match.length;
				} else {
					throw err;
				}
			}
		}

		if (text.length > pos) {
			throw {
				code: "TEXT_TOOLONG",
				message: "Text is too long",
				text: text,
				pos: pos
			};
		}

		if (errorBuff) {
			throw errorBuff;
		}
	}

	function createParser(format) {

		format = getFormat(format);

		var nodes = createNodes(format);

		var parser = {
			parse: function(text) {
				var date = new Date(parser.date.getTime());
				try {
					parseLoop(parser.nodes, text, date);
				} catch (err) {
					// Should we reset date object if failed to parse?
					parser.setDate(parser.date);
					throw err;
				}
				parser.setDate(date);
				return parser;
			},
			parseNode: function(node, text) {
				var date = new Date(parser.date.getTime());
				try {
					parseNode(node, text, 0);
				} catch (err) {
					parser.setDate(parser.date);
					throw err;
				}
				setDate(date, node.value, node.token);
				parser.setDate(date);
				return parser;
			},
			setDate: function(date){
				parser.date = date;

				var i, node;
				for (i = 0; i < parser.nodes.length; i++) {
					node = parser.nodes[i];

					setText(node, date, node.token);
				}
				calcOffset(parser.nodes);
				return parser;
			},
			getDate: function(){
				return parser.date;
			},
			getText: function(){
				var i, text = "";
				for (i = 0; i < parser.nodes.length; i++) {
					text += parser.nodes[i].viewValue;
				}
				return text;
			},
			date: null,
			format: format,
			nodes: nodes,
			error: null
		};

		return parser;
	}

	return createParser;
});

angular.module("datetime").directive("datetime", function(datetime, $log){

	function getInputSelectionIE(input) {
		var bookmark = document.selection.createRange().getBookmark();
		var range = input.createTextRange();
		var range2 = range.duplicate();

		range.moveToBookmark(bookmark);
		range2.setEndPoint("EndToStart", range);

		var start = range2.text.length;
		var end = start + range.text.length;
		return {
			start: start,
			end: end
		};
	}

	function getInputSelection(input) {
		input = input[0];

		if (input.selectionStart != undefined && input.selectionEnd != undefined) {
			return {
				start: input.selectionStart,
				end: input.selectionEnd
			};
		}

		if (document.selection) {
			return getInputSelectionIE(input);
		}
	}

	function getInitialNode(nodes) {
		return getNode(nodes[0]);
	}

	function setInputSelectionIE(input, range) {
		var select = input.createTextRange();
		select.moveStart("character", range.start);
		select.collapse();
		select.moveEnd("character", range.end - range.start);
		select.select();
	}

	function setInputSelection(input, range) {
		input = input[0];

		if (input.setSelectionRange) {
			input.setSelectionRange(range.start, range.end);
		} else if (input.createTextRange) {
			setInputSelectionIE(input, range);
		}
	}

	function getNode(node, direction) {
		if (!direction) {
			direction = "next";
		}
		while (node && (node.token.type == "static" || node.token.type == "regex")) {
			node = node[direction];
		}
		return node;
	}

	function addDate(date, token, diff) {
		switch (token.name) {
			case "year":
				date.setFullYear(date.getFullYear() + diff);
				break;
			case "month":
				date.setMonth(date.getMonth() + diff);
				break;
			case "date":
			case "day":
				date.setDate(date.getDate() + diff);
				break;
			case "hour":
			case "hour12":
				date.setHours(date.getHours() + diff);
				break;
			case "ampm":
				date.setHours(date.getHours() + diff * 12);
				break;
			case "minute":
				date.setMinutes(date.getMinutes() + diff);
				break;
			case "second":
				date.setSeconds(date.getSeconds() + diff);
				break;
			case "millisecond":
				date.setMilliseconds(date.getMilliseconds() + diff);
				break;
			case "week":
				date.setDate(date.getDate() + diff * 7);
				break;
		}
	}

	function getLastNode(node, direction) {
		var lastNode;

		do {
			lastNode = node;
			node = getNode(node[direction], direction);
		} while (node);

		return lastNode;
	}

	function selectRange(range, direction, toEnd) {
		if (!range.node) {
			return;
		}
		if (direction) {
			range.start = 0;
			range.end = "end";
			if (toEnd) {
				range.node = getLastNode(range.node, direction);
			} else {
				range.node = getNode(range.node[direction], direction) || range.node;
			}
		}
		setInputSelection(range.element, {
			start: range.start + range.node.offset,
			end: range.end == "end" ? range.node.offset + range.node.viewValue.length :
				range.end + range.node.offset
		});
	}

	function isStatic(node) {
		return node.token.type == "static" || node.token.type == "regex";
	}

	function closerNode(range, next, prev) {
		var offset = range.node.offset + range.start,
			disNext = next.offset - offset,
			disPrev = offset - (prev.offset + prev.viewValue.length);

		return disNext <= disPrev ? next : prev;
	}

	function createRange(element, nodes) {
		var prev, next, range;

		range = getRange(element, nodes);

		if (isStatic(range.node)) {
			next = getNode(range.node, "next");
			prev = getNode(range.node, "prev");

			if (!next && !prev) {
				range.node = nodes[0];
				range.end = 0;
			} else if (!next || !prev) {
				range.node = next || prev;
			} else {
				range.node = closerNode(range, next, prev);
			}
		}

		range.start = 0;
		range.end = "end";

		return range;
	}

	function getRange(element, nodes, node) {
		var selection = getInputSelection(element), i, range;
		for (i = 0; i < nodes.length; i++) {
			if (!range && nodes[i].offset + nodes[i].viewValue.length >= selection.start || i == nodes.length - 1) {
				range = {
					element: element,
					node: nodes[i],
					start: selection.start - nodes[i].offset,
					end: selection.start - nodes[i].offset
				};
				break;
			}
		}

		if (node && range.node.next == node && range.start + range.node.offset == range.node.next.offset) {
			range.node = range.node.next;
			range.start = range.end = 0;
		}

		return range;
	}

	function isRangeCollapse(range) {
		return range.start == range.end ||
			range.start == range.node.viewValue.length && range.end == "end";
	}

	function isRangeAtEnd(range) {
		var maxLength, length;
		if (!isRangeCollapse(range)) {
			return false;
		}
		maxLength = range.node.token.maxLength;
		length = range.node.viewValue.length;
		if (maxLength && length < maxLength) {
			return false;
		}
		return range.start == length;
	}

	function isNumberKey(e) {
		var keyCode = e.charCode || e.keyCode;
		return keyCode >= 48 && keyCode <= 57;
	}

	function linkFunc(scope, element, attrs, ngModel) {
		var parser = datetime(attrs.datetime),	// Create the parser
			range = {
				element: element,
				node: getInitialNode(parser.nodes),
				start: 0,
				end: "end"
			},
			errorRange = {
				element: element,
				node: null,
				start: 0,
				end: 0
			};

		ngModel.$render = function(){
			element.val(ngModel.$viewValue);
			if (document.activeElement == element[0]) {
				selectRange(range);
			}
		};

		ngModel.$parsers.push(function(viewValue){
			if (!parser) {
				return undefined;
			}
			try {
				parser.parse(viewValue);
			} catch (err) {
				$log.error(err);

				ngModel.$setValidity("datetime", false);

				if (err.code == "NUMBER_TOOSHORT") {
					errorRange.node = err.node;
					errorRange.start = 0;
					errorRange.end = err.match.length;
				} else {
					range = getRange(element, parser.nodes, range.node);
					range.end = "end";
					if (err.code == "SELECT_INCOMPLETE") {
						parser.parseNode(range.node, err.selected);
						range.start = err.match.length;
					} else {
						range.start = 0;
					}
					scope.$evalAsync(function(){
						viewValue = parser.getText();
						if (viewValue == ngModel.$viewValue) {
							throw "angular-datetime crashed!";
						}
						ngModel.$setViewValue(viewValue);
						ngModel.$render();
					});
				}

				return undefined;
			}

			ngModel.$setValidity("datetime", true);
			// Create new date to make Angular notice the difference.
			return new Date(parser.getDate().getTime());
		});

		ngModel.$formatters.push(function(modelValue){
			if (!modelValue) {
				ngModel.$setValidity("datetime", false);
				return undefined;
			}
			ngModel.$setValidity("datetime", true);
			parser.setDate(modelValue);
			return parser.getText();
		});

		function addNodeValue(node, diff) {
			var date, viewValue;

			date = new Date(parser.date.getTime());
			addDate(date, node.token, diff);
			parser.setDate(date);
			viewValue = parser.getText();
			ngModel.$setViewValue(viewValue);

			range.start = 0;
			range.end = "end";
			ngModel.$render();

			scope.$apply();
		}

		var waitForClick;
		element.on("focus keydown keypress mousedown click", function(e){
			switch (e.type) {
				case "mousedown":
					waitForClick = true;
					break;
				case "focus":
					e.preventDefault();
					if (!waitForClick) {
						setTimeout(function(){
							if (!ngModel.$error.datetime) {
								selectRange(range);
							} else {
								selectRange(errorRange);
							}
						});
					}
					break;
				case "keydown":
					switch (e.keyCode) {
						case 37:
							// Left
							e.preventDefault();
							if (!ngModel.$error.datetime) {
								selectRange(range, "prev");
							} else {
								selectRange(errorRange);
							}
							break;
						case 39:
							// Right
							e.preventDefault();
							if (!ngModel.$error.datetime) {
								selectRange(range, "next");
							} else {
								selectRange(errorRange);
							}
							break;
						case 38:
							// Up
							e.preventDefault();
							addNodeValue(range.node, 1);
							break;
						case 40:
							// Down
							e.preventDefault();
							addNodeValue(range.node, -1);
							break;
						case 36:
							// Home
							e.preventDefault();
							if (ngModel.$error.datetime) {
								selectRange(errorRange);
							} else {
								selectRange(range, "prev", true);
							}
							break;
						case 35:
							// End
							e.preventDefault();
							if (ngModel.$error.datetime) {
								selectRange(errorRange);
							} else {
								selectRange(range, "next", true);
							}
							break;
					}
					break;

				case "click":
					e.preventDefault();
					waitForClick = false;
					if (!ngModel.$error.datetime) {
						range = createRange(element, parser.nodes);
						selectRange(range);
					} else {
						selectRange(errorRange);
					}
					break;

				case "keypress":
					if (isNumberKey(e)) {
						setTimeout(function(){
							range = getRange(element, parser.nodes, range.node);
							if (isRangeAtEnd(range)) {
								range.node = getNode(range.node.next) || range.node;
								range.start = 0;
								range.end = "end";
								selectRange(range);
							}
						});
					}
					break;

			}
		});

	}

	return {
		restrict: "A",
		require: "?ngModel",
		link: linkFunc
	};
});
