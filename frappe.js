Vue.view("frappe-chart", {
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
			records: [],
			configuring: false
		}
	},
	created: function() {
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
		this.execute().then(done, done);
	},
	ready: function() {
		this.draw();
	},
	methods: {
		configure: function() {
			this.configuring = true;	
		},
		getKeys: function(name) {
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
			return promise;
		},
		draw: function() {
			var self = this;
			if (this.records.length) {
				var parameters = {
					type: "axis-mixed",
					datasets: [],
					colors: [],
					tooltipOptions: {
						formatTooltipX: function(d, i) { console.log("formatting tooltip X", d, i); return d },
						formatTooltipY: function(d, i) { console.log("formatting tooltip Y", d, i); return d }
					}
				};
				if (self.cell.state.title) {
					parameters.title = this.$services.page.translate(self.cell.state.title);
				}
				// if we have a label field, use that
				if (this.cell.state.label) {
					parameters.labels = this.records.map(function(x) {
						var value = self.$services.page.getValue(x, self.cell.state.label);
						if (self.cell.state.labelFormat) {
							value = self.$services.formatter.format(value, self.cell.state.labelFormat);
						}
						return value;
					});
				}
				if (this.cell.state.datasets && this.cell.state.datasets.length) {
					this.cell.state.datasets.forEach(function(x) {
						parameters.datasets.push({
							name: self.$services.page.translate(x.name),
							chartType: x.type ? x.type : 'line',
							values: self.records.map(function(y) {
								var value = self.$services.page.getValue(y, x.value);
								if (x.format) {
									value = self.$services.formatter.format(value, x.format);
								}
								return value;
							})
						});
						parameters.colors.push(x.color ? x.color : self.$services.page.getNameColor(x.name ? x.name : "unnamed" + Math.random()));
					});
				}
				console.log("drawing with", parameters);
				var chart = new frappe.Chart(this.$el, {data:parameters});
//				chart.export();
			}
		}
	}
});