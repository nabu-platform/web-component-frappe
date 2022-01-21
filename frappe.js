// distribution from: https://cdn.jsdelivr.net/npm/frappe-charts@1.5.3/dist/

window.addEventListener("load", function () {
	// check out: https://frappe.io/charts/docs
	var frappeChartGenerator = function(name) {
		return Vue.component(name, {
			template: "#" + name,
			mixins: [nabu.page.views.data.DataCommon],
			props: {
				page: {
					type: Object,
					required: true
				},
				parameters: {
					type: Object,
					required: false
				},
				cell: {
					type: Object,
					required: true
				},
				edit: {
					type: Boolean,
					required: true
				}
			},
			computed: {
				hasBar: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "bar";
					}).length >= 1;
				},
				hasMultipleBars: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "bar";
					}).length >= 2;
				},
				hasLines: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "line";
					}).length >= 1;
				},
				type: function() {
					return !this.cell.state.type ? "mixed" : this.cell.state.type;
				}
			},
			data: function() {
				return {
					configuring: false,
					modifyingInternally: false,
					chart: null
				}
			},
			beforeDestroy: function() {
				this.$services.page.destroy(this);
			},
			created: function() {
				this.create();
				if (!this.cell.state.bindings) {
					Vue.set(this.cell.state, "bindings", {});
				}
				if (!this.cell.state.datasets) {
					Vue.set(this.cell.state, "datasets", []);
				}
				if (!this.cell.state.labelFormat) {
					Vue.set(this.cell.state, "labelFormat", {});
				}
				if (!this.cell.state.popupLabelFormat) {
					Vue.set(this.cell.state, "popupLabelFormat", {});
				}
			},
			activate: function(done) {
				var self = this;
				this.activate(function() {
					done();
				}, done);
			},
			ready: function() {
				this.draw();
			},
			methods: {
				getRecordLabel: function(record) {
					var label = null;
					var self = this;
					if (this.cell.state.labelField) {
						var label = self.$services.page.getValue(record, self.cell.state.labelField);
						if (self.cell.state.labelFormat) {
							// want to add the state
							var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
							cloned.state = record;
							cloned.$value = self.$value;
							label = self.$services.formatter.format(label, cloned);
						}
					}
					return label;
				},
				getRecordValue: function(record, dataset) {
					var self = this;
					var value = self.$services.page.getValue(record, dataset.value);
					if (dataset.valueFormat) {
						var formatty = nabu.utils.objects.clone(dataset.valueFormat);
						formatty.state = record;
						value = self.$services.formatter.format(value, formatty);
					}
					return value == null ? 0 : value;
				},
				pushUpdate: function(record, newData) {
					var datasets = [];
					var self = this;
					nabu.utils.arrays.merge(datasets, this.cell.state.datasets);
					// we want to draw bar charts first, otherwise they provide an offset for the line charts (check out frappe documentation)
					datasets.sort(function(a, b) {
						if (a.type == "bar" && b.type != "bar") {
							return -1;
						}
						else if (b.type == "bar" && a.type != "bar") {
							return 1;
						}
						return 0;
					});
					var values = datasets.map(function(x) {
						return self.getRecordValue(newData, x);
					});
					var index = this.records.indexOf(record);
					for (var i = 0; i < values.length; i++) {
						self.chart.data.datasets[i].values[index] = values[i];
					}
					self.chart.update(self.chart.data);
					/*self.chart.update({
						labels: self.chart.data.labels,
						datasets: self.chart.data.datasets,
						yMarkers: self.chart.data.yMarkers,
						yRegions: self.chart.data.yRegions
					});*/ 
				},
				pushDelete: function(data, index) {
					this.chart.removeDataPoint(index);
				},
				pushCreate: function(record) {
					var label = this.getRecordLabel(record);
					var self = this;
					if (this.cell.state.datasets && this.cell.state.datasets.length) {
						var datasets = [];
						nabu.utils.arrays.merge(datasets, this.cell.state.datasets);
						// we want to draw bar charts first, otherwise they provide an offset for the line charts (check out frappe documentation)
						datasets.sort(function(a, b) {
							if (a.type == "bar" && b.type != "bar") {
								return -1;
							}
							else if (b.type == "bar" && a.type != "bar") {
								return 1;
							}
							return 0;
						});
						var values = datasets.map(function(x) {
							return self.getRecordValue(record, x);
						});
						self.chart.addDataPoint(label, values);
					}
					self.modifyingInternally = true;
					self.records.push(record);
				},
				configurator: function() {
					return "frappe-chart-configure";
				},
				getKeys: function(name) {
					return this.keys.filter(function(x) {
						return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
					});
					var keys = this.cell.state.operation ? this.$services.page.getSimpleKeysFor({properties:this.$services.data.getDefinition(this.cell.state.operation)}) : [];
					if (name) {
						keys = keys.filter(function(x) { return x.toLowerCase().indexOf(name.toLowerCase()) >= 0 });
					}
					return keys;
				},
				execute: function() {
					var promise = this.$services.q.defer();
					var self = this;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					try {
						if (this.cell.state.operation) {
							// any input parameters
							var parameters = {};
							if (this.cell.bindings) {
								Object.keys(this.cell.bindings).forEach(function(key) {
									if (self.cell.bindings[key]) {
										parameters[key] = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[key], self);
									}
								});
							}
							this.$services.data.execute(this.cell.state.operation, parameters).then(function(result) {
								if (result) {
									if (!(result instanceof Array)) {
										Object.keys(result).forEach(function(x) {
											if (result[x] instanceof Array) {
												result = result[x];
											}
										});
									}
									if (result instanceof Array) {
										nabu.utils.arrays.merge(self.records, result);
										promise.resolve(result);
									}
								}
							}, promise);
						}
						else {
							promise.resolve();
						}
					}
					catch (exception) {
						console.error("Could not run operation", exception);
						promise.reject();
					}
					return promise;
				},
				addYMarker: function() {
					if (!this.cell.state.yMarkers) {
						Vue.set(this.cell.state, "yMarkers", []);
					}	
					this.cell.state.yMarkers.push({name: null, from: null, to: null, labelPosition: "left"});
				},
				draw: function() {
					var self = this;
					if (this.records.length && this.$refs.chart) {
						var parameters = {
							type: this.type == "mixed" ? "axis-mixed" : this.type,
							data: {
								datasets: []
							},
							colors: [],
							tooltipOptions: {
								formatTooltipX: function(d) {
									// useless without the index...
									// if we use advanced mode, we use the post processing
									if (self.cell.state.popupLabelFormatAdvanced) {
										return "";
									}
									if (self.cell.state.popupLabelFormat) {
										var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
										cloned.state = null;
										cloned.$value = self.$value;
										d = self.$services.formatter.format(d, cloned);
									}
									return d;
								},
								formatTooltipY: function(d) {
									// we have a float, round it
									if (typeof(d) == "number" && parseInt(d) != d) {
										return self.$services.formatter.number(d, 2);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9]+$/)) {
										return parseInt(d);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9.]+$/)) {
										return parseFloat(d);
									}
									return d;
								}
							},
							barOptions: {},
							lineOptions: {},
							axisOptions: {}
						};
						if (self.cell.state.minimumYValue != null && self.cell.state.minimumYValue != "") {
							parameters.data.yMarkers = [{
								label: "",
								value: parseFloat(self.cell.state.minimumYValue)
							}];
							// also has yRegions
						}
						if (self.cell.state.yMarkers && self.cell.state.yMarkers.length) {
							self.cell.state.yMarkers.forEach(function(x) {
								var yMarker = {};
								yMarker.label = x.name ? self.$services.page.translate(self.$services.page.interpret(x.name, self)) : null;
								yMarker.options = {
									labelPos: x.labelPosition ? x.labelPosition : "left"
								};
								if (x.to == null || x.to == "") {
									yMarker.value = x.from == null ? 0 : self.$services.page.interpret(x.from, self);
									if (!parameters.data.yMarkers) {
										parameters.data.yMarkers = [];
									}
									parameters.data.yMarkers.push(yMarker);
								}
								else {
									yMarker.start = x.from == null ? 0 : self.$services.page.interpret(x.from, self);
									yMarker.end = x.to == null ? 0 : self.$services.page.interpret(x.to, self);
									if (!parameters.data.yRegions) {
										parameters.data.yRegions = [];
									}
									parameters.data.yRegions.push(yMarker);
								}
							});
						}
						if (self.cell.state.title) {
							// we now do the title in data common
							//parameters.title = this.$services.page.translate(self.cell.state.title);
						}
						// if we have a label field, use that
						if (this.cell.state.labelField) {
							parameters.data.labels = this.records.map(function(x) {
								var value = self.$services.page.getValue(x, self.cell.state.labelField);
								if (self.cell.state.labelFormat) {
									// want to add the state
									var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
									cloned.state = x;
									cloned.$value = self.$value;
									value = self.$services.formatter.format(value, cloned);
								}
								return value;
							});
						}
						if (this.cell.state.datasets && this.cell.state.datasets.length) {
							var datasets = [];
							nabu.utils.arrays.merge(datasets, this.cell.state.datasets);
							// we want to draw bar charts first, otherwise they provide an offset for the line charts (check out frappe documentation)
							datasets.sort(function(a, b) {
								if (a.type == "bar" && b.type != "bar") {
									return -1;
								}
								else if (b.type == "bar" && a.type != "bar") {
									return 1;
								}
								return 0;
							});
							datasets.forEach(function(x) {
								var hasData = false;
								var values = self.records.map(function(y) {
									var value = self.$services.page.getValue(y, x.value);
									if (x.valueFormat) {
										var formatty = nabu.utils.objects.clone(x.valueFormat);
										formatty.state = y;
										value = self.$services.formatter.format(value, formatty);
									}
									if (value != null) {
										hasData = true;
									}
									return value == null ? 0 : value;
								});
								if (hasData) {
									parameters.data.datasets.push({
										name: self.$services.page.translate(x.name),
										chartType: x.type ? x.type : 'line',
										values: values
									});
									parameters.colors.push(x.color ? x.color : self.$services.page.getNameColor(x.name ? x.name : "unnamed" + Math.random()));
								}
							});
						}
						if (this.cell.state.stackBars) {
							parameters.barOptions.stacked = 1;
						}
						if (this.cell.state.valuesOverPoints) {
							parameters.valuesOverPoints = 1;
						}
						if (this.cell.state.hideDots) {
							parameters.lineOptions.hideDots = 1;
						}
						if (this.cell.state.hideLine) {
							parameters.lineOptions.hideLine = 1;
						}
						if (this.cell.state.regionFill) {
							parameters.lineOptions.regionFill = 1;
						}
						if (this.cell.state.xIsSeries) {
							parameters.axisOptions.xIsSeries = true;
						}
						if (this.cell.state.spaceRatio) {
							parameters.barOptions.spaceRatio = parseFloat(this.cell.state.spaceRatio);
						}
						if (this.cell.state.dotSize) {
							parameters.lineOptions.dotSize = parseInt(this.cell.state.dotSize);
						}
						if (this.cell.state.navigable) {
							parameters.isNavigable = this.cell.state.navigable;
						}
						if (this.cell.state.maxSlices) {
							parameters.maxSlices = parseInt(this.cell.state.maxSlices);
						}
						if (this.cell.state.chartHeight) {
							parameters.height = parseInt(this.cell.state.chartHeight);
						}
						else if (this.cell.state.height) {
							parameters.height = parseInt(this.cell.state.height);
						}
						self.chart = new frappe.Chart(this.$refs.chart, parameters);
						this.calculateCss();
		//				chart.export();
						// update the entire data set (only data? not settings etc)
		//				chart.update(data);
					}
				},
				// this should only modify attributes! attribute changes are specifically not watched by the mutation observer
				calculateCss: function() {
					var self = this;
					// only watch the parent? otherwise we have to watch subtree
					var watchIt = false;
					// this is where the record styles are kept, check if any apply!
					if (self.cell.state.styles && self.cell.state.styles.length > 0) {
						self.$refs.chart.querySelectorAll("rect").forEach(function(x) {
							var index = x.getAttribute("data-point-index");
							if (index != null) {
								var styles = self.getRecordStyles(self.records[parseInt(index)]);
								if (styles != null && styles.length > 0) {
									var existing = x.getAttribute("class");
									if (existing == null) {
										existing = "";
									}
									var addClass = function(clazz) {
										if (!existing.match(new RegExp(" " + clazz + "( |$)"))) {
											existing = existing + " " + clazz;
										}
									};
									styles.forEach(function(y) { 
										if (typeof(y) == "string") {
											addClass(y);
										}
										// it can also be an object where each class has a boolean value indicating whether or not it should be applied
										else {
											Object.keys(y).forEach(function(z) {
												if (y[z]) {
													addClass(z);
												}
											});
										}
									});
									watchIt = true;
									x.setAttribute("class", existing);
								}
							}
						});
					}
					
					if (self.cell.state.yMarkers && self.cell.state.yMarkers.length > 0) {
						var yMarkerOffset = self.cell.state.minimumYValue != null && self.cell.state.minimumYValue != "" ? 1 : 0;
						var yRegionOffset = 0;
						self.cell.state.yMarkers.forEach(function(x) {
							var color = x.color ? self.$services.page.interpret(x.color, self) : null;
							if (color != null) {
								watchIt = true;
							}
							// we have a plain line
							if (x.to == null || x.to == "") {
								if (color != null) {
									var markers = self.$refs.chart.querySelectorAll("g.y-markers line");
									if (yMarkerOffset < markers.length) {
										markers.item(yMarkerOffset).setAttribute("style", "stroke: " + color);
									}
								}
								yMarkerOffset++;
							}
							// we have a range
							else {
								if (color != null) {
									var markers = self.$refs.chart.querySelectorAll("g.y-regions rect");
									if (yRegionOffset < markers.length) {
										var fill = x.fillColor ? self.$services.page.interpret(x.fillColor, self) : color;
										var original = markers.item(yRegionOffset).getAttribute("style");
										original = original.replace(/fill:[^;]+/, "").replace(/stroke:[^;]+/, "");
										markers.item(yRegionOffset).setAttribute("style", "stroke: " + color + ";fill:" + fill + "; " + original);
									}
								}
								yRegionOffset++;
							}
						});
					}
					
					// allow the title of the popup to be formatted retroactively
					if (self.cell.state.popupLabelFormat && self.cell.state.popupLabelFormatAdvanced) {
						var popup = self.$refs.chart.querySelector("div.graph-svg-tip");
						var index = parseInt(popup.getAttribute("data-point-index"));
						var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
						cloned.state = null;
						// the full record
						cloned.$value = self.records[index];
						var title = popup.querySelector(".title");
						var result = self.$services.formatter.format(self.records[index], cloned);
						// we have to do it via attributes, otherwise the observer goes crazy
						// we use css to inject the attribute
						title.setAttribute("formatted", result);
						//title.innerHTML = result;
						watchIt = true;
					}
					
					// allow the x axis to be reformatted based on the current value
					// not used at this point
					if (self.cell.state.xAxisFormat) {
						watchIt = true;
						self.$refs.chart.querySelectorAll("g.x.axis text").forEach(function(label) {
							var cloned = nabu.utils.objects.clone(self.cell.state.xAxisFormat);
							cloned.state = null;
							cloned.$value = label.innerHTML;
							label.innerHTML = self.$services.formatter.format(d, cloned);
						});
					}
					
					if (watchIt) {
						// watch for mutations
						var config = { attributes: false, childList: true, subtree: true, characterData: false };
						var observer = new MutationObserver(function(list, observer) {
							self.calculateCss();
							observer.disconnect();
						});
						observer.observe(self.$refs.chart, config);
					}
				}
			},
			watch: {
				'records': function() {
					if (!this.modifyingInternally) {
						this.draw();	
					}
					else {
						this.modifyingInternally = false;
					}	
				},
				'cell.state.operation': function(newValue) {
					if (newValue) {
						if (!this.cell.state.type) {
							this.cell.state.type = "mixed";
						}
						if (!this.cell.state.labelField) {
							var self = this;
							var definition = this.$services.data.getDefinition(this.cell.state.operation);
							Object.keys(definition).forEach(function(key) {
								if (!self.cell.state.labelField && (definition[key].type == "string" || !definition[key].type)) {
									self.cell.state.labelField = key;
								}
							});
						}
						if (!this.cell.state.datasets.length) {
							var self = this;
							var definition = this.$services.data.getDefinition(this.cell.state.operation);
							Object.keys(definition).forEach(function(key) {
								if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
									var dataset = {
										type: "bar",
										valueFormat: {}
									};
									dataset.value = key;
									dataset.name = key;
									self.cell.state.datasets.push(dataset);
								}
							});
						}
						this.load().then(this.draw);
					}
				}
			}
		});
	}
	
	var frappeAggregateChartGenerator = function(name) {
		// check out: https://frappe.io/charts/docs
		Vue.component(name, {
			template: "#" + name,
			mixins: [nabu.page.views.data.DataCommon],
			props: {
				page: {
					type: Object,
					required: true
				},
				parameters: {
					type: Object,
					required: false
				},
				cell: {
					type: Object,
					required: true
				},
				edit: {
					type: Boolean,
					required: true
				}
			},
			data: function() {
				return {
					configuring: false,
					modifyingInternally: false,
					chart: null
				}
			},
			beforeDestroy: function() {
				this.$services.page.destroy(this);
			},
			created: function() {
				this.create();
				if (!this.cell.state.bindings) {
					Vue.set(this.cell.state, "bindings", {});
				}
				if (!this.cell.state.dataset) {
					Vue.set(this.cell.state, "dataset", {valueFormat: {}});
				}
				if (!this.cell.state.labelFormat) {
					Vue.set(this.cell.state, "labelFormat", {});
				}
			},
			activate: function(done) {
				var self = this;
				this.activate(function() {
					done();
				}, done);
			},
			ready: function() {
				this.draw();
			},
			methods: {
				// TODO: pushDelete & pushUpdate?
				pushCreate: function(record) {
					var self = this;
					// to avoid refactor...
					var x = record;
					var label = self.$services.page.getValue(x, self.cell.state.labelField);
					if (self.cell.state.labelFormat) {
						// want to add the state
						var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
						cloned.state = x;
						cloned.$value = self.$value;
						label = self.$services.formatter.format(label, cloned);
					}
					// we need to potentially update data in situ
					if (self.cell.state.dataset.groupBy) {
						var index = self.chart.data.labels.indexOf(label);
						if (index < 0) {
							self.chart.addDataPoint(label, 1);
						}
						else {
							self.chart.data.datasets[0].values[index]++;
							self.chart.update({
								labels: self.chart.data.labels,
								datasets: self.chart.data.datasets
							});
						}
					}
					// just add it to records
					else {
						var dataset = self.cell.state.dataset;
						var value = self.$services.page.getValue(x, dataset.value);
						if (dataset.valueFormat) {
							var formatty = nabu.utils.objects.clone(dataset.valueFormat);
							formatty.state = x;
							value = self.$services.formatter.format(value, formatty);
						}
						if (value == null) {
							value = 0;
						}
						// does nothing?
						//self.chart.addDataPoint(label, value);
						self.chart.data.labels.push(label);
						self.chart.data.datasets[0].values.push(value);
						self.chart.update({
							labels: self.chart.data.labels,
							datasets: self.chart.data.datasets
						});
					}
					self.modifyingInternally = true;
					self.records.push(record);
				},
				configurator: function() {
					return "frappe-aggregate-chart-configure";
				},
				getKeys: function(name) {
					return this.keys.filter(function(x) {
						return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
					});
					var keys = this.cell.state.operation ? this.$services.page.getSimpleKeysFor({properties:this.$services.data.getDefinition(this.cell.state.operation)}) : [];
					if (name) {
						keys = keys.filter(function(x) { return x.toLowerCase().indexOf(name.toLowerCase()) >= 0 });
					}
					return keys;
				},
				draw: function() {
					var self = this;
					if (this.records.length && this.$refs.chart) {
						var parameters = {
							type: this.cell.state.type ? this.cell.state.type : "pie",
							data: {
								datasets: []
							},
							colors: [],
							tooltipOptions: {
								formatTooltipX: function(d) {
									if (self.cell.state.popupLabelFormat) {
										var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
										cloned.state = null;
										cloned.$value = self.$value;
										d = self.$services.formatter.format(d, cloned);
									}
									return d;
								},
								formatTooltipY: function(d) {
									// we have a float, round it
									if (typeof(d) == "number" && parseInt(d) != d) {
										return self.$services.formatter.number(d, 2);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9]+$/)) {
										return parseInt(d);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9.]+$/)) {
										return parseFloat(d);
									}
									return d;
								}
							},
							barOptions: {},
							lineOptions: {},
							axisOptions: {}
						};
						if (this.cell.state.chartHeight) {
							parameters.height = parseInt(this.cell.state.chartHeight);
						}
						// there seems to be no configurable way to tell frappe to start at a certain point
						// so we just add a marker at that point with no label, forcing frappe to take it into account
						// note that if we pass in an empty array of yMarkers, frappe fails...
						if (self.cell.state.minimumYValue != null && self.cell.state.minimumYValue != "") {
							parameters.data.yMarkers = [{
								label: "",
								value: parseFloat(self.cell.state.minimumYValue)
							}];
							// also has yRegions, not relevant now
						}
						if (self.cell.state.title) {
							// we now do the title in data common
							// parameters.title = this.$services.page.translate(self.cell.state.title);
						}
						if (!self.cell.state.dataset.groupBy) {
							// if we have a label field, use that
							if (this.cell.state.labelField) {
								parameters.data.labels = this.records.map(function(x) {
									var value = self.$services.page.getValue(x, self.cell.state.labelField);
									if (self.cell.state.labelFormat) {
										// want to add the state
										var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
										cloned.state = x;
										cloned.$value = self.$value;
										value = self.$services.formatter.format(value, cloned);
									}
									return value;
								});
							}
							if (this.cell.state.dataset) {
								var datasets = [];
								datasets.push(this.cell.state.dataset);
								datasets.forEach(function(x) {
									var hasData = false;
									var values = self.records.map(function(y) {
										var value = self.$services.page.getValue(y, x.value);
										if (x.valueFormat) {
											var formatty = nabu.utils.objects.clone(x.valueFormat);
											formatty.state = y;
											value = self.$services.formatter.format(value, formatty);
										}
										if (value != null) {
											hasData = true;
										}
										return value == null ? 0 : value;
									});
									if (hasData) {
										parameters.data.datasets.push({
											name: self.$services.page.translate(x.name),
											values: values
										});
										parameters.colors.push(x.color ? x.color : self.$services.page.getNameColor(x.name ? x.name : "unnamed" + Math.random()));
									}
								});
							}
						}
						else {
							var values = [];
							var labels = [];
							var dataset = self.cell.state.dataset;
							this.records.forEach(function(x) {
								// resolve label
								var value = self.$services.page.getValue(x, self.cell.state.labelField);
								if (self.cell.state.labelFormat) {
									// want to add the state
									var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
									cloned.state = x;
									cloned.$value = self.$value;
									value = self.$services.formatter.format(value, cloned);
								}
								var index = labels.indexOf(value);
								if (index < 0) {
									labels.push(value);
									values.push(1);
								}
								else {
									values[index]++;
								}
							});
							parameters.data.labels = labels;
							parameters.data.datasets.push({
								name: self.$services.page.translate(dataset.name),
								values: values
							});
							parameters.colors.push(dataset.color ? dataset.color : self.$services.page.getNameColor(dataset.name ? dataset.name : "unnamed" + Math.random()));
						}
						if (this.cell.state.barHeight) {
							parameters.barOptions.height = parseInt(this.cell.state.barHeight);
						}
						if (this.cell.state.barDepth) {
							parameters.barOptions.depth = parseInt(this.cell.state.barDepth);
						}
						if (this.cell.state.navigable) {
							parameters.isNavigable = this.cell.state.navigable;
						}
						if (this.cell.state.maxSlices) {
							parameters.maxSlices = parseInt(this.cell.state.maxSlices);
						}
						if (this.cell.state.chartHeight) {
							parameters.height = parseInt(this.cell.state.chartHeight);
						}
						else if (this.cell.state.height) {
							parameters.height = parseInt(this.cell.state.height);
						}
						console.log("drawing", parameters);
						self.chart = new frappe.Chart(this.$refs.chart, parameters);
		//				chart.export();
						// update the entire data set (only data? not settings etc)
		//				chart.update(data);
					}
				}
			},
			watch: {
				'records': function() {
					if (!this.modifyingInternally) {
						this.draw();	
					}
					else {
						this.modifyingInternally = false;
					}
				},
				definition: function(definition) {
					if (definition) {
						if (!this.cell.state.type) {
							this.cell.state.type = "pie";
						}
						var self = this;
						// we set the label value for each field
						if (!this.cell.state.labelField) {
							Object.keys(definition).forEach(function(key) {
								if (!self.cell.state.labelField && (definition[key].type == "string" || !definition[key].type)) {
									self.cell.state.labelField = key;
								}
							});
						}
						Object.keys(definition).forEach(function(key) {
							if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
								var dataset = self.cell.state.dataset;
								dataset.value = key;
								dataset.name = key;
							}
						});
						this.load().then(this.draw);
					}
				}
			}
		});
	}
		
	var frappePercentChartGenerator = function(name) {
		// check out: https://frappe.io/charts/docs
		Vue.component(name, {
			template: "#" + name,
			props: {
				page: {
					type: Object,
					required: true
				},
				parameters: {
					type: Object,
					required: false
				},
				cell: {
					type: Object,
					required: true
				},
				edit: {
					type: Boolean,
					required: true
				}
			},
			beforeDestroy: function() {
				this.$services.page.destroy(this);
			},
			created: function() {
				if (!this.cell.state.valueFormat) {
					Vue.set(this.cell.state, "valueFormat", {});
				}
			},
			ready: function() {
				this.draw();
			},
			methods: {
				configurator: function() {
					return "frappe-percent-chart-configure";
				},
				getKeys: function(value) {
					var parameters = this.$services.page.getAvailableParameters(this.page, this.cell, true);
					var keys = this.$services.page.getSimpleKeysFor({properties:parameters});
					return value ? keys.filter(function(x) { x.toLowerCase().indexOf(value.toLowerCase()) >= 0 }) : keys;
				},
				draw: function() {
					var self = this;
					if (this.$refs.chart) {
						var parameters = {
							type: "percentage",
							data: {
								datasets: []
							},
							colors: [],
							tooltipOptions: {
								formatTooltipX: function(d) {
									if (self.cell.state.popupLabelFormat) {
										var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
										cloned.state = null;
										cloned.$value = self.$value;
										d = self.$services.formatter.format(d, cloned);
									}
									return d;
								},
								formatTooltipY: function(d) {
									// we have a float, round it
									if (typeof(d) == "number" && parseInt(d) != d) {
										return self.$services.formatter.number(d, 2);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9]+$/)) {
										return parseInt(d);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9.]+$/)) {
										return parseFloat(d);
									}
									return d;
								}
							},
							barOptions: {},
							lineOptions: {},
							axisOptions: {}
						};
						if (self.cell.state.title) {
							//parameters.title = this.$services.page.translate(self.cell.state.title);
						}
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var value = self.cell.state.valueFormula ? self.$services.page.interpret(self.cell.state.valueFormula, self) : self.$services.page.getBindingValue(pageInstance, self.cell.state.value, self);
						var max = self.cell.state.maxValue ? parseFloat(self.$services.page.interpret(self.cell.state.maxValue, self)) : value;
						parameters.data.datasets.push({
							name: "values-name",
							values: [
								value,
								max - value
							]
						});
						parameters.data.labels = [
							self.cell.state.labelField ? self.$services.page.translate(self.cell.state.labelField) : "Value",
							self.cell.state.labelRemainder ? self.$services.page.translate(self.cell.state.labelRemainder) : "Remainder",
						];
						if (this.cell.state.barHeight) {
							parameters.barOptions.height = parseInt(this.cell.state.barHeight);
						}
						if (this.cell.state.barDepth) {
							parameters.barOptions.depth = parseInt(this.cell.state.barDepth);
						}
						if (this.cell.state.navigable) {
							parameters.isNavigable = this.cell.state.navigable;
						}
						if (this.cell.state.chartHeight) {
							parameters.height = parseInt(this.cell.state.chartHeight);
						}
						else if (this.cell.state.height) {
							parameters.height = parseInt(this.cell.state.height);
						}
						var chart = new frappe.Chart(this.$refs.chart, parameters);
		//				chart.export();
						// update the entire data set (only data? not settings etc)
		//				chart.update(data);
					}
				}
			},
			watch: {
				'records': function() {
					this.draw();	
				},
				definition: function(definition) {
					if (definition) {
						if (!this.cell.state.type) {
							this.cell.state.type = "pie";
						}
						var self = this;
						// we set the label value for each field
						if (!this.cell.state.labelField) {
							Object.keys(definition).forEach(function(key) {
								if (!self.cell.state.labelField && (definition[key].type == "string" || !definition[key].type)) {
									self.cell.state.labelField = key;
								}
							});
						}
						Object.keys(definition).forEach(function(key) {
							if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
								var dataset = self.cell.state.dataset;
								dataset.value = key;
								dataset.name = key;
							}
						});
						this.load().then(this.draw);
					}
				}
			}
		});
	}
	
	frappeChartGenerator("frappe-chart");
	frappeChartGenerator("frappe-chart-configure");
	frappeAggregateChartGenerator("frappe-aggregate-chart");
	frappeAggregateChartGenerator("frappe-aggregate-chart-configure");
	frappePercentChartGenerator("frappe-percent-chart");
	frappePercentChartGenerator("frappe-percent-chart-configure");
	
	application.bootstrap(function($services) {
		var accept = function(type, value) {
			if (type == "operation") {
				return $services.dataUtils.getDataOperations().map(function(x) { return x.id }).indexOf(value) >= 0;
			}
		};
		var initialize = function(type, value, component, cell, row, page) {
			component.updateOperation(value);
			var name = $services.page.guessNameFromOperation(value);
			if (name != null) {
				cell.state.title = $services.page.prettify(name);
			}
			// increase the default limit, 10 is not enough when drawing graphs
			cell.state.limit = 1000;
			// set the default filter
			cell.state.filterType = "data-combo-filter";
			cell.state.comboFilter = {
				useTags: true
			}
		};
		
		
		$services.router.register({
			alias: "frappe-chart",
			category: "Charts",
			name: "Frappe Chart",
			description: "Use this versatile frappe plugin to draw bar and line charts.",
			icon: "images/components/frappe-logo.png",
			accept: accept,
			initialize: initialize,
			parameters: {
				dynamicArray: {
					type: Array
				}
			},
			enter: function(parameters) {
				var component = Vue.component("frappe-chart");
				return new component({propsData:parameters});
			},
			slow: true
		});
		
		$services.router.register({
			alias: "frappe-aggregate-chart",
			category: "Charts",
			name: "Frappe Aggregate Chart",
			description: "Use this versatile frappe plugin to pie, donut and percent charts.",
			icon: "images/components/frappe-logo.png",
			accept: accept,
			initialize: initialize,
			parameters: {
				dynamicArray: {
					type: Array
				}
			},
			enter: function(parameters) {
				var component = Vue.component("frappe-aggregate-chart");
				return new component({propsData:parameters});
			},
			slow: true
		});
		
		$services.router.register({
			alias: "frappe-percent-chart",
			category: "Charts",
			name: "Frappe Percentage Chart",
			description: "Draw a percentage chart based on a value",
			icon: "images/components/frappe-logo.png",
			parameters: {
				dynamicArray: {
					type: Array
				}
			},
			enter: function(parameters) {
				var component = Vue.component("frappe-percent-chart");
				return new component({propsData:parameters});
			},
			slow: true
		});
		
	});
});





