/* eslint-disable vue/one-component-per-file */
import OutputLines from './OutputLines.vue';
import { RawInventoryField } from './raw-inventory';
import './style.scss';
import { ExecutionTimeField } from './ExecutionTimeField.js';

const HISTORY_MODELS = ['History', 'OneHistory', 'ProjectHistory'];
const HISTORY_LIST_PATHS = ['/history/', '/project/{id}/history/'];
const HISTORY_DETAIL_PATHS = ['/history/{id}/', '/project/{id}/history/{history_id}/'];

export { ExecutionTimeField };

export class ProjectBasedFkField extends spa.fields.fk.fk.FKField {
    _formatQuerysetPath(queryset) {
        return super
            ._formatQuerysetPath(queryset)
            .clone({ url: queryset.url.replace('{id}', this.props.projectId) });
    }
}
ProjectBasedFkField.format = 'project-fk';
spa.signals.once('APP_CREATED', (app) => {
    app.fieldsResolver.registerField('integer', ProjectBasedFkField.format, ProjectBasedFkField);
});

export const modePlaybookField = (projectId) => ({
    name: 'mode',
    format: ProjectBasedFkField.format,
    'x-options': {
        list_paths: ['/project/{id}/playbook/'],
        value_field: 'id',
        view_field: 'playbook',
        makeLink: true,
        usePrefetch: true,
        filter_name: 'pb_filter',
        filter_field_name: 'playbook',
        projectId,
    },
});

export const modeModuleField = (projectId) => ({
    name: 'mode',
    format: ProjectBasedFkField.format,
    'x-options': {
        list_paths: ['/project/{id}/module/'],
        value_field: 'id',
        view_field: 'name',
        filter_name: 'name',
        filter_field_name: 'name',
        makeLink: true,
        usePrefetch: true,
        projectId,
    },
});

export const initiatorField = {
    template: (projectId) => ({
        format: ProjectBasedFkField.format,
        name: 'initiator',
        'x-options': {
            list_paths: ['/project/{id}/execution_templates/'],
            makeLink: true,
            usePrefetch: true,
            view_field: 'name',
            value_field: 'id',
            projectId,
        },
    }),
    scheduler: (projectId) => ({
        format: ProjectBasedFkField.format,
        name: 'initiator',
        'x-options': {
            list_paths: ['/project/{id}/periodic_task/'],
            makeLink: true,
            usePrefetch: true,
            view_field: 'name',
            value_field: 'id',
            projectId,
        },
    }),
    project: () => ({
        format: 'fk',
        'x-options': {
            list_paths: ['/project/'],
            makeLink: true,
            usePrefetch: true,
            view_field: 'name',
            value_field: 'id',
        },
    }),
};

for (const modelName of HISTORY_MODELS) {
    setupModel(modelName);
}

export function setupModel(modelName) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        if (fields.initiator) {
            fields.initiator.format = 'dynamic';
            fields.initiator['x-options'] = {
                callback: ({ initiator_type, project = app.application.$route.params.id }) =>
                    initiatorField[initiator_type](project),
                field: ['initiator_type', 'project'],
            };
        }
        if (fields.mode) {
            fields.mode.format = 'dynamic';
            fields.mode['x-options'] = {
                callback: ({ kind, project = app.application.$route.params.id }) => {
                    if (kind === 'PLAYBOOK') {
                        return modePlaybookField(project);
                    } else if (kind === 'MODULE') {
                        return modeModuleField(project);
                    }
                },
                field: ['kind', 'project'],
            };
        }
    });
}

const modelListFields = ['options', 'initiator_type', 'kind', 'project'];

export function hideListColumns(modelName, listFields) {
    spa.signals.once(`models[${modelName}].fields.beforeInit`, (fields) => {
        for (const field of listFields) {
            if (fields[field]) fields[field].hidden = true;
        }
    });
}

for (const modelName of HISTORY_MODELS) {
    hideListColumns(modelName, modelListFields);
}

spa.signals.once('models[OneHistory].fields.beforeInit', (fields) => {
    fields.execute_args.format = 'json';
    fields.raw_inventory.format = RawInventoryField.format;
    fields.execution_time.format = ExecutionTimeField.format;

    for (const field of ['raw_args', 'raw_stdout', 'inventory']) {
        fields[field].hidden = true;
    }
});

spa.signals.once('allModels.created', ({ models }) => {
    const OneHistory = models.get('OneHistory');
    for (const field of ['kind', 'raw_args', 'raw_stdout', 'initiator_type']) {
        OneHistory.fields.get(field).hidden = true;
    }
});

/**
 * @vue/component
 */
const HistoryDetailView = {
    computed: {
        title() {
            return this.$t('History');
        },
        beforeFieldsGroupsComponent() {
            return OutputLines;
        },
        modelsFieldsWrapperClasses() {
            return 'col-md-6 history-info';
        },
        isInProgress() {
            return ['RUN', 'DELAY'].includes(this.instance && this.instance.status);
        },
        fieldsGroups() {
            return [
                {
                    title: '',
                    wrapperClasses: 'col-12',
                    fields: [
                        'id',
                        'status',
                        'executor',
                        'revision',
                        'mode',
                        'execute_args',
                        'execution_time',
                        'start_time',
                        'stop_time',
                        'initiator',
                    ],
                },
                {
                    title: 'Raw inventory',
                    wrapperClasses: 'col-12',
                    fields: ['raw_inventory'],
                },
            ];
        },
    },
    watch: {
        isInProgress: function (newVal, oldVal) {
            if (!newVal && oldVal) this.stopAutoUpdate();
        },
    },
    methods: {
        shouldStartAutoupdate() {
            return (
                spa.components.page.PageViewComponent.methods.shouldStartAutoupdate.call(this) &&
                this.isInProgress
            );
        },
    },
};

/**
 * @vue/component
 */
const HideDetailOperationsMixin = {
    computed: {
        sublinks() {
            return Array.from(this.view.sublinks.values()).filter((sublink) => {
                if (sublink.name === 'facts') {
                    return (
                        this.data.status === 'OK' && this.data.kind === 'MODULE' && this.data.mode === 'setup'
                    );
                }
                return true;
            });
        },
        actions() {
            return Array.from(this.view.actions.values()).filter((action) => {
                switch (action.name) {
                    case 'cancel':
                        return this.data.status === 'RUN' || this.data.status === 'DELAY';
                    case 'clear':
                        return false;
                }
                return true;
            });
        },
    },
};

/**
 * @vue/component
 */
const HideListOperationsMixin = {
    computed: {
        instanceSublinks() {
            return spa.components.list.ListViewComponent.computed.instanceSublinks
                .call(this)
                .filter((sublink) => sublink.name !== 'facts');
        },
        instanceActions() {
            return spa.components.list.ListViewComponent.computed.instanceActions
                .call(this)
                .filter((action) => action.name !== 'cancel' && action.name !== 'clear');
        },
    },
};

for (const path of HISTORY_DETAIL_PATHS) {
    setupDetailView(path);
}

for (const path of HISTORY_LIST_PATHS) {
    setupListView(path);
}

export function setupDetailView(path) {
    spa.signals.once('allViews.created', ({ views }) => {
        const detailView = views.get(path);
        detailView.mixins.push(HistoryDetailView, HideDetailOperationsMixin);
    });
}

export function setupListView(path) {
    spa.signals.once('allViews.created', ({ views }) => {
        const listView = views.get(path);
        listView.mixins.push(HideListOperationsMixin);
        listView.multiActions.delete('cancel');
        listView.multiActions.delete('clear');
    });
}
