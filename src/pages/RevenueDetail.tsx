import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Divider,
  Timeline,
  Typography,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import { useRevenueStore } from '../store/useRevenueStore';
import type { RevenueRecord, SplitDetail, OperationLog } from '@shared/types';
import {
  BUSINESS_LINES,
  CHANNELS,
  RECONCILIATION_STATUS,
} from '../utils/constants';
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';
import { mockOperationLogs } from '../utils/mock';

const { Title, Text } = Typography;

const PARTNER_LABELS: { [key: string]: string } = {
  company: '公司',
  platform: '平台方',
  service: '服务商',
  teacher: '教师',
  rnd: '研发团队',
};

export default function RevenueDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'basic' | 'split' | 'settlement' | 'logs'>('basic');
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);

  const { currentRecord, loading, fetchDetail, setCurrentRecord } = useRevenueStore();

  useEffect(() => {
    if (id) {
      fetchDetail(id);
      const logs = mockOperationLogs.filter(
        (log) => log.resourceId === id || log.module === '收入流水'
      ).slice(0, 10);
      setOperationLogs(logs);
    }
    return () => {
      setCurrentRecord(null);
    };
  }, [id, fetchDetail, setCurrentRecord]);

  if (loading && !currentRecord) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="p-6">
        <Empty description="记录不存在" />
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/revenue')}>返回列表</Button>
        </div>
      </div>
    );
  }

  const renderBasicInfo = (record: RevenueRecord) => (
    <div className="space-y-6">
      <Row gutter={24}>
        <Col span={8}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-sm">
            <Statistic
              title="交易金额"
              value={record.amount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-sm">
            <Statistic
              title="对账状态"
              value={getStatusLabel(record.reconciliationStatus, RECONCILIATION_STATUS as any)}
              valueStyle={{
                color: getStatusColor(record.reconciliationStatus, RECONCILIATION_STATUS as any) === 'green'
                  ? '#52c41a'
                  : getStatusColor(record.reconciliationStatus, RECONCILIATION_STATUS as any) === 'red'
                  ? '#ff4d4f'
                  : '#fa8c16',
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-sm">
            <Statistic
              title="分成方数量"
              value={record.splitDetails?.length || 0}
              valueStyle={{ color: '#722ed1' }}
              suffix="方"
            />
          </Card>
        </Col>
      </Row>

      <Card title="基本信息" className="shadow-sm">
        <Descriptions column={2} bordered size="middle">
          <Descriptions.Item label="交易号">
            <span className="font-mono text-blue-600">{record.transactionNo}</span>
          </Descriptions.Item>
          <Descriptions.Item label="业务线">
            {getStatusLabel(record.businessLine, BUSINESS_LINES as any)}
          </Descriptions.Item>
          <Descriptions.Item label="渠道">
            {getStatusLabel(record.channel, CHANNELS as any)}
          </Descriptions.Item>
          <Descriptions.Item label="客户">
            {record.customer}
          </Descriptions.Item>
          <Descriptions.Item label="金额">
            <span className="font-bold text-blue-600">
              {formatCurrency(record.amount, record.currency)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="币种">
            {record.currency}
          </Descriptions.Item>
          <Descriptions.Item label="交易时间">
            {formatDateTime(record.transactionTime)}
          </Descriptions.Item>
          <Descriptions.Item label="对账状态">
            <Tag color={getStatusColor(record.reconciliationStatus, RECONCILIATION_STATUS as any)}>
              {getStatusLabel(record.reconciliationStatus, RECONCILIATION_STATUS as any)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDateTime(record.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDateTime(record.updatedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="关联结算单" span={2}>
            {record.settlementId ? (
              <Button
                type="link"
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/settlements/${record.settlementId}`)}
              >
                查看结算单
              </Button>
            ) : (
              <Text type="secondary">暂未关联</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderSplitDetails = (record: RevenueRecord) => {
    const splitDetails = record.splitDetails || [];
    const totalAmount = splitDetails.reduce((sum, detail) => sum + detail.amount, 0);

    const columns: ColumnsType<SplitDetail> = [
      {
        title: '分成方',
        dataIndex: 'businessLine',
        key: 'businessLine',
        width: 150,
        render: (value: string) => (
          <Space>
            <UserOutlined className="text-blue-500" />
            {PARTNER_LABELS[value] || value}
          </Space>
        ),
      },
      {
        title: '分成比例',
        dataIndex: 'ratio',
        key: 'ratio',
        width: 150,
        render: (ratio: number) => (
          <Tag color="blue">{formatPercent(ratio)}</Tag>
        ),
      },
      {
        title: '分成金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 150,
        align: 'right',
        render: (amount: number) => (
          <span className="font-bold">{formatCurrency(amount, record.currency)}</span>
        ),
      },
      {
        title: '占比',
        key: 'percentage',
        width: 200,
        render: (_, detail) => {
          const percentage = totalAmount > 0 ? (detail.amount / record.amount) * 100 : 0;
          return (
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span>{percentage.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        },
      },
    ];

    return (
      <Card title="拆分明细" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={splitDetails}
          pagination={false}
          summary={(pageData) => {
            let totalSplitAmount = 0;
            pageData.forEach((data) => {
              totalSplitAmount += data.amount;
            });
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <span className="font-bold">合计</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="font-bold text-blue-600">
                    {formatCurrency(totalSplitAmount, record.currency)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <span className="text-gray-500">
                    差异: {formatCurrency(record.amount - totalSplitAmount, record.currency)}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    );
  };

  const renderSettlementInfo = (record: RevenueRecord) => (
    <Card title="关联结算单" className="shadow-sm">
      {record.settlementId ? (
        <div className="text-center py-8">
          <FileTextOutlined className="text-6xl text-blue-500 mb-4" />
          <p className="text-lg mb-2">结算单号: <span className="font-mono">{record.settlementId}</span></p>
          <Button type="primary" onClick={() => navigate(`/settlements/${record.settlementId}`)}>
            查看结算单详情
          </Button>
        </div>
      ) : (
        <Empty description="该笔收入暂未关联任何结算单" />
      )}
    </Card>
  );

  const renderOperationLogs = () => (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          <span>操作日志</span>
        </Space>
      }
      className="shadow-sm"
    >
      {operationLogs.length > 0 ? (
        <Timeline
          mode="left"
          items={operationLogs.map((log) => ({
            color:
              log.action === '创建'
                ? 'green'
                : log.action === '修改'
                ? 'blue'
                : log.action === '删除'
                ? 'red'
                : 'gray',
            label: formatDateTime(log.createdAt),
            children: (
              <Card size="small" className="shadow-sm mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Tag color="blue">{log.module}</Tag>
                    <Tag color="orange">{log.action}</Tag>
                    <span className="ml-2">
                      操作人: {mockOperationLogs.find((l) => l.userId === log.userId)?.userId || '未知'}
                    </span>
                  </div>
                  {log.ipAddress && (
                    <Text type="secondary" className="text-sm">
                      IP: {log.ipAddress}
                    </Text>
                  )}
                </div>
              </Card>
            ),
          }))}
        />
      ) : (
        <Empty description="暂无操作日志" />
      )}
    </Card>
  );

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: renderBasicInfo(currentRecord),
    },
    {
      key: 'split',
      label: '拆分明细',
      children: renderSplitDetails(currentRecord),
    },
    {
      key: 'settlement',
      label: '关联结算单',
      children: renderSettlementInfo(currentRecord),
    },
    {
      key: 'logs',
      label: '操作日志',
      children: renderOperationLogs(),
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/revenue')}
            >
              返回列表
            </Button>
            <Divider type="vertical" />
            <Title level={4} className="!mb-0">
              收入流水详情
            </Title>
            <Tag color="blue" className="text-sm">
              {currentRecord.transactionNo}
            </Tag>
          </div>
          <Space>
            <Button>编辑</Button>
            <Button type="primary">重新对账</Button>
          </Space>
        </div>
      </Card>

      <Card
        tabList={tabItems}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as any)}
        className="shadow-sm"
        bodyStyle={{ padding: '24px 0 0 0' }}
        headStyle={{ borderBottom: '1px solid #f0f0f0' }}
      >
        <div className="px-6 pb-6">{tabItems.find((item) => item.key === activeTab)?.children}</div>
      </Card>
    </div>
  );
}
