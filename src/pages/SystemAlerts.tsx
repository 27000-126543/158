import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Select,
  DatePicker,
  Modal,
  Typography,
  Tag,
  message,
  Checkbox,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  BellOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { SystemAlert, AlertLevel, AlertType } from '@shared/types';
import { useSystemStore } from '../store/useSystemStore';
import { ALERT_LEVELS, ALERT_TYPES } from '../utils/constants';
import { formatDateTime, getStatusLabel, getStatusColor } from '../utils/format';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ALERT_STATUS = [
  { value: 'unread', label: '未读', color: 'red' },
  { value: 'read', label: '已读', color: 'blue' },
  { value: 'resolved', label: '已解决', color: 'green' },
] as const;

const getLevelConfig = (level: AlertLevel) => {
  const configs: Record<AlertLevel, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
    info: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: <InfoCircleOutlined className="text-blue-500" />,
      label: '信息',
    },
    warning: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: <WarningOutlined className="text-orange-500" />,
      label: '警告',
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: <CloseCircleOutlined className="text-red-500" />,
      label: '错误',
    },
    critical: {
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      icon: <ExclamationCircleOutlined className="text-red-700" />,
      label: '严重',
    },
  };
  return configs[level];
};

export default function SystemAlerts() {
  const {
    alerts,
    alertsTotal,
    alertsPage,
    alertsPageSize,
    alertFilters,
    unreadAlertCount,
    loading,
    fetchAlerts,
    markAlertAsRead,
    markAllAlertsAsRead,
    resolveAlert,
    fetchUnreadAlertCount,
    setAlertFilters,
    resetAlertFilters,
    batchMarkAsRead,
    batchResolve,
  } = useSystemStore();

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SystemAlert | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAlerts();
    fetchUnreadAlertCount();
  }, [fetchAlerts, fetchUnreadAlertCount]);

  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      const params: any = {};

      if (values.level) params.level = values.level;
      if (values.type) params.type = values.type;
      if (values.status) params.status = values.status;
      if (values.dateRange) {
        params.startDate = values.dateRange[0].startOf('day').toISOString();
        params.endDate = values.dateRange[1].endOf('day').toISOString();
      }

      setAlertFilters(params);
      fetchAlerts(params);
    } catch (error) {
      // Validation error
    }
  };

  const handleReset = () => {
    form.resetFields();
    resetAlertFilters();
    fetchAlerts();
    setSelectedRowKeys([]);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    fetchAlerts({ ...alertFilters, page, pageSize });
  };

  const handleViewDetail = (alert: SystemAlert) => {
    setCurrentAlert(alert);
    setDetailModalVisible(true);
    if (alert.status === 'unread') {
      markAlertAsRead(alert.id);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAlertAsRead(id);
      message.success('已标记为已读');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      message.success('已标记为已解决');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAlertsAsRead();
      message.success('全部标记为已读');
      fetchAlerts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择告警');
      return;
    }
    try {
      await batchMarkAsRead(selectedRowKeys);
      message.success(`已将 ${selectedRowKeys.length} 条告警标记为已读`);
      setSelectedRowKeys([]);
      fetchAlerts();
    } catch (error) {
      message.error('批量操作失败');
    }
  };

  const handleBatchResolve = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择告警');
      return;
    }
    try {
      await batchResolve(selectedRowKeys);
      message.success(`已将 ${selectedRowKeys.length} 条告警标记为已解决`);
      setSelectedRowKeys([]);
      fetchAlerts();
    } catch (error) {
      message.error('批量操作失败');
    }
  };

  const batchMenuItems: MenuProps['items'] = [
    {
      key: 'read',
      label: '标记已读',
      icon: <CheckCircleOutlined />,
      onClick: handleBatchMarkAsRead,
    },
    {
      key: 'resolve',
      label: '标记解决',
      icon: <CheckSquareOutlined />,
      onClick: handleBatchResolve,
    },
  ];

  const columns = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: AlertLevel) => {
        const config = getLevelConfig(level);
        return (
          <Tag color={ALERT_LEVELS.find((l) => l.value === level)?.color}>
            <span className="flex items-center gap-1">
              {config.icon}
              {config.label}
            </span>
          </Tag>
        );
      },
      filters: ALERT_LEVELS.map((l) => ({ text: l.label, value: l.value })),
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: AlertType) => {
        const typeInfo = ALERT_TYPES.find((t) => t.value === type);
        return <Tag color="blue">{typeInfo?.label || type}</Tag>;
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string, record: SystemAlert) => (
        <div className="flex items-center gap-2">
          {record.status === 'unread' && (
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
          )}
          <span
            className={`cursor-pointer hover:text-blue-600 ${
              record.status === 'unread' ? 'font-semibold' : ''
            }`}
            onClick={() => handleViewDetail(record)}
          >
            {title}
          </span>
        </div>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => content,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => formatDateTime(date),
      sorter: (a: SystemAlert, b: SystemAlert) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: SystemAlert['status']) => {
        const statusInfo = ALERT_STATUS.find((s) => s.value === status);
        return <Tag color={statusInfo?.color}>{statusInfo?.label || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: any, record: SystemAlert) => (
        <Space size="small">
          {record.status === 'unread' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleMarkAsRead(record.id)}
            >
              标记已读
            </Button>
          )}
          {record.status !== 'resolved' && (
            <Button
              type="link"
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={() => handleResolve(record.id)}
            >
              标记解决
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderDetailModal = () => (
    <Modal
      title={
        <Space>
          <BellOutlined />
          <span>告警详情</span>
        </Space>
      }
      open={detailModalVisible}
      onCancel={() => setDetailModalVisible(false)}
      footer={
        currentAlert && currentAlert.status !== 'resolved' ? (
          <Space>
            {currentAlert.status === 'unread' && (
              <Button onClick={() => handleMarkAsRead(currentAlert.id)}>
                标记已读
              </Button>
            )}
            <Button
              type="primary"
              onClick={() => {
                handleResolve(currentAlert.id);
                setDetailModalVisible(false);
              }}
            >
              标记解决
            </Button>
          </Space>
        ) : null
      }
      width={600}
    >
      {currentAlert && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${getLevelConfig(currentAlert.level).bgColor}`}>
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {getLevelConfig(currentAlert.level).icon}
              </span>
              <div className="flex-1">
                <Title level={5} className={`!mb-1 ${getLevelConfig(currentAlert.level).color}`}>
                  {currentAlert.title}
                </Title>
                <div className="flex items-center gap-2">
                  <Tag color={ALERT_LEVELS.find((l) => l.value === currentAlert.level)?.color}>
                    {getLevelConfig(currentAlert.level).label}
                  </Tag>
                  <Tag color="blue">
                    {ALERT_TYPES.find((t) => t.value === currentAlert.type)?.label ||
                      currentAlert.type}
                  </Tag>
                  <Tag
                    color={ALERT_STATUS.find((s) => s.value === currentAlert.status)?.color}
                  >
                    {ALERT_STATUS.find((s) => s.value === currentAlert.status)?.label ||
                      currentAlert.status}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Text type="secondary" className="text-sm block mb-1">
                告警时间
              </Text>
              <div className="font-medium">{formatDateTime(currentAlert.createdAt)}</div>
            </div>

            <div>
              <Text type="secondary" className="text-sm block mb-1">
                告警内容
              </Text>
              <Paragraph className="mb-0">{currentAlert.content}</Paragraph>
            </div>

            {currentAlert.relatedId && (
              <div>
                <Text type="secondary" className="text-sm block mb-1">
                  关联ID
                </Text>
                <div className="font-mono text-sm">{currentAlert.relatedId}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  const alertStats = [
    { level: 'critical' as AlertLevel, label: '严重', count: alerts.filter((a) => a.level === 'critical').length },
    { level: 'error' as AlertLevel, label: '错误', count: alerts.filter((a) => a.level === 'error').length },
    { level: 'warning' as AlertLevel, label: '警告', count: alerts.filter((a) => a.level === 'warning').length },
    { level: 'info' as AlertLevel, label: '信息', count: alerts.filter((a) => a.level === 'info').length },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="!mb-0">
              系统告警
            </Title>
            <Text type="secondary">监控和处理系统异常告警</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchAlerts(); fetchUnreadAlertCount(); }}>
              刷新
            </Button>
            <Button icon={<CheckCircleOutlined />} onClick={handleMarkAllAsRead}>
              全部已读
            </Button>
          </Space>
        </div>
      </Card>

      <div className="mb-4 flex gap-4">
        <Card size="small" className="flex-1 shadow-sm">
          <div className="flex items-center gap-3">
            <BellOutlined className="text-xl text-blue-500" />
            <div>
              <Text type="secondary" className="text-xs">
                未读告警
              </Text>
              <div className="font-bold text-lg text-blue-600">{unreadAlertCount}</div>
            </div>
          </div>
        </Card>
        {alertStats.map((stat) => {
          const config = getLevelConfig(stat.level);
          return (
            <Card size="small" key={stat.level} className="flex-1 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{config.icon}</span>
                <div>
                  <Text type="secondary" className="text-xs">
                    {stat.label}
                  </Text>
                  <div className={`font-bold text-lg ${config.color}`}>{stat.count}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-4 shadow-sm">
        <Form form={form} layout="inline">
          <Form.Item name="level" label="级别">
            <Select placeholder="请选择级别" allowClear style={{ width: 120 }}>
              {ALERT_LEVELS.map((level) => (
                <Option key={level.value} value={level.value}>
                  {level.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select placeholder="请选择类型" allowClear style={{ width: 150 }}>
              {ALERT_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear style={{ width: 120 }}>
              {ALERT_STATUS.map((status) => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker style={{ width: 260 }} maxDate={dayjs()} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="shadow-sm">
        {selectedRowKeys.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span>
              已选择 <span className="font-semibold text-blue-600">{selectedRowKeys.length}</span> 项
            </span>
            <Dropdown menu={{ items: batchMenuItems }}>
              <Button>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: alertsPage,
            pageSize: alertsPageSize,
            total: alertsTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条告警`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
          onRow={(record) => ({
            onClick: () => handleViewDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {renderDetailModal()}
    </div>
  );
}
