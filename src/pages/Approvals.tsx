import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Form,
  Row,
  Col,
  Card,
  Modal,
  message,
  Tabs,
  Typography,
  Input,
} from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  PieChartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useApprovalsStore } from '@/store/useApprovalsStore';
import { useNavigate } from 'react-router-dom';
import type { ApprovalFlow, ApprovalFlowType } from '@shared/types';
import {
  APPROVAL_FLOW_TYPES,
  APPROVAL_STATUS,
  DATE_FORMAT,
  USER_ROLES,
} from '@/utils/constants';
import { formatDate, getStatusLabel, getStatusColor } from '@/utils/format';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const getApprovalTypeIcon = (type: ApprovalFlowType) => {
  switch (type) {
    case 'split_change':
      return <PieChartOutlined className="text-purple-500" />;
    case 'over_budget':
      return <DollarOutlined className="text-orange-500" />;
    case 'special_reconciliation':
      return <CheckCircleOutlined className="text-green-500" />;
    default:
      return <PieChartOutlined className="text-gray-500" />;
  }
};

const getApprovalNo = (flow: ApprovalFlow, index: number) => {
  const prefix = flow.type === 'split_change' ? 'SPL' : flow.type === 'over_budget' ? 'OVB' : 'SPC';
  return `${prefix}${dayjs(flow.createdAt).format('YYYYMMDD')}${String(index + 1).padStart(4, '0')}`;
};

const getCurrentNodeLabel = (flow: ApprovalFlow) => {
  if (flow.status === 'approved') return '已完成';
  if (flow.status === 'rejected') return '已驳回';
  const currentNode = flow.nodes.find((n) => n.level === flow.currentNode + 1);
  if (currentNode) {
    const role = USER_ROLES.find((r) => r.value === currentNode.approverRole);
    return role?.label || currentNode.approverRole;
  }
  return '等待中';
};

const getRelatedBusiness = (flow: ApprovalFlow) => {
  const type = getStatusLabel(flow.type, APPROVAL_FLOW_TYPES);
  const businessLines = ['在线教育', '电商平台', 'SaaS订阅', '广告业务'];
  return `${type} - ${businessLines[Math.floor(Math.random() * businessLines.length)]}`;
};

const getApplicant = () => {
  const applicants = ['张财务', '李经理', '王总监', '赵管理员'];
  return applicants[Math.floor(Math.random() * applicants.length)];
};

