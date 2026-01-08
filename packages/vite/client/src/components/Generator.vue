<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import {
    NModal, NCard, NForm, NFormItem, NInput, NCheckbox, NCheckboxGroup, NSpace, NButton, NGrid, NGridItem, NLog, NTabs, NTabPane
} from 'naive-ui';
import { api, type GenerateType } from '../api';

const props = defineProps<{
    show: boolean;
    initialPath: string;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'success'): void;
}>();

const form = reactive({
    types: [] as GenerateType[],
    name: '',
    path: props.initialPath,
    flat: false,
    spec: true,
    skipImport: false,
    force: false,
    dryRun: false
});

const clientForm = reactive({
    project: 'tsconfig.json',
    output: 'client.d.ts'
});

watch(() => props.initialPath, (val) => {
    form.path = val || 'src';
});

const types: GenerateType[] = [
    'module', 'controller', 'service', 'provider',
    'class', 'interface', 'pipe', 'guard',
    'filter', 'interceptor', 'decorator'
];

const loading = ref(false);
const logs = ref<string>('');

async function generate() {
    if (!form.name || form.types.length === 0) return;

    loading.value = true;
    logs.value = '';
    try {
        const res = await api.generate({ ...form, type: form.types });
        logs.value = res.operations.map(o => `[${o.action.toUpperCase()}] ${o.path}`).join('\n');

        if (res.success && !form.dryRun) {
            setTimeout(() => {
                emit('success');
                if (!res.operations.find(o => o.action === 'error')) emit('update:show', false);
            }, 1500)
        }
    } catch (e: any) {
        logs.value = `[ERROR] ${e.message}`;
    } finally {
        loading.value = false;
    }
}

async function generateClient() {
    loading.value = true;
    logs.value = '';
    try {
        const res = await api.generateClient(clientForm);
        // Assuming undefined response means success or handle explicit error
        if (res && res.error) throw new Error(res.error);

        logs.value = `[SUCCESS] Client SDK generated at ${clientForm.output}`;
        setTimeout(() => {
            emit('success');
            emit('update:show', false);
        }, 1500)
    } catch (e: any) {
        logs.value = `[ERROR] ${e.message}`;
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <NModal :show="show" @update:show="(v) => emit('update:show', v)">
        <NCard style="width: 600px" title="Generator" :bordered="false" size="huge" role="dialog" aria-modal="true">
            <div v-if="logs" style="margin-bottom: 16px; background: #111; padding: 8px; border-radius: 4px;">
                <NLog :log="logs" :rows="5" language="text" />
            </div>

            <NTabs type="line" animated>
                <NTabPane name="resource" tab="Resource">
                    <NForm label-placement="top">
                        <NFormItem label="Types">
                            <NCheckboxGroup v-model:value="form.types">
                                <NGrid :y-gap="8" :cols="3">
                                    <NGridItem v-for="t in types" :key="t">
                                        <NCheckbox :value="t" :label="t.charAt(0).toUpperCase() + t.slice(1)" />
                                    </NGridItem>
                                </NGrid>
                            </NCheckboxGroup>
                        </NFormItem>

                        <NFormItem label="Name" required>
                            <NInput v-model:value="form.name" placeholder="e.g. user-auth" />
                        </NFormItem>

                        <NFormItem label="Path">
                            <NInput v-model:value="form.path" placeholder="src/..." />
                        </NFormItem>

                        <NSpace>
                            <NCheckbox v-model:checked="form.flat" label="Flat" />
                            <NCheckbox v-model:checked="form.spec" label="Spec" />
                            <NCheckbox v-model:checked="form.skipImport" label="Skip Import" />
                            <NCheckbox v-model:checked="form.force" label="Force" />
                            <NCheckbox v-model:checked="form.dryRun" label="Dry Run" />
                        </NSpace>
                    </NForm>
                    <NSpace justify="end" style="margin-top: 24px">
                        <NButton @click="emit('update:show', false)">Cancel</NButton>
                        <NButton type="primary" :loading="loading" :disabled="!form.name || form.types.length === 0"
                            @click="generate">
                            {{ loading ? 'Generating...' : 'Generate Resource' }}
                        </NButton>
                    </NSpace>
                </NTabPane>

                <NTabPane name="client" tab="Client SDK">
                    <NForm label-placement="top">
                        <NFormItem label="Project Config">
                            <NInput v-model:value="clientForm.project" placeholder="tsconfig.json" />
                        </NFormItem>
                        <NFormItem label="Output Path">
                            <NInput v-model:value="clientForm.output" placeholder="client.d.ts" />
                        </NFormItem>
                    </NForm>
                    <NSpace justify="end" style="margin-top: 24px">
                        <NButton @click="emit('update:show', false)">Cancel</NButton>
                        <NButton type="primary" :loading="loading" @click="generateClient">
                            {{ loading ? 'Generating...' : 'Generate Client SDK' }}
                        </NButton>
                    </NSpace>
                </NTabPane>
            </NTabs>
        </NCard>
    </NModal>
</template>
