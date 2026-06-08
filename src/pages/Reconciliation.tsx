/**
 * @deprecated 此页面属于旧的收入分成与结算管理系统，当前项目为采购管理系统
 * 此页面已不再使用，保留仅作历史参考
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Typography,
  message,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  FlagOutlined,
  FileTextOutlined,
  SyncOutlined,
  AlertOutlined,
  SearchOutlined,
  ClearOutlined,
  BankOutlined,
  DashboardOutlined,
  BarChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import type { ReconciliationDiff, BankTransaction } from '@shared/types';
import {
  DIFF_TYPES,
  DIFF_STATUS,
  BANK_MATCH_STATUS,
  DATE_FORMAT,
} from '@/utils/constants';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getStatusLabel,
  getStatusColor,
} from '@/utils/format';
import { mockUsers, mockRevenueRecords } from '@/utils/mock';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function Reconciliation() {
  const [diffForm] = Form.useForm();
  const [workOrderForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [reconcileDate, setReconcileDate] = useState<string>(dayjs().format(DATE_FORMAT));
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [workOrderModalVisible, setWorkOrderModalVisible] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<ReconciliationDiff | null>(null);

  const {
    diffs,
    totalDiffs,
    page,
    pageSize,
    summary,
    loading,
    diffFilters,
    fetchDiffs,
    fetchSummary,
    startReconciliation,
    resolveDiff,
    markAsSpecial,
    createWorkOrder,
    setDiffFilters,
    resetDiffFilters,
  } = useReconciliationStore();

  const [diffRate, setDiffRate] = useState(0);
  const [diffAmount, setDiffAmount] = useState(0);

  useEffect(() => {
    const startDate = dayjs().subtract(30, 'day').format(DATE_FORMAT);
    const endDate = dayjs().format(DATE_FORMAT);
    fetchDiffs();
    fetchSummary({ startDate, endDate });
  }, [fetchDiffs, fetchSummary]);

  useEffect(() => {
    if (summary) {
      const rate =
        summary.totalTransactions > 0
          ? summary.diffCount / summary.totalTransactions
          : 0;
      setDiffRate(rate);

      const amount = diffs.reduce((sum, d) => sum + d.diffAmount, 0);
      setDiffAmount(amount);
    }
  }, [summary, diffs]);

  const matchedCount = summary?.matched || 0;
  const totalCount = summary?.totalTransactions || 0;
  const progressPercent = totalCount > 0 ? (matchedCount / totalCount) * 100 : 0;

  const handleSearch = (values: any) => {
    const params: any = {};
    if (values.diffType) params.diffType = values.diffType;
    if (values.status) params.status = values.status;
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format(DATE_FORMAT);
      params.endDate = values.dateRange[1].format(DATE_FORMAT);
    }
    setDiffFilters(params);
    fetchDiffs(params);
  };

  const handleReset = () => {
    searchForm.resetFields();
    resetDiffFilters();
    fetchDiffs();
  };

  const handleTableChange = (pagination: any) => {
    fetchDiffs({
      ...diffFilters,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const handleStartReconciliation = async () => {
    try {
      await startReconciliation(reconcileDate);
      message.success('对账任务已启动');
      setReconcileModalVisible(false);
      const startDate = dayjs().subtract(30, 'day').format(DATE_FORMAT);
      const endDate = dayjs().format(DATE_FORMAT);
      fetchSummary({ startDate, endDate });
      fetchDiffs();
    } catch (error) {
      message.error('启动对账失败');
    }
  };

  const handleMarkDiff = async (values: any) => {
    if (!selectedDiff) return;
    try {
      if (values.status === 'special') {
        await markAsSpecial(selectedDiff.id, values.reason);
      } else {
        await resolveDiff(selectedDiff.id, values.status, values.comment);
      }
      message.success('操作成功');
      setDiffModalVisible(false);
      diffForm.resetFields();
      fetchDiffs();
      const startDate = dayjs().subtract(30, 'day').format(DATE_FORMAT);
      const endDate = dayjs().format(DATE_FORMAT);
      fetchSummary({ startDate, endDate });
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCreateWorkOrder = async (values: any) => {
    if (!selectedDiff) return;
    try {
      await createWorkOrder(selectedDiff.id, values);
      message.success('工单创建成功');
      setWorkOrderModalVisible(false);
      workOrderForm.resetFields();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const openMarkDiffModal = (record: ReconciliationDiff) => {
    setSelectedDiff(record);
    diffForm.setFieldsValue({
      status: record.status,
    });
    setDiffModalVisible(true);
  };

  const openWorkOrderModal = (record: ReconciliationDiff) => {
    setSelectedDiff(record);
    const diffTypeLabel = getStatusLabel(record.diffType, DIFF_TYPES);
    workOrderForm.setFieldsValue({
      title: `${diffTypeLabel}处理`,
      description: `差异金额：${formatCurrency(record.diffAmount)}，请尽快核实处理。`,
    });
    setWorkOrderModalVisible(true);
  };

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'amount_mismatch':
        return <BarChartOutlined className="text-orange-500" />;
      case 'missing_bank':
        return <MinusCircleOutlined className="text-red-500" />;
      case 'excess_bank':
        return <PlusCircleOutlined className="text-yellow-500" />;
      case 'missing_system':
        return <CloseCircleOutlined className="text-purple-500" />;
      default:
        return <AlertOutlined className="text-gray-500" />;
    }
  };

  const getDiffTypeColor = (type: string) => {
    switch (type) {
      case 'amount_mismatch':
        return 'orange';
      case 'missing_bank':
        return 'red';
      case 'excess_bank':
        return 'gold';
      case 'missing_system':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return '-';
    const user = mockUsers.find((u) => u.id === assigneeId);
    return user?.realName || '-';
  };

  const getRelatedTransactionNo = (record: ReconciliationDiff) => {
    if (record.revenueId) {
      const revenue = mockRevenueRecords.find((r) => r.id === record.revenueId);
      return revenue?.transactionNo || '-';
    }
    return '-';
  };

  const diffColumns: ColumnsType<ReconciliationDiff> = [
    {
      title: '差异类型',
      dataIndex: 'diffType',
      key: 'diffType',
      width: 160,
      render: (type) => (
        <Space>
          {getDiffTypeIcon(type)}
          <Tag color={getDiffTypeColor(type)} className="font-medium">
            {getStatusLabel(type, DIFF_TYPES)}
          </Tag>
        </Space>
      ),
    },
    {
      title: '差异金额',
      dataIndex: 'diffAmount',
      key: 'diffAmount',
      width: 140,
      align: 'right',
      render: (amount) => (
        <span className="font-semibold text-red-500">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: '关联流水',
      key: 'relatedTransaction',
      width: 200,
      render: (_, record) => (
        <span className="font-mono text-sm">{getRelatedTransactionNo(record)}</span>
      ),
    },
    {
      title: '对账日期',
      dataIndex: 'reconciliationDate',
      key: 'reconciliationDate',
      width: 140,
      render: (date) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status, DIFF_STATUS)} className="font-medium">
          {getStatusLabel(status, DIFF_STATUS)}
        </Tag>
      ),
    },
    {
      title: '处理人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      render: (assigneeId) => getAssigneeName(assigneeId),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<FlagOutlined />}
            onClick={() => openMarkDiffModal(record)}
            disabled={record.status === 'resolved'}
          >
            标记处理
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => openWorkOrderModal(record)}
          >
            生成工单
          </Button>
        </Space>
      ),
    },
  ];

  const progressColor = progressPercent >= 95 ? '#52c41a' : progressPercent >= 80 ? '#1890ff' : '#faad14';

  return (
    <div className="p-6">
      {diffRate > 0.01 && (
        <Alert
          message="差异率告警"
          description={
            <div className="flex items-center justify-between">
              <span>
                当前差异率为 <span className="font-bold">{formatPercent(diffRate)}</span>，已超过 1% 阈值，请及时处理。
              </span>
              <Button type="primary" danger icon={<AlertOutlined />}>
                启动专项对账
              </Button>
            </div>
          }
          type="error"
          showIcon
          icon={<WarningOutlined />}
          className="mb-4"
          closable
        />
      )}

      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">
            <DashboardOutlined className="text-blue-500 mr-2" />
            银行对账中心
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                const startDate = dayjs().subtract(30, 'day').format(DATE_FORMAT);
                const endDate = dayjs().format(DATE_FORMAT);
                fetchSummary({ startDate, endDate });
                fetchDiffs();
              }}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => setReconcileModalVisible(true)}
            >
              执行对账
            </Button>
          </Space>
        </div>

        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">对账进度</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {progressPercent.toFixed(1)}%
                  </p>
                </div>
                <div className="w-16 h-16">
                  <Progress
                    type="circle"
                    percent={Math.round(progressPercent)}
                    size={64}
                    strokeColor={progressColor}
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                已匹配 {matchedCount} / {totalCount} 笔
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertOutlined className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">差异笔数</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary?.diffCount || 0}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                待处理 {summary?.pending || 0} 笔
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <BankOutlined className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">差异金额</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(diffAmount)}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                已解决 {summary?.resolved || 0} 笔
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              size="small"
              className={
                diffRate > 0.01
                  ? 'bg-gradient-to-br from-red-50 to-red-100'
                  : 'bg-gradient-to-br from-green-50 to-green-100'
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 ${
                    diffRate > 0.01 ? 'bg-red-500' : 'bg-green-500'
                  } rounded-full flex items-center justify-center`}
                >
                  {diffRate > 0.01 ? (
                    <WarningOutlined className="text-white text-xl" />
                  ) : (
                    <CheckCircleOutlined className="text-white text-xl" />
                  )}
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">差异率</p>
                  <p
                    className={`text-2xl font-bold ${
                      diffRate > 0.01 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatPercent(diffRate)}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                阈值：1.00%
                {diffRate > 0.01 && <span className="text-red-500 ml-2">已超标</span>}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card className="mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChartOutlined className="text-blue-500" />
          <span className="font-medium text-lg">差异列表</span>
        </div>

        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
          className="mb-4"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="diffType" label="差异类型">
                <Select placeholder="请选择差异类型" allowClear>
                  {DIFF_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="status" label="处理状态">
                <Select placeholder="请选择状态" allowClear>
                  {DIFF_STATUS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="dateRange" label="对账日期">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} className="text-right">
              <Space>
                <Button onClick={handleReset} icon={<ClearOutlined />}>
                  重置
                </Button>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  查询
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        <Table
          columns={diffColumns}
          dataSource={diffs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: totalDiffs,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="执行对账"
        open={reconcileModalVisible}
        onOk={handleStartReconciliation}
        onCancel={() => setReconcileModalVisible(false)}
        okText="开始对账"
        cancelText="取消"
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            选择对账日期，系统将自动匹配该日期的银行流水与系统收入记录。
          </p>
          <DatePicker
            style={{ width: '100%' }}
            value={dayjs(reconcileDate)}
            onChange={(date) => date && setReconcileDate(date.format(DATE_FORMAT))}
          />
        </div>
      </Modal>

      <Modal
        title="标记差异处理"
        open={diffModalVisible}
        onOk={() => diffForm.submit()}
        onCancel={() => {
          setDiffModalVisible(false);
          diffForm.resetFields();
        }}
        okText="确认"
        cancelText="取消"
      >
        <Form form={diffForm} layout="vertical" onFinish={handleMarkDiff}>
          <Form.Item
            name="status"
            label="处理方式"
            rules={[{ required: true, message: '请选择处理方式' }]}
          >
            <Select>
              <Option value="resolved">已解决</Option>
              <Option value="special">特殊处理</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="原因说明"
            rules={[{ required: true, message: '请输入原因说明' }]}
          >
            <TextArea rows={4} placeholder="请输入处理原因或说明" />
          </Form.Item>
          <Form.Item name="comment" label="备注">
            <TextArea rows={3} placeholder="可选：补充备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="生成工单"
        open={workOrderModalVisible}
        onOk={() => workOrderForm.submit()}
        onCancel={() => {
          setWorkOrderModalVisible(false);
          workOrderForm.resetFields();
        }}
        okText="创建工单"
        cancelText="取消"
      >
        <Form form={workOrderForm} layout="vertical" onFinish={handleCreateWorkOrder}>
          <Form.Item
            name="title"
            label="工单标题"
            rules={[{ required: true, message: '请输入工单标题' }]}
          >
            <Input placeholder="请输入工单标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="问题描述"
            rules={[{ required: true, message: '请输入问题描述' }]}
          >
            <TextArea rows={4} placeholder="请详细描述问题" />
          </Form.Item>
          <Form.Item
            name="assignee"
            label="指派给"
            rules={[{ required: true, message: '请选择处理人' }]}
          >
            <Select placeholder="请选择处理人">
              {mockUsers.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.realName} ({user.role === 'finance' ? '财务' : user.role === 'business_manager' ? '业务经理' : '管理员'})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
