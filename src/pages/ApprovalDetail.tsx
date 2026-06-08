import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Timeline,
  Form,
  Input,
  Row,
  Col,
  Descriptions,
  Table,
  message,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  PieChartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApprovalsStore } from '@/store/useApprovalsStore';
import { useNavigate, useParams } from 'react-router-dom';
import type { ApprovalFlow, ApprovalFlowType, ApprovalNode } from '@shared/types';
import { mockUsers, mockSettlements, mockSplitRules } from '@/utils/mock';
import {
  APPROVAL_FLOW_TYPES,
  APPROVAL_STATUS,
  USER_ROLES,
  DATETIME_FORMAT,
  BUSINESS_LINES,
} from '@/utils/constants';
import { formatDate, formatDateTime, formatCurrency, getStatusLabel, getStatusColor } from '@/utils/format';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const getApprovalTypeIcon = (type: ApprovalFlowType) => {
  switch (type) {
    case 'split_change':
      return <PieChartOutlined className="text-purple-500 text-xl" />;
    case 'over_budget':
      return <DollarOutlined className="text-orange-500 text-xl" />;
    case 'special_reconciliation':
      return <CheckCircleOutlined className="text-green-500 text-xl" />;
    default:
      return <PieChartOutlined className="text-gray-500 text-xl" />;
  }
};

const getApprovalNo = (flow: ApprovalFlow) => {
  const prefix = flow.type === 'split_change' ? 'SPL' : flow.type === 'over_budget' ? 'OVB' : 'SPC';
  return `${prefix}${dayjs(flow.createdAt).format('YYYYMMDD')}0001`;
};

const getTimelineColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'pending':
      return 'orange';
    default:
      return 'gray';
  }
};

const getApproverName = (node: ApprovalNode) => {
  if (node.approverId) {
    const user = mockUsers.find((u) => u.id === node.approverId);
    return user?.realName || '未知';
  }
  const role = USER_ROLES.find((r) => r.value === node.approverRole);
  return `待${role?.label || node.approverRole}审批`;
};

