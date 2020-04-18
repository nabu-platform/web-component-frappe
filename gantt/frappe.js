window.addEventListener("load", function () {
	// check out: https://frappe.io/gantt
	Vue.view("frappe-gantt", {
		mixins: [nabu.page.views.data.DataCommon],
		category: "Charts",
		name: "Frappe Gantt",
		description: "Draw gantt charts with this frappe component.",
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
		data: function() {
			return {
				configuring: false,
				timeout: null
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
			getCustomEvents: function() {
				var result = {};
				if (this.cell.state.updateEvent) {
					result[this.cell.state.updateEvent] = this.definition;
				}
				return result;
			},
			configure: function() {
				this.configuring = true;	
			},
			getKeys: function(name) {
				return this.keys.filter(function(x) {
					return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
				});
			},
			draw: function() {
				var self = this;
				if (this.records.length && self.cell.state.startField && self.cell.state.endField) {
					var tasks = this.records.filter(function(x) {
						return self.$services.page.getValue(x, self.cell.state.startField) && self.$services.page.getValue(x, self.cell.state.endField);
					}).map(function(x) {
						var started = self.$services.formatter.date(self.$services.page.getValue(x, self.cell.state.startField), "yyyy-MM-dd");
						var ended = self.$services.formatter.date(self.$services.page.getValue(x, self.cell.state.endField), "yyyy-MM-dd");
						var dependencies = self.$services.page.getValue(x, self.cell.state.dependenciesField);
						if (dependencies instanceof Array) {
							dependencies = dependencies.reduce(function(dependency, total) {
								return (total ? total + "," : "") + dependency;
							}, null);
						}
						return {
							id: self.cell.state.idField ? "" + self.$services.page.getValue(x, self.cell.state.idField) : null,
							name: self.cell.state.nameField ? self.$services.page.getValue(x, self.cell.state.nameField) : null,
							start: started,
							end: ended,
							// number between 0 and 100
							progress: self.cell.state.progressField ? self.$services.page.getValue(x, self.cell.state.progressField) : 0,
							// ids of other tasks this one depends on
							dependencies: dependencies,
						}
					});
					var customHtml = null;
					// we need the id to find the correct record for replacement
					if (self.cell.state.popupHtml && self.cell.state.idField) {
						customHtml = function(task) {
							var record = self.records.filter(function(x) {
								return self.$services.page.getValue(x, self.cell.state.idField) == task.id;
							})[0];
							if (record) {
								var string = self.cell.state.popupHtml;
								Object.keys(record).forEach(function(key) {
									string = string.replace("{" + key + "}", record[key]);
								});
								return string;
							}
							return null;
						};
					}
					var trigger = function(task, properties) {
						if (self.cell.state.idField && self.cell.state.updateEvent) {
							var record = self.records.filter(function(x) {
								return self.$services.page.getValue(x, self.cell.state.idField) == task.id;
							})[0];
							if (record) {
								var changed = false;
								if (properties.start && self.cell.state.startField) {
									self.$services.page.setValue(record, self.cell.state.startField, properties.start);
									changed = true;
								}
								else if (properties.end && self.cell.state.endField) {
									self.$services.page.setValue(record, self.cell.state.endField, properties.end);
									changed = true;
								}
								else if (properties.progress && self.cell.state.progressField) {
									self.$services.page.setValue(record, self.cell.state.progressField, properties.progress);
									changed = true;
								}
								if (changed) {
									if (self.timeout) {
										clearTimeout(self.timeout);
										self.timeout = null;
									}
									self.timeout = setTimeout(function() {
										console.log("updated into", record);
										var pageInstance = self.$services.page.getPageInstance(self.page, self);
										pageInstance.emit(self.cell.state.updateEvent, record);
										self.timeout = null;
									}, 600);
									
								}
							}
						}
					};
					var gantt = new Gantt(this.$refs.chart, tasks, {
						on_click: function(task) {
							// console.log("clicked", task);
							if (self.cell.state.idField) {
								var record = self.records.filter(function(x) {
									return self.$services.page.getValue(x, self.cell.state.idField) == task.id;
								})[0];
								if (record) {
									self.select(record);
								}
							}
						},
						on_date_change: function(task, start, end) {
							trigger(task, {
								start: start,
								end: end
							});
						},
						on_progress_change: function(task, progress) {
							trigger(task, {
								progress: progress
							});
						},
						on_view_change: function(mode) {
							// console.log("mode", mode);
						},
						custom_popup_html: customHtml
					});
					gantt.change_view_mode(self.cell.state.viewMode ? self.cell.state.viewMode : "Week");
				}
			}
		},
		watch: {
			'records': function() {
				this.draw();	
			},
			'cell.state.operation': function(newValue) {
				if (newValue) {
					var self = this;
					var definition = this.$services.data.getDefinition(this.cell.state.operation);
					Object.keys(definition).forEach(function(key) {
						if (key == "id" && !self.cell.state.idField) {
							self.cell.state.idField = "id";
						}
						else if (definition[key].format && definition[key].format.indexOf("date") >= 0) {
							if ((key.toLowerCase().indexOf("start") >= 0 || key.toLowerCase().indexOf("from") >= 0) && !self.cell.state.startField) {
								self.cell.state.startField = key;
							}
							else if ((key.toLowerCase().indexOf("stop") >= 0 || key.toLowerCase().indexOf("end") >= 0 || key.toLowerCase().indexOf("until") >= 0) && !self.cell.state.endField) {
								self.cell.state.endField = key;
							}
						}
						else if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64") {
							if (!self.cell.state.progressField) {
								self.cell.state.progressField = key;
							}
						}
						else if (definition[key].type == "string" && !self.cell.state.nameField) {
							self.cell.state.nameField = key;
						}
						else if (definition[key].type == "array" && !self.cell.state.dependenciesField) {
							self.cell.state.dependenciesField = key;
						}
					});
					this.load().then(this.draw);
				}
			}
		}
	});
});




