<template id="frappe-chart">
	<div class="frappe-chart data-cell">
		<data-common-header :page="page" :parameters="parameters" :cell="cell"
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close'); configuring=false"
			:multiselect="true"
			:configuring="configuring"
			:updatable="true"
			:paging="paging"
			:filters="filters"
			:supports-global-styling="true"
			:supports-record-styling="false"
			:supports-fields="false"
			@refresh="refresh"/>
		<div v-if="!records.length" class="no-data">{{ cell.state.emptyPlaceholder ? $services.page.translate(cell.state.emptyPlaceholder) : "%{No data available}"}}</div>
		<div ref="chart" :class="$services.page.getDynamicClasses(cell.state.globalStyles, {}, $self)"></div>
		<data-common-footer :page="page" :parameters="parameters" :cell="cell" 
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			:global-actions="globalActions"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close')"
			:multiselect="true"
			:updatable="true"/>
	</div>
</template>

<template id="frappe-aggregate-chart">
	<div class="frappe-aggregate-chart data-cell">
		
		<data-common-header :page="page" :parameters="parameters" :cell="cell"
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close'); configuring=false"
			:multiselect="true"
			:configuring="configuring"
			:updatable="true"
			:paging="paging"
			:filters="filters"
			:supports-global-styling="true"
			:supports-record-styling="false"
			:supports-fields="false"
			@refresh="refresh"/>
		<div v-if="!records.length" class="no-data">{{ cell.state.emptyPlaceholder ? $services.page.translate(cell.state.emptyPlaceholder) : "%{No data available}"}}</div>
		<div ref="chart" class="chart-container-parent" :class="$services.page.getDynamicClasses(cell.state.globalStyles, {}, $self)"></div>
		<data-common-footer :page="page" :parameters="parameters" :cell="cell" 
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			:global-actions="globalActions"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close')"
			:multiselect="true"
			:updatable="true"/>
	</div>
</template>


<template id="frappe-chart-configure">
	<data-common-configure :page="page" :parameters="parameters" :cell="cell"
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close'); configuring=false"
			:multiselect="true"
			:configuring="true"
			:updatable="true"
			:paging="paging"
			:filters="filters"
			@refresh="refresh">
		<div slot="settings">
			<n-collapsible title="Chart Content" class="padded">
				<n-form-combo v-model="cell.state.label" label="Label Field" :filter="getKeys" @input="draw"/>
				<div v-if="cell.state.label">
					<label>Label format</label>
					<page-formatted-configure :fragment="cell.state.labelFormat" :page="page" :cell="cell" @input="draw"/>
					<label>Popup label format</label>
					<page-formatted-configure :fragment="cell.state.popupLabelFormat" :page="page" :cell="cell" @input="draw"/>
					<n-form-switch v-model="cell.state.popupLabelFormatAdvanced" label="Advanced formatting" info="If you enable advanced formatting, you get access to the entire record"/>
				</div>
				
				<n-form-text v-model="cell.state.maxSlices" v-if="type == 'pie'" label="Max amount of slices" @input="draw"/>
				
				<n-form-text v-model="cell.state.minimumYValue" label="Minimum Y value"/>
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
			<n-collapsible title="Markers">
				<div class="list-actions">
					<button @click="addYMarker"><span class="fa fa-plus"></span>Y Marker</button>
				</div>
				<div v-if="cell.state.yMarkers">
					<div v-for="yMarker in cell.state.yMarkers" class="list-row">
						<n-form-text v-model="yMarker.name" label="Name" @input="draw"/>	
						<n-form-text v-model="yMarker.from" label="From" @input="draw"/>
						<n-form-text v-if="yMarker.from != null" v-model="yMarker.to" label="To" @input="draw"/>
						<n-form-text v-model="yMarker.color" label="Color" @input="draw"/>
						<n-form-text v-if="yMarker.to" v-model="yMarker.fillColor" label="Fill Color" @input="draw"/>
						<n-form-combo :items="['left', 'right']" v-model="yMarker.labelPosition" label="Label Position"/>
						<span class="fa fa-times" @click="cell.state.yMarkers.splice(cell.state.yMarkers.indexOf(yMarker, 1)); draw()"></span>
					</div>
				</div>
			</n-collapsible>
		</div>
	</data-common-configure>
