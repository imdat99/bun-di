<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import {
    NLayout, NLayoutHeader, NLayoutSider, NLayoutContent,
    NTree, NButton, NInput, NSpace, type TreeOption, NIcon
} from 'naive-ui';
import { api, type TreeNode } from '../api';
import Generator from '../components/Generator.vue';

// Simple text icons for fallback if icons fail
const FolderIcon = () => h('span', null, '📁');
const FileIcon = () => h('span', null, '📄');

const tree = ref<TreeNode | null>(null);
const searchQuery = ref('');
const isGeneratorOpen = ref(false);
const selectedKeys = ref<string[]>([]);

// Mapping function for NTree
function mapTreeToOption(node: TreeNode): TreeOption {
    return {
        label: node.name,
        key: node.path,
        isLeaf: node.type === 'file',
        children: node.children?.map(mapTreeToOption),
        prefix: () => node.type === 'dir' ? h(FolderIcon) : h(FileIcon)
    };
}

const treeOptions = computed(() => {
    return tree.value ? [mapTreeToOption(tree.value)] : [];
});

async function fetchTree() {
    try {
        const res = await api.getTree();
        tree.value = res.tree;
    } catch (e) {
        console.error(e);
    }
}

function onNodeSelect(keys: string[]) {
    if (keys.length) {
        selectedKeys.value = keys;
    }
}

const nodeProps = ({ option }: { option: TreeOption }) => {
    return {
        onContextmenu(e: MouseEvent) {
            e.preventDefault();
        }
    }
}

function openGenerator() {
    isGeneratorOpen.value = true;
}

onMounted(() => {
    fetchTree();
    if (import.meta.hot) {
        import.meta.hot.on('hono-di:update', (data: any) => {
            tree.value = data.tree;
        });
    }
});
</script>

<template>
    <NLayout position="absolute">
        <NLayoutHeader bordered
            style="height: 50px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between;">
            <NSpace align="center">
                <span style="font-weight: bold;">EXPLORER</span>
            </NSpace>
            <NSpace>
                <NInput v-model:value="searchQuery" placeholder="Search..." size="small" />
                <NButton secondary size="small" @click="fetchTree">
                    Refresh
                </NButton>
                <NButton type="primary" size="small" @click="openGenerator">
                    Generate
                </NButton>
            </NSpace>
        </NLayoutHeader>

        <NLayout has-sider position="absolute" style="top: 50px; bottom: 0">
            <NLayoutSider collapse-mode="transform" :collapsed-width="0" :width="300" show-trigger="arrow-circle"
                content-style="padding: 12px;" bordered>
                <NTree block-line expand-on-click :data="treeOptions" :pattern="searchQuery"
                    :selected-keys="selectedKeys" @update:selected-keys="onNodeSelect" :node-props="nodeProps" />
            </NLayoutSider>
            <NLayoutContent
                content-style="padding: 24px; display: flex; justify-content: center; align-items: center; color: #666;">
                <div v-if="selectedKeys.length">
                    Selected: {{ selectedKeys[0] }}
                    <!-- Placeholder for file content or details -->
                </div>
                <div v-else>Select a file to view details</div>
            </NLayoutContent>
        </NLayout>

        <Generator v-model:show="isGeneratorOpen" :initial-path="selectedKeys[0] || 'src'" @success="fetchTree" />
    </NLayout>
</template>