const SplitChangeContent: React.FC<{ flow: ApprovalFlow }> = ({ flow }) => {
  const rule = mockSplitRules[0];
  const columns: ColumnsType<any> = [
    { title: '分成方', dataIndex: 'key', width: 120 },
    { title: '调整前比例', dataIndex: 'oldValue', width: 140, align: 'right' },
    { title: '调整后比例', dataIndex: 'newValue', width: 140, align: 'right' },
    { title: '变化', dataIndex: 'change', width: 120, align: 'center' },
  ];

  const data = Object.entries(rule.ratios).map(([key, ratio]) => {
    const oldRatio = ratio;
    const newRatio = Math.max(0, Math.min(1, oldRatio + (Math.random() - 0.5) * 0.1));
    const change = ((newRatio - oldRatio) * 100).toFixed(2);
    return {
      key,
      oldValue: `${(oldRatio * 100).toFixed(2)}%`,
      newValue: `${(newRatio * 100).toFixed(2)}%`,
      change: (
        <Tag color={parseFloat(change) > 0 ? 'green' : parseFloat(change) < 0 ? 'red' : 'default'}>
          {parseFloat(change) > 0 ? '+' : ''}{change}%
        </Tag>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="业务线">
          {getStatusLabel(rule.businessLine, BUSINESS_LINES as any)}
        </Descriptions.Item>
        <Descriptions.Item label="规则版本">v{rule.version}</Descriptions.Item>
        <Descriptions.Item label="生效日期">{formatDate(rule.effectiveDate)}</Descriptions.Item>
        <Descriptions.Item label="失效日期">{rule.expiryDate ? formatDate(rule.expiryDate) : '长期有效'}</Descriptions.Item>
      </Descriptions>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        size="small"
      />
      <div className="bg-gray-50 p-4 rounded">
        <Text strong>变更原因：</Text>
        <Paragraph className="mt-2 mb-0">
          业务发展需要，优化分成结构，提升各合作方积极性。经财务部门测算，调整后预计可提升整体利润率约5%。
        </Paragraph>
      </div>
    </div>
  );
};

const OverBudgetContent: React.FC<{ flow: ApprovalFlow }> = ({ flow }) => {
  const settlement = mockSettlements.find((s) => s.overBudget) || mockSettlements[0];
  const overAmount = settlement.totalAmount - settlement.budgetThreshold;
  const overRatio = ((overAmount / settlement.budgetThreshold) * 100).toFixed(2);

  return (
    <div className="space-y-4">
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="结算单号">{settlement.settlementNo}</Descriptions.Item>
        <Descriptions.Item label="业务线">
          {getStatusLabel(settlement.businessLine, require('@/utils/constants').BUSINESS_LINES)}
        </Descriptions.Item>
        <Descriptions.Item label="结算日期">{formatDate(settlement.settlementDate)}</Descriptions.Item>
        <Descriptions.Item label="结算周期">{formatDate(settlement.settlementDate)} 当月</Descriptions.Item>
        <Descriptions.Item label="预算阈值">
          <Text type="secondary">{formatCurrency(settlement.budgetThreshold)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="结算金额">
          <Text type="danger">{formatCurrency(settlement.totalAmount)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="超支金额" span={2}>
          <Text type="danger" strong>{formatCurrency(overAmount)} ({overRatio}%)</Text>
        </Descriptions.Item>
      </Descriptions>
      <div className="bg-orange-50 p-4 rounded border border-orange-200">
        <Text strong type="warning">超支说明：</Text>
        <Paragraph className="mt-2 mb-0">
          本月电商平台促销活动期间收入超预期，导致结算金额超出月度预算。经核实，收入数据真实有效，
          超出部分为正常业务增长所致，建议予以审批通过。
        </Paragraph>
      </div>
    </div>
  );
};

const SpecialReconciliationContent: React.FC<{ flow: ApprovalFlow }> = ({ flow }) => {
  const diffReasons = [
    '银行手续费差异',
    '汇率波动影响',
    '退款冲正调整',
    '优惠券抵扣差异',
  ];
  const reason = diffReasons[Math.floor(Math.random() * diffReasons.length)];

  const columns: ColumnsType<any> = [
    { title: '项目', dataIndex: 'item', width: 150 },
    { title: '系统记录', dataIndex: 'systemAmount', width: 150, align: 'right' },
    { title: '银行记录', dataIndex: 'bankAmount', width: 150, align: 'right' },
    { title: '差异', dataIndex: 'diff', width: 150, align: 'right' },
  ];

  const systemAmount = Math.round(Math.random() * 50000 + 10000);
  const bankAmount = systemAmount + Math.round((Math.random() - 0.5) * 2000);
  const diff = bankAmount - systemAmount;

  const data = [
    {
      item: '交易金额',
      systemAmount: formatCurrency(systemAmount),
      bankAmount: formatCurrency(bankAmount),
      diff: (
        <Text type={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'secondary'}>
          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
        </Text>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="对账日期">{formatDate(dayjs().subtract(3, 'day').toDate())}</Descriptions.Item>
        <Descriptions.Item label="差异类型">{reason}</Descriptions.Item>
        <Descriptions.Item label="涉及笔数">{Math.floor(Math.random() * 10 + 1)} 笔</Descriptions.Item>
        <Descriptions.Item label="差异金额">
          <Text type={diff > 0 ? 'success' : 'danger'}>{formatCurrency(Math.abs(diff))}</Text>
        </Descriptions.Item>
      </Descriptions>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        size="small"
      />
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <Text strong className="text-blue-600">特殊处理说明：</Text>
        <Paragraph className="mt-2 mb-0">
          此差异为{reason}导致，经核实无法通过常规对账流程匹配。申请作为特殊差异处理，
          调整账务记录以保持数据一致性。后续将优化相关流程，避免此类差异再次发生。
        </Paragraph>
      </div>
    </div>
  );
};

export default function ApprovalDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const {
    currentApproval,
    loading,
    fetchApprovalDetail,
    approve,
    reject,
    setCurrentApproval,
  } = useApprovalsStore();

  useEffect(() => {
    if (id) {
      fetchApprovalDetail(id);
    }
    return () => {
      setCurrentApproval(null);
    };
  }, [id, fetchApprovalDetail, setCurrentApproval]);

  const handleApprove = async (values: { comment?: string }) => {
    if (!currentApproval) return;
    const currentNode = currentApproval.nodes.find((n) => n.level === currentApproval.currentNode + 1);
    if (!currentNode) {
      message.error('当前没有待审批的节点');
      return;
    }
    try {
      await approve(currentApproval.id, currentNode.id, values.comment);
      message.success('审批成功');
      setActionType(null);
      form.resetFields();
    } catch {
      message.error('审批失败');
    }
  };

  const handleReject = async (values: { comment: string }) => {
    if (!currentApproval) return;
    const currentNode = currentApproval.nodes.find((n) => n.level === currentApproval.currentNode + 1);
    if (!currentNode) {
      message.error('当前没有待审批的节点');
      return;
    }
    if (!values.comment?.trim()) {
      message.warning('请输入驳回意见');
      return;
    }
    try {
      await reject(currentApproval.id, currentNode.id, values.comment);
      message.success('驳回成功');
      setActionType(null);
      form.resetFields();
    } catch {
      message.error('驳回失败');
    }
  };

  const handleBack = () => {
    navigate('/approvals');
  };

  if (loading && !currentApproval) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!currentApproval) {
    return (
      <div className="p-6">
        <Card>
          <Empty description="审批记录不存在" />
          <div className="text-center mt-4">
            <Button onClick={handleBack} icon={<ArrowLeftOutlined />}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentNode = currentApproval.nodes.find((n) => n.level === currentApproval.currentNode + 1);
  const canOperate = currentApproval.status === 'pending' && currentNode;
  const applicant = mockUsers[Math.floor(Math.random() * mockUsers.length)];

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回
            </Button>
            <Title level={4} className="!mb-0 !ml-4">
              <Space>
                {getApprovalTypeIcon(currentApproval.type)}
                <span>{getApprovalNo(currentApproval)}</span>
                <Tag color={getStatusColor(currentApproval.status, APPROVAL_STATUS)}>
                  {getStatusLabel(currentApproval.status, APPROVAL_STATUS)}
                </Tag>
              </Space>
            </Title>
          </Space>
          {canOperate && (
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => setActionType('approve')}
              >
                同意
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setActionType('reject')}
              >
                驳回
              </Button>
            </Space>
          )}
        </div>

        <Card title="基本信息" size="small" className="mb-4">
          <Descriptions bordered size="small" column={3}>
            <Descriptions.Item label="审批单号">{getApprovalNo(currentApproval)}</Descriptions.Item>
            <Descriptions.Item label="审批类型">
              <Tag color={currentApproval.type === 'split_change' ? 'purple' : currentApproval.type === 'over_budget' ? 'orange' : 'green'}>
                {getStatusLabel(currentApproval.type, APPROVAL_FLOW_TYPES)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(currentApproval.status, APPROVAL_STATUS)}>
                {getStatusLabel(currentApproval.status, APPROVAL_STATUS)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="申请人">
              <Space>
                <UserOutlined />
                {applicant.realName}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              <Space>
                <ClockCircleOutlined />
                {formatDateTime(currentApproval.createdAt)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="当前节点">
              {currentNode
                ? USER_ROLES.find((r) => r.value === currentNode.approverRole)?.label
                : currentApproval.status === 'approved'
                ? '已完成'
                : '已驳回'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="审批流程" size="small" className="mb-4">
          <Timeline
            // @ts-ignore
            mode="horizontal"
            items={currentApproval.nodes.map((node) => ({
              color: getTimelineColor(node.status),
              children: (
                <div className="text-center">
                  <div className="font-medium mb-1">
                    {USER_ROLES.find((r) => r.value === node.approverRole)?.label}
                  </div>
                  <div className="text-sm text-gray-500 mb-1">
                    {getApproverName(node)}
                  </div>
                  <Tag color={getTimelineColor(node.status)}>
                    {getStatusLabel(node.status, APPROVAL_STATUS)}
                  </Tag>
                  {node.approvedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDateTime(node.approvedAt)}
                    </div>
                  )}
                  {node.comment && (
                    <div className="text-xs text-gray-600 mt-1 max-w-32 truncate" title={node.comment}>
                      {node.comment}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        </Card>

        <Card title="申请内容" size="small" className="mb-4">
          {currentApproval.type === 'split_change' && <SplitChangeContent flow={currentApproval} />}
          {currentApproval.type === 'over_budget' && <OverBudgetContent flow={currentApproval} />}
          {currentApproval.type === 'special_reconciliation' && <SpecialReconciliationContent flow={currentApproval} />}
        </Card>

        {actionType && (
          <Card
            title={actionType === 'approve' ? '审批意见' : '驳回意见'}
            size="small"
            className="mb-4"
            bordered
            style={{ borderColor: actionType === 'reject' ? '#ff4d4f' : undefined }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={actionType === 'approve' ? handleApprove : handleReject}
            >
              <Form.Item
                name="comment"
                label={actionType === 'approve' ? '审批意见（选填）' : '驳回意见（必填）'}
                rules={actionType === 'reject' ? [{ required: true, message: '请输入驳回意见' }] : []}
              >
                <TextArea
                  rows={4}
                  placeholder={actionType === 'approve' ? '请输入审批意见' : '请输入驳回原因'}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
              <Row justify="end">
                <Space>
                  <Button
                    onClick={() => {
                      setActionType(null);
                      form.resetFields();
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    danger={actionType === 'reject'}
                    loading={loading}
                  >
                    {actionType === 'approve' ? '确认同意' : '确认驳回'}
                  </Button>
                </Space>
              </Row>
            </Form>
          </Card>
        )}

        <Card title="审批历史" size="small">
          {currentApproval.nodes.filter((n) => n.status !== 'pending').length === 0 ? (
            <Empty description="暂无审批历史" />
          ) : (
            <Timeline
              items={currentApproval.nodes
                .filter((n) => n.status !== 'pending')
                .map((node) => ({
                  color: getTimelineColor(node.status),
                  children: (
                    <div>
                      <div className="flex justify-between items-start">
                        <Space>
                          <Text strong>
                            {USER_ROLES.find((r) => r.value === node.approverRole)?.label}
                          </Text>
                          <Tag color={getTimelineColor(node.status)}>
                            {node.status === 'approved' ? '同意' : '驳回'}
                          </Tag>
                        </Space>
                        <Text type="secondary" className="text-sm">
                          {formatDateTime(node.approvedAt!)}
                        </Text>
                      </div>
                      {node.comment && (
                        <Paragraph className="mt-2 mb-0 text-gray-600">
                          {node.comment}
                        </Paragraph>
                      )}
                    </div>
                  ),
                }))}
            />
          )}
        </Card>
      </Card>
    </div>
  );
}
