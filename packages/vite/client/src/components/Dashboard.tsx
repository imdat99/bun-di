import { useEffect, useState } from 'preact/hooks';
import { callApi } from '../api';
import { Box, Layers, Component, FileCode } from 'lucide-preact';
import { Card, Typography, Spin, Row, Col } from '@douyinfe/semi-ui';

const { Title, Text } = Typography;

export function Dashboard() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        callApi('stats').then(setStats).catch(console.error);
    }, []);

    if (!stats) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spin size="large" /></div>;

    const cards = [
        { id: 'modules', label: 'Modules', val: stats.modules, icon: Box, color: 'var(--semi-color-primary)' },
        { id: 'controllers', label: 'Controllers', val: stats.controllers, icon: Layers, color: 'var(--semi-color-success)' },
        { id: 'services', label: 'Services', val: stats.services, icon: Component, color: 'var(--semi-color-warning)' },
        { id: 'files', label: 'Total Files', val: stats.files, icon: FileCode, color: 'var(--semi-color-info)' },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <Title heading={3}>Project Overview</Title>
                <Text type="secondary">Real-time statistics of your DI container</Text>
            </div>

            <Row gutter={[16, 16]}>
                {cards.map(c => (
                    <Col span={6} key={c.id} xs={24} sm={12} md={6}>
                        <Card
                            shadows='hover'
                            bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}
                            style={{ borderRadius: '12px' }}
                        >
                            <div>
                                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</Text>
                                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{c.val}</div>
                            </div>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                backgroundColor: `${c.color}20`, color: c.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <c.icon size={24} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
