window.addEventListener("load", function () {
	// check out: https://frappe.io/charts/docs
	Vue.view("frappe-chart", {
		mixins: [nabu.page.views.data.DataCommon],
		category: "Charts",
		name: "Frappe Chart",
		description: "Use this versatile frappe plugin to draw bar, line, pie and percent charts.",
		icon: "images/components/frappe-logo.png",
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
				configuring: false
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
			configure: function() {
				this.configuring = true;	
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
			draw: function() {
				var self = this;
				if (this.records.length) {
					var parameters = {
						type: this.type == "mixed" ? "axis-mixed" : this.type,
						data: {
							datasets: []
						},
						colors: [],
						tooltipOptions: {
							formatTooltipX: function(d) { return d },
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
						parameters.title = this.$services.page.translate(self.cell.state.title);
					}
					// if we have a label field, use that
					if (this.cell.state.label) {
						parameters.data.labels = this.records.map(function(x) {
							var value = self.$services.page.getValue(x, self.cell.state.label);
							if (self.cell.state.labelFormat) {
								value = self.$services.formatter.format(value, self.cell.state.labelFormat);
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
								if (x.format) {
									value = self.$services.formatter.format(value, x.format);
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
					if (this.cell.state.height) {
						parameters.height = parseInt(this.cell.state.height);
					}
					console.log("drawing", this.$refs.chart, parameters);
					var chart = new frappe.Chart(this.$refs.chart, parameters);
	//				chart.export();
					// update the entire data set (only data? not settings etc)
	//				chart.update(data);
				}
			}
		},
		watch: {
			'cell.state.operation': function(newValue) {
				if (newValue) {
					if (!this.cell.state.type) {
						this.cell.state.type = "mixed";
					}
					if (!this.cell.state.label) {
						var self = this;
						var definition = this.$services.data.getDefinition(this.cell.state.operation);
						Object.keys(definition).forEach(function(key) {
							if (!self.cell.state.label && (definition[key].type == "string" || !definition[key].type)) {
								self.cell.state.label = key;
							}
						});
					}
					if (!this.cell.state.datasets.length) {
						var self = this;
						var definition = this.$services.data.getDefinition(this.cell.state.operation);
						Object.keys(definition).forEach(function(key) {
							if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
								var dataset = {
									type: "line",
									valueFormat: {}
								};
								dataset.value = key;
								dataset.name = key;
								self.cell.state.datasets.push(dataset);
							}
						});
					}
					this.execute().then(this.draw);
				}
			}
		}
	});
});




