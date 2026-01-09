import { Notification } from '@douyinfe/semi-ui';
export async function callApi(endpoint: string, body?: any) {
    const r = await fetch(`/__hono_di/api/${endpoint}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || 'Unknown error');
    if (endpoint.includes("create") || endpoint.includes("generate") || endpoint.includes("delete") || endpoint.includes("move"))
    Notification.success({
        title: 'Success',
        content: `API call to ${endpoint} succeeded.`,
        duration: 2000
    });
    return res;
}
