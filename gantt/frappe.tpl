<template id="frappe-gantt">
	<div class="frappe-gantt">
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
			@refresh="refresh">
			<n-collapsible slot="settings" title="Gantt Content" class="padded">
				<n-form-combo v-model="cell.state.idField" label="Id Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.nameField" label="Name Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.startField" label="Start Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.endField" label="End Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.progressField" label="Progress Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.dependenciesField" label="Dependencies Field" :filter="getKeys" @input="draw"/>
				<n-form-combo v-model="cell.state.viewMode" label="View Mode" :items="['Quarter Day', 'Half Day', 'Day', 'Week', 'Month']" @input="draw"/>
				<n-form-text v-model="cell.state.updateEvent" label="Update Event" info="When updated, this event is emitted" :timeout="600" @input="draw"/>
			</n-collapsible>
		</data-common-header>
		<div ref="chart" :class="$services.page.getDynamicClasses(cell.state.globalStyles, {record:record}, $self)"></div>
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