export default function Approvals() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [batchModalVisible, setBatchModalVisible] = useState<'approve' | 'reject' | null>(null);
  const [batchComment, setBatchComment] = useState('');

  const {
    pendingApprovals,
    myApplications,
    ccApprovals,
    total,
    page,
    pageSize,
    loading,
    filters,
    selectedRowKeys,
    activeTab,
    approvalCount,
    fetchPendingApprovals,
    fetchMyApplications,
    fetchCcApprovals,
    fetchApprovalCount,
    batchApprove,
    batchReject,
    setFilters,
    resetFilters,
    setSelectedRowKeys,
    setActiveTab,
  } = useApprovalsStore();

  useEffect(() => {
    fetchApprovalCount();
    fetchPendingApprovals();
  }, [fetchApprovalCount, fetchPendingApprovals]);

  const handleTabChange = (key: string) => {
    const tab = key as 'pending' | 'my' | 'cc';
    setActiveTab(tab);
    resetFilters();
    form.resetFields();
    if (tab === 'pending') {
      fetchPendingApprovals();
    } else if (tab === 'my') {
      fetchMyApplications();
    } else {
      fetchCcApprovals();
    }
  };

  const handleSearch = (values: any) => {
    const params: any = {};
    if (values.type) params.type = values.type;
    if (values.status) params.status = values.status;
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format(DATE_FORMAT);
      params.endDate = values.dateRange[1].format(DATE_FORMAT);
    }
    setFilters(params);

    if (activeTab === 'pending') {
      fetchPendingApprovals(params);
    } else if (activeTab === 'my') {
      fetchMyApplications(params);
    } else {
      fetchCcApprovals(params);
    }
  };

  const handleReset = () => {
    form.resetFields();
    resetFilters();
    if (activeTab === 'pending') {
      fetchPendingApprovals();
    } else if (activeTab === 'my') {
      fetchMyApplications();
    } else {
      fetchCcApprovals();
    }
  };

  const handleTableChange = (pagination: any) => {
    const params = {
      ...filters,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    if (activeTab === 'pending') {
      fetchPendingApprovals(params);
    } else if (activeTab === 'my') {
      fetchMyApplications(params);
    } else {
      fetchCcApprovals(params);
    }
  };

  const handleViewDetail = (id: string) => {
    navigate(`/approvals/${id}`);
  };

  const handleBatchApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要审批的记录');
      return;
    }
    try {
      await batchApprove(selectedRowKeys, batchComment || '同意');
      message.success(`成功审批 ${selectedRowKeys.length} 条记录`);
      setBatchModalVisible(null);
      setBatchComment('');
    } catch {
      message.error('批量审批失败');
    }
  };

  const handleBatchReject = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要驳回的记录');
      return;
    }
    if (!batchComment.trim()) {
      message.warning('请输入驳回意见');
      return;
    }
    try {
      await batchReject(selectedRowKeys, batchComment);
      message.success(`成功驳回 ${selectedRowKeys.length} 条记录`);
      setBatchModalVisible(null);
      setBatchComment('');
    } catch {
      message.error('批量驳回失败');
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'pending') {
      fetchPendingApprovals();
    } else if (activeTab === 'my') {
      fetchMyApplications();
    } else {
      fetchCcApprovals();
    }
  };

  const getCurrentData = () => {
    if (activeTab === 'pending') return pendingApprovals;
    if (activeTab === 'my') return myApplications;
    return ccApprovals;
  };

  const rowSelection: TableRowSelection<ApprovalFlow> = {
    selectedRowKeys: selectedRowKeys as any,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys.map(String));
    },
    getCheckboxProps: (record) => ({
      disabled: activeTab !== 'pending' || record.status !== 'pending',
    }),
  };

  const columns: ColumnsType<ApprovalFlow> = [
    {
      title: '审批单号',
      dataIndex: 'id',
      key: 'approvalNo',
      width: 200,
      render: (_, record, index) => (
        <Space>
          {getApprovalTypeIcon(record.type)}
          <span className="font-mono">{getApprovalNo(record, index)}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (value) => (
        <Tag color={value === 'split_change' ? 'purple' : value === 'over_budget' ? 'orange' : 'green'}>
          {getStatusLabel(value, APPROVAL_FLOW_TYPES)}
        </Tag>
      ),
    },
    {
      title: '关联业务',
      key: 'relatedBusiness',
      width: 200,
      render: (_, record) => getRelatedBusiness(record),
    },
    activeTab === 'pending' && {
      title: '申请人',
      key: 'applicant',
      width: 100,
      render: () => getApplicant(),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => formatDate(date),
    },
    {
      title: '当前节点',
      key: 'currentNode',
      width: 120,
      render: (_, record) => (
        <Text type={record.status === 'pending' ? 'warning' : record.status === 'approved' ? 'success' : 'danger'}>
          {getCurrentNodeLabel(record)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status, APPROVAL_STATUS)} className="font-medium">
          {getStatusLabel(status, APPROVAL_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ].filter(Boolean) as ColumnsType<ApprovalFlow>;

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span>
          待我审批
          {approvalCount && approvalCount.pending > 0 && (
            <Tag color="orange" className="ml-2">{approvalCount.pending}</Tag>
          )}
        </span>
      ),
      children: null,
    },
    {
      key: 'my',
      label: (
        <span>
          我发起的
          {approvalCount && (approvalCount.pending + approvalCount.approved + approvalCount.rejected) > 0 && (
            <Tag color="blue" className="ml-2">
              {approvalCount.pending + approvalCount.approved + approvalCount.rejected}
            </Tag>
          )}
        </span>
      ),
      children: null,
    },
    {
      key: 'cc',
      label: (
        <span>
          抄送我的
          {approvalCount && approvalCount.approved > 0 && (
            <Tag color="green" className="ml-2">{approvalCount.approved}</Tag>
          )}
        </span>
      ),
      children: null,
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">
            审批工作台
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
            {activeTab === 'pending' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  disabled={selectedRowKeys.length === 0}
                  onClick={() => {
                    setBatchModalVisible('approve');
                    setBatchComment('');
                  }}
                >
                  批量审批
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  disabled={selectedRowKeys.length === 0}
                  onClick={() => {
                    setBatchModalVisible('reject');
                    setBatchComment('');
                  }}
                >
                  批量驳回
                </Button>
              </>
            )}
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="mb-4"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
          className="mb-4"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="type" label="审批类型">
                <Select placeholder="请选择审批类型" allowClear>
                  {APPROVAL_FLOW_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear>
                  {APPROVAL_STATUS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={12}>
              <Form.Item name="dateRange" label="日期范围">
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
          columns={columns}
          dataSource={getCurrentData()}
          rowKey="id"
          loading={loading}
          rowSelection={activeTab === 'pending' ? rowSelection : undefined}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={batchModalVisible === 'approve' ? '批量审批' : '批量驳回'}
        open={batchModalVisible !== null}
        onOk={batchModalVisible === 'approve' ? handleBatchApprove : handleBatchReject}
        onCancel={() => {
          setBatchModalVisible(null);
          setBatchComment('');
        }}
        okText={batchModalVisible === 'approve' ? '确认审批' : '确认驳回'}
        cancelText="取消"
        okButtonProps={{ danger: batchModalVisible === 'reject' }}
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            {batchModalVisible === 'approve'
              ? `您将审批 ${selectedRowKeys.length} 条记录`
              : `您将驳回 ${selectedRowKeys.length} 条记录`}
          </p>
          <TextArea
            rows={4}
            placeholder={batchModalVisible === 'approve' ? '请输入审批意见（选填）' : '请输入驳回意见（必填）'}
            value={batchComment}
            onChange={(e) => setBatchComment(e.target.value)}
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
}
