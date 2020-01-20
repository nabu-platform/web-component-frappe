<template id="frappe-chart">
	<div class="frappe-chart"><n-sidebar class="settings" v-if="configuring == true" :inline="true" @close="configuring = false" :autocloseable="false">
		<n-collapsible title="Chart Data">
			<h2>Data<span class="subscript">Determine where you will get your data from</span></h2>
			<n-form-combo label="Operation" v-model="cell.state.operation" 
				:formatter="function(x) { return x.id }"
				:extracter="function(x) { return x.id }"
				:filter="$services.data.getDataOperations"/>
			<n-page-mapper v-if="cell.state.operation" :to="$services.data.getInputParameters(cell.state.operation)" 
				:from="$services.page.getAvailableParameters(page, cell, true)" 
				v-model="cell.bindings"/>
		</n-collapsible>
		<n-collapsible title="Chart Content" v-if="cell.state.operation">
			<n-form-combo v-model="cell.state.label" @input="draw" label="Label Field" :filter="getKeys"/>
			<page-formatted-configure v-if="cell.state.label" :fragment="cell.state.labelFormat" :page="page" :cell="cell"/>
			<div class="list-actions">
				<button @click="cell.state.datasets.push({valueFormat: {}})"><span class="fa fa-plus"></span>Data set</button>
			</div>
			<div v-for="i in Object.keys(cell.state.datasets)" class="list-row">
				<n-form-text v-model="cell.state.datasets[i].name" label="Name" @input="draw"/>
				<n-form-combo v-model="cell.state.datasets[i].type" :items="['line', 'bar']" label="Type" @input="draw"/>
				<n-form-text v-model="cell.state.datasets[i].color" label="Color" type="color" @input="draw"/>
				<n-form-combo v-model="cell.state.datasets[i].value" @input="draw" label="Value Field" 
					:filter="getKeys" @input="draw"/>
				<page-formatted-configure v-if="cell.state.datasets[i].value" :fragment="cell.state.datasets[i].valueFormat" :page="page" :cell="cell" @input="draw"/>
				<span class="fa fa-times" @click="cell.state.datasets.splice(i, 1); draw()"></span>
			</div>
		</n-collapsible>
	</n-sidebar></div>
</template>