</template>

<template id="frappe-aggregate-chart-configure">
	<data-common-configure :page="page" :parameters="parameters" :cell="cell"
			:edit="edit"
			:records="records"
			:selected="selected"
			:inactive="inactive"
			@updatedEvents="$emit('updatedEvents')"
			@close="$emit('close'); configuring=false"
			:multiselect="true"
			:configuring="true"
			:updatable="true"
			:paging="paging"
			:filters="filters"
			@refresh="refresh">
		<n-collapsible slot="settings" title="Chart Content" class="padded">
			<n-form-combo v-model="cell.state.label" label="Label Field" :filter="getKeys" @input="draw"/>
			<div v-if="cell.state.label">
				<label>Label format</label>
				<page-formatted-configure :fragment="cell.state.labelFormat" :page="page" :cell="cell" @input="draw"/>
				<label>Popup label format</label>
				<page-formatted-configure :fragment="cell.state.popupLabelFormat" :page="page" :cell="cell" @input="draw"/>
			</div>
			
			<n-form-text v-model="cell.state.maxSlices" v-if="cell.state.type == 'pie'" label="Max amount of slices" @input="draw"/>
			
			<n-form-text v-model="cell.state.minimumYValue" label="Minimum Y value"/>
			<n-form-switch v-model="cell.state.navigable" label="Navigable" @input="draw"/>
			<h2>Data Sets<span class="subscript">Choose the field you want to use</span></h2>
			<n-form-text v-model="cell.state.dataset.name" label="Name" @input="draw"/>
			<n-form-combo v-model="cell.state.type" :items="['pie', 'percentage', 'donut']" label="Type" @input="draw"/>
			<n-form-text v-model="cell.state.dataset.color" label="Color" type="color" @input="draw"/>
			<n-form-combo v-model="cell.state.dataset.value" label="Value Field" 
				:filter="getKeys" @input="draw"/>
			<n-form-text v-model="cell.state.dataset.barHeight" v-if="cell.state.type == 'percent'" label="Bar Height"/>
			<n-form-text v-model="cell.state.dataset.barDepth" v-if="cell.state.type == 'percent'" label="Bar Depth"/>
			<page-formatted-configure v-if="cell.state.dataset.value" :fragment="cell.state.dataset.valueFormat" :page="page" :cell="cell" @input="draw"/>
		</n-collapsible>
	</data-common-configure>
</template>


<template id="frappe-percent-chart-configure">
	<div class="frappe-percent-chart-configure">
		<n-collapsible slot="settings" title="Chart Content" class="padded">
			<n-form-text v-model="cell.state.title" label="Title" @input="draw"/>
			<n-form-text v-model="cell.state.label" label="Label" @input="draw"/>
			<n-form-text v-model="cell.state.labelRemainder" label="Label Remainder" @input="draw"/>
			<n-form-switch v-model="cell.state.navigable" label="Navigable" @input="draw"/>
			<n-form-text v-model="cell.state.color" label="Color" type="color" @input="draw"/>
			<n-form-combo v-model="cell.state.value" v-if="!cell.state.valueFormula" label="Value Field" :filter="getKeys" @input="draw"/>
			<n-form-text v-model="cell.state.valueFormula" v-if="!cell.state.value" label="Value Fixed Value" @input="draw"/>
			<n-form-text v-model="cell.state.maxValue" label="Max Value" @input="draw"/>
			<n-form-text v-model="cell.state.barHeight" label="Bar Height"/>
			<n-form-text v-model="cell.state.barDepth" label="Bar Depth"/>
			<page-formatted-configure v-if="cell.state.value" :fragment="cell.state.valueFormat" :page="page" :cell="cell" @input="draw"/>
		</n-collapsible>
	</div>
</template>

<template id="frappe-percent-chart">
	<div class="frappe-percent-chart data-cell data-cell">
		<div class="data-common-header">
			<h2 v-if="cell.state.title">{{$services.page.translate(cell.state.title)}}</h2>
		</div>
		<div ref="chart" class="chart-container-parent"></div>
	</div>
</template>
