import { useRef } from 'preact/hooks';
import { callApi } from '../api';
import { Modal, Form, Toast } from '@douyinfe/semi-ui';

interface GenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPath: string;
    onSuccess: () => void;
}

const ALL_TYPES = ['module', 'controller', 'service', 'provider', 'class', 'interface', 'pipe', 'guard', 'filter', 'interceptor', 'decorator'];
const FLAGS = [{
    value: 'flat',
    description: "Flat | Create files in the same directory"
}, {
    value: 'spec',
    description: "Spec | Create spec (test) files"
}, {
    value: 'skipImport',
    description: "Skipimport | Skip import in module"
}, {
    value: 'force',
    description: "Force | Force overwrite"
}, {
    value: 'dryRun',
    description: "Dryrun | Dry run"
}];

export function GenerateModal({ isOpen, onClose, initialPath, onSuccess }: GenerateModalProps) {
    const formApi = useRef<any>(null);

    const handleSubmit = async () => {
        if (!formApi.current) return;
        try {
            const values = await formApi.current.validate();

            // Map options array to object boolean map
            const optsObj: Record<string, boolean> = {
                flat: false, spec: false, skipImport: false, force: false, dryRun: false
            };
            if (values.opts) {
                values.opts.forEach((o: string) => optsObj[o] = true);
            }

            const res = await callApi('generate', {
                type: values.type,
                name: values.name,
                path: values.path,
                ...optsObj
            });

            if (res.success) {
                Toast.success(`Generated ${res.operations.length} files`);
                onSuccess();
                onClose();
            } else {
                Toast.error(res.errors?.join('\n') || 'Generation failed');
            }
        } catch (err: any) {
            Toast.error(err.message || 'Validation Failed');
        }
    };

    return (
        <Modal
            title="Generate Resource"
            visible={isOpen}
            onOk={handleSubmit}
            okText='Generate'
            afterClose={() => formApi.current?.reset()}
            onCancel={onClose}
            cancelText='Cancel'
            closeOnEsc={true}
            width={400}
        >
            <Form
                getFormApi={api => formApi.current = api}
                style={{ paddingTop: 10 }}
                initValues={{
                    path: initialPath,
                    type: ['controller'],
                    opts: ['spec']
                }}
            >
                <Form.Select
                    field='type'
                    label='Type'
                    multiple
                    showClear
                    style={{ width: '100%' }}
                    placeholder='Select resource type'
                    optionList={ALL_TYPES.map(t => ({ label: t, value: t, className: "capitalize" }))}
                    rules={[{ required: true, message: 'Type is required' }]}
                />
                <Form.Input
                    field='name'
                    label='Name'
                    style={{ width: '100%' }}
                    placeholder='Enter resource name (e.g. auth/user)'
                    rules={[{ required: true, message: 'Name is required' }]}
                />
                <Form.Input
                    field='path'
                    label='Path'
                    style={{ width: '100%' }}
                    placeholder='Enter resource path'
                />
                <Form.CheckboxGroup
                    field='opts'
                    label='Options'
                    style={{ width: '100%' }}
                    options={FLAGS.map(f => ({ label: f.description, value: f.value }))}
                />
            </Form>
        </Modal>
    );
}
