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

	function selectNode(input, node, direction) {
		if (!node) {
			return;
		}
		if (direction) {
			node = getNode(node[direction], direction) || node;
		}
//		console.log(node);
		setInputSelection(input, {
			start: node.offset,
			end: node.offset + node.viewValue.length
		});
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

	function selectRange(range, direction) {
		if (!range.node) {
			return;
		}
		if (direction) {
			range.start = 0;
			range.end = "end";
			range.node = getNode(range.node[direction], direction) || range.node;
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
			if (!range && nodes[i].offset + nodes[i].viewValue.length >= selection.start) {
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
//		console.log(range);
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

	function linkFunc(scope, element, attrs, ngModel) {
		var parser = datetime(attrs.datetime),	// Create the parser
			range = {
				element: element,
				node: getInitialNode(parser.nodes),
				start: 0,
				end: "end"
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

				if (err.code != "NUMBER_TOOSHORT") {
					range = getRange(element, parser.nodes, range.node);
					range.end = "end";
					if (err.code == "SELECT_INCOMPLETE") {
						parser.parseNode(range.node, err.selected);
						range.start = err.match.length;
					} else {
						range.start = 0;
					}

					//				console.log(range);
					scope.$evalAsync(function(){
						viewValue = parser.getText();
						ngModel.$setViewValue(viewValue);
						ngModel.$render();
						//					scope.$apply();
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
			ngModel.$render();
			scope.$apply();
			setTimeout(function(){
				selectNode(node);
			});
		}

		element.on("focus keydown click", function(e){
			switch (e.type) {
				case "focus":
					range = createRange(element, parser.nodes);
					setTimeout(function(){
						selectRange(range);
					});
					break;
				case "keydown":

					switch (e.keyCode) {
						case 37:
							// Left
							e.preventDefault();

							selectRange(range, "prev");
							break;
						case 39:
							// Right
							e.preventDefault();
							selectRange(range, "next");
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
						default:
							setTimeout(function(){
								var rangeQ;
								rangeQ = getRange(element, parser.nodes, range.node);
								if (isRangeAtEnd(rangeQ)) {
									rangeQ.node = getNode(rangeQ.node.next) || rangeQ.node;
									rangeQ.start = 0;
									rangeQ.end = "end";
									range = rangeQ;
									selectRange(range);
								}
							});
					}
					break;

				case "click":
					range = createRange(element, parser.nodes);
					selectRange(range);
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