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
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { OperationLog } from '@shared/types';
import { useSystemStore } from '../store/useSystemStore';
import { formatDateTime } from '../utils/format';
import { mockUsers } from '../utils/mock';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const LOG_MODULES = ['收入流水', '分成规则', '结算单', '对账管理', '审批流程', '系统设置'];
const LOG_ACTIONS = ['创建', '修改', '删除', '审批', '导出', '登录', '查询'];

export default function SystemLogs() {
  const {
    operationLogs,
    logsTotal,
    logsPage,
    logsPageSize,
    logFilters,
    loading,
    fetchOperationLogs,
    setLogFilters,
    resetLogFilters,
    exportLogs,
  } = useSystemStore();

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState<OperationLog | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOperationLogs();
  }, [fetchOperationLogs]);

  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      const params: any = {};

      if (values.userId) params.userId = values.userId;
      if (values.module) params.module = values.module;
      if (values.action) params.action = values.action;
      if (values.dateRange) {
        params.startDate = values.dateRange[0].startOf('day').toISOString();
        params.endDate = values.dateRange[1].endOf('day').toISOString();
      }

      setLogFilters(params);
      fetchOperationLogs(params);
    } catch (error) {
      // Validation error
    }
  };

  const handleReset = () => {
    form.resetFields();
    resetLogFilters();
    fetchOperationLogs();
  };

  const handlePageChange = (page: number, pageSize: number) => {
    fetchOperationLogs({ ...logFilters, page, pageSize });
  };

  const handleViewDetail = (log: OperationLog) => {
    setCurrentLog(log);
    setDetailModalVisible(true);
  };

  const handleExport = async () => {
    try {
      await exportLogs();
      message.success('日志导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const getUserName = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId);
    return user?.realName || userId;
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => formatDateTime(date),
      sorter: (a: OperationLog, b: OperationLog) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      render: (userId: string) => getUserName(userId),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => <Tag color="blue">{module}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => {
        const colorMap: Record<string, string> = {
          创建: 'green',
          修改: 'orange',
          删除: 'red',
          审批: 'purple',
          导出: 'cyan',
          登录: 'blue',
          查询: 'default',
        };
        return <Tag color={colorMap[action] || 'default'}>{action}</Tag>;
      },
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 200,
      ellipsis: true,
      render: (id: string) => id || '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string) => ip || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: OperationLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const renderDetailModal = () => (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>操作日志详情</span>
        </Space>
      }
      open={detailModalVisible}
      onCancel={() => setDetailModalVisible(false)}
      footer={null}
      width={700}
    >
      {currentLog && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text type="secondary" className="text-sm">
                操作时间
              </Text>
              <div className="font-medium">{formatDateTime(currentLog.createdAt)}</div>
            </div>
            <div>
              <Text type="secondary" className="text-sm">
                操作用户
              </Text>
              <div className="font-medium">{getUserName(currentLog.userId)}</div>
            </div>
            <div>
              <Text type="secondary" className="text-sm">
                模块
              </Text>
              <div>
                <Tag color="blue">{currentLog.module}</Tag>
              </div>
            </div>
            <div>
              <Text type="secondary" className="text-sm">
                操作类型
              </Text>
              <div>
                <Tag color="orange">{currentLog.action}</Tag>
              </div>
            </div>
            <div>
              <Text type="secondary" className="text-sm">
                资源ID
              </Text>
              <div className="font-medium">{currentLog.resourceId || '-'}</div>
            </div>
            <div>
              <Text type="secondary" className="text-sm">
                IP地址
              </Text>
              <div className="font-medium">{currentLog.ipAddress || '-'}</div>
            </div>
          </div>

          <div>
            <Text type="secondary" className="text-sm block mb-2">
              详细信息 (JSON)
            </Text>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-80 text-sm">
              <code>
                {JSON.stringify(
                  {
                    ...currentLog.details,
                    logId: currentLog.id,
                  },
                  null,
                  2
                )}
              </code>
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="!mb-0">
              操作日志
            </Title>
            <Text type="secondary">记录系统所有用户的操作行为</Text>
          </div>
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出日志
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="mb-4 shadow-sm">
        <Form form={form} layout="inline">
          <Form.Item name="userId" label="用户">
            <Select placeholder="请选择用户" allowClear style={{ width: 150 }}>
              {mockUsers.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.realName}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="module" label="模块">
            <Select placeholder="请选择模块" allowClear style={{ width: 150 }}>
              {LOG_MODULES.map((module) => (
                <Option key={module} value={module}>
                  {module}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="action" label="操作">
            <Select placeholder="请选择操作" allowClear style={{ width: 120 }}>
              {LOG_ACTIONS.map((action) => (
                <Option key={action} value={action}>
                  {action}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker
              showTime
              style={{ width: 300 }}
              maxDate={dayjs()}
            />
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
        <Table
          columns={columns}
          dataSource={operationLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: logsPage,
            pageSize: logsPageSize,
            total: logsTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {renderDetailModal()}
    </div>
  );
}
