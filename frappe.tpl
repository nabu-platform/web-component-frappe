<template id="frappe-chart">
	<div class="frappe-chart"><n-sidebar class="settings" v-if="configuring == true" :inline="true" @close="configuring = false; draw()">
		<n-collapsible title="Chart Data" class="padded">
			<h2>Data<span class="subscript">Determine where you will get your data from</span></h2>
			<n-form-combo label="Operation" v-model="cell.state.operation" 
				:formatter="function(x) { return x.id }"
				:extracter="function(x) { return x.id }"
				:filter="$services.data.getDataOperations"/>
			<n-page-mapper v-if="cell.state.operation" :to="$services.data.getInputParameters(cell.state.operation)" 
				:from="$services.page.getAvailableParameters(page, cell, true)" 
				v-model="cell.bindings"/>
			<n-form-combo v-model="cell.state.type" label="Chart Type" info="The type of chart you want to create. If you want to create a line and/or bar chart, use the mixed option" :items="['mixed', 'pie', 'percentage']" @input="draw"/>
			<n-form-text v-model="cell.state.height" label="Chart height (in px)" info="The default height is 240" @input="draw"/>
		</n-collapsible>
		<n-collapsible title="Chart Content" v-if="cell.state.operation" class="padded">
			<n-form-combo v-model="cell.state.label" label="Label Field" :filter="getKeys" @input="draw"/>
			<page-formatted-configure v-if="cell.state.label" :fragment="cell.state.labelFormat" :page="page" :cell="cell" @input="draw"/>
			
			<n-form-text v-model="cell.state.maxSlices" v-if="type == 'pie'" label="Max amount of slices" @input="draw"/>
			
			<n-form-switch v-if="type == 'mixed'" v-model="cell.state.xIsSeries" label="Treat X-axis as series" info="When there are too many labels to show correctly and the x-axis is considered a continuous series, some labels can be left out" @input="draw"/>
			<n-form-switch v-if="type == 'mixed'" v-model="cell.state.valuesOverPoints" label="Show values over points" @input="draw"/>
			<n-form-switch v-model="cell.state.navigable" label="Navigable" @input="draw"/>
			<n-form-switch v-model="cell.state.hideDots" v-if="hasLines && !cell.state.hideLine" label="Hide line dots" @input="draw"/>
			<n-form-switch v-model="cell.state.hideLine" v-if="hasLines && !cell.state.hideDots" label="Hide line" @input="draw"/>
			<n-form-text type="range" :minimum="3" :maximum="10" :step="1" v-model="cell.state.dotSize" v-if="hasLines && !cell.state.hideDots" label="Dot size" @input="draw"/>
			<n-form-switch v-model="cell.state.regionFill" v-if="hasLines" label="Fill region" @input="draw"/>
			<n-form-switch v-model="cell.state.stackBars" v-if="hasMultipleBars" label="Stack bars" @input="draw"/>
			<n-form-text type="range" :minimum="0.1" :maximum="1.9" :step="0.1" v-model="cell.state.spaceRatio" v-if="hasBar" label="Bar chart space ratio" info="The ratio of the space between the bars to the width of the bars themselves" @input="draw"/>
			<h2>Data Sets<span class="subscript">Choose the fields you want to use</span></h2>
			<div class="list-actions">
				<button @click="cell.state.datasets.push({valueFormat: {}})"><span class="fa fa-plus"></span>Data set</button>
			</div>
			<div v-for="i in Object.keys(cell.state.datasets)" class="list-row">
				<n-form-text v-model="cell.state.datasets[i].name" label="Name" @input="draw"/>
				<n-form-combo v-if="type == 'mixed'" v-model="cell.state.datasets[i].type" :items="['line', 'bar']" label="Type" @input="draw"/>
				<n-form-text v-model="cell.state.datasets[i].color" label="Color" type="color" @input="draw"/>
				<n-form-combo v-model="cell.state.datasets[i].value" label="Value Field" 
					:filter="getKeys" @input="draw"/>
				<page-formatted-configure v-if="cell.state.datasets[i].value" :fragment="cell.state.datasets[i].valueFormat" :page="page" :cell="cell" @input="draw"/>
				<span class="fa fa-times" @click="cell.state.datasets.splice(i, 1); draw()"></span>
			</div>
		</n-collapsible>
	</n-sidebar><div class="page-startup-wizard" v-if="edit && !cell.state.operation">
			<div class="step">
				<h2 class="title">Choose a data source</h2>
				<n-form-combo label="Operation" v-model="cell.state.operation" 
					:formatter="function(x) { return x.id }"
					:extracter="function(x) { return x.id }"
					:filter="$services.data.getDataOperations"/>
			</div>
		</div></div>
</template>
