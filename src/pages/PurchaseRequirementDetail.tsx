import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Tag,
  Descriptions,
  Timeline,
  Table,
  Space,
  Spin,
  Row,
  Col,
  Empty,
  message,
  Popconfirm,
  Divider,
} from 'antd';
import {
  ArrowLeft,
  Edit2,
  Send,
  FileSearch,
  Sparkles,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { usePurchasesStore } from '../store/usePurchasesStore';
import type { PurchaseRequirement, ApprovalNode, Inquiry } from '@shared/types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';
import { UNITS } from '../utils/constants';

const formatQuantity = (quantity: number, unit: string): string => {
  const unitInfo = UNITS.find(u => u.value === unit);
  return `${formatNumber(quantity, 0)}${unitInfo?.label || unit}`;
};

const formatUnit = (unit: string): string => {
  const unitInfo = UNITS.find(u => u.value === unit);
  return unitInfo?.label || unit;
};
import {
  CATEGORIES,
  PURCHASE_STATUS,
  APPROVAL_STATUS,
  INQUIRY_STATUS,
} from '../utils/constants';
import {
  mockInquiries,
  mockApprovalFlows,
  mockUsers,
  delay,
} from '../utils/mock';

export default function PurchaseRequirementDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    currentRequirement,
    loading,
    fetchDetail,
    submitForApproval,
  } = usePurchasesStore();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [approvalNodes, setApprovalNodes] = useState<ApprovalNode[]>([]);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (requirementId: string) => {
    try {
      await fetchDetail(requirementId);
      await loadRelatedData(requirementId);
    } catch (error) {
      console.error('加载详情失败:', error);
      message.error('加载详情失败');
    }
  };

  const loadRelatedData = async (requirementId: string) => {
    await delay(300);
    const relatedInquiries = mockInquiries.filter(i => i.requirementId === requirementId);
    setInquiries(relatedInquiries);

    const approvalFlow = mockApprovalFlows.find(f => f.relatedId === requirementId);
    if (approvalFlow) {
      setApprovalNodes(approvalFlow.nodes);
    } else {
      setApprovalNodes([
        {
          id: 'node_default_1',
          flowId: 'flow_default',
          level: 1,
          approverRole: 'buyer',
          approverId: undefined,
          status: 'pending',
        },
      ]);
    }
  };

  const handleBack = () => {
    navigate('/purchase-requirements');
  };

  const handleEdit = () => {
    message.info('编辑功能开发中...');
  };

  const handleSubmitApproval = async () => {
    if (!currentRequirement) return;
    try {
      await submitForApproval(currentRequirement.id);
      message.success('提交审批成功');
      loadData(currentRequirement.id);
    } catch (error) {
      console.error('提交审批失败:', error);
      message.error('提交审批失败');
    }
  };

  const handleSmartRecommend = () => {
    message.info('智能推荐功能开发中...');
  };

  const handleCreateInquiry = () => {
    message.info('生成询价单功能开发中...');
  };

  const getApproverName = (approverId?: string) => {
    if (!approverId) return '待分配';
    const user = mockUsers.find(u => u.id === approverId);
    return user?.realName || '未知用户';
  };

  const getApproverRole = (role: string) => {
    const roleMap: Record<string, string> = {
      buyer: '采购员',
      finance: '财务人员',
      finance_director: '财务总监',
      ceo: '总裁',
    };
    return roleMap[role] || role;
  };

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
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

  const inquiryColumns = [
    {
      title: '询价单号',
      dataIndex: 'inquiryNo',
      key: 'inquiryNo',
      render: (text: string) => <span className="font-mono text-primary-600">{text}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '供应商数量',
      dataIndex: 'supplierIds',
      key: 'supplierCount',
      render: (ids: string[]) => `${ids.length} 家`,
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: Date) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={getStatusColor(value, INQUIRY_STATUS)}>
          {getStatusLabel(value, INQUIRY_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Inquiry) => (
        <Button
          type="link"
          size="small"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => navigate(`/inquiry-quotation/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  if (loading && !currentRequirement) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">正在加载详情...</p>
        </div>
      </div>
    );
  }

  if (!currentRequirement) {
    return (
      <div className="page-container">
        <Empty description="采购需求不存在" />
      </div>
    );
  }

  const categoryInfo = CATEGORIES.find(c => c.value === currentRequirement.category);
  const requester = mockUsers.find(u => u.id === currentRequirement.requesterId);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={handleBack}
            className="p-0"
          />
          <div>
            <h1 className="page-title">采购需求详情</h1>
            <p className="text-sm text-neutral-500 mt-1">
              需求编号：<span className="font-mono">{currentRequirement.requirementNo}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentRequirement.status === 'draft' && (
            <>
              <Button
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleSmartRecommend}
              >
                发起智能推荐
              </Button>
              <Button
                icon={<FileSearch className="w-4 h-4" />}
                onClick={handleCreateInquiry}
              >
                生成询价单
              </Button>
              <Button
                type="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={handleSubmitApproval}
              >
                提交审批
              </Button>
              <Button
                icon={<Edit2 className="w-4 h-4" />}
                onClick={handleEdit}
              >
                编辑
              </Button>
            </>
          )}
          {currentRequirement.status === 'approved' && (
            <>
              <Button
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleSmartRecommend}
              >
                发起智能推荐
              </Button>
              <Button
                type="primary"
                icon={<FileSearch className="w-4 h-4" />}
                onClick={handleCreateInquiry}
              >
                生成询价单
              </Button>
            </>
          )}
          <Button onClick={handleBack}>返回</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title flex items-center gap-2 m-0">
                <span className="w-1 h-5 bg-primary-500 rounded-full" />
                基本信息
              </h3>
              <Tag
                color={getStatusColor(currentRequirement.status, PURCHASE_STATUS)}
                className="m-0"
              >
                {getStatusLabel(currentRequirement.status, PURCHASE_STATUS)}
              </Tag>
            </div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="需求编号">
                <span className="font-mono">{currentRequirement.requirementNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="标题">
                {currentRequirement.title}
              </Descriptions.Item>
              <Descriptions.Item label="品类">
                {categoryInfo?.label || currentRequirement.category}
              </Descriptions.Item>
              <Descriptions.Item label="物品名称">
                {currentRequirement.itemName}
              </Descriptions.Item>
              <Descriptions.Item label="规格">
                {currentRequirement.specification}
              </Descriptions.Item>
              <Descriptions.Item label="数量">
                {formatQuantity(currentRequirement.quantity, currentRequirement.unit)}
              </Descriptions.Item>
              <Descriptions.Item label="单位">
                {formatUnit(currentRequirement.unit)}
              </Descriptions.Item>
              <Descriptions.Item label="预算金额">
                <span className="font-semibold text-success-600">
                  {formatCurrency(currentRequirement.budget)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="期望到货日期">
                {formatDate(currentRequirement.expectedDate)}
              </Descriptions.Item>
              <Descriptions.Item label="申请人">
                {requester?.realName || '未知用户'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(currentRequirement.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDateTime(currentRequirement.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {currentRequirement.description || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title flex items-center gap-2 m-0">
                <span className="w-1 h-5 bg-success-500 rounded-full" />
                审批流程
              </h3>
            </div>
            {approvalNodes.length > 0 ? (
              <Timeline
                items={approvalNodes.map((node, index) => ({
                  dot: getTimelineIcon(node.status),
                  color: getTimelineColor(node.status),
                  children: (
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-800">
                          第 {node.level} 级审批 - {getApproverRole(node.approverRole)}
                        </span>
                        <Tag color={getStatusColor(node.status, APPROVAL_STATUS)}>
                          {getStatusLabel(node.status, APPROVAL_STATUS)}
                        </Tag>
                      </div>
                      <p className="text-sm text-neutral-600 mb-1">
                        审批人：{getApproverName(node.approverId)}
                      </p>
                      {node.comment && (
                        <p className="text-sm text-neutral-500">
                          审批意见：{node.comment}
                        </p>
                      )}
                      {node.approvedAt && (
                        <p className="text-xs text-neutral-400 mt-1">
                          审批时间：{formatDateTime(node.approvedAt)}
                        </p>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="暂无审批流程" />
            )}
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title flex items-center gap-2 m-0">
                <span className="w-1 h-5 bg-warning-500 rounded-full" />
                询价记录
              </h3>
            </div>
            {inquiries.length > 0 ? (
              <Table
                rowKey="id"
                columns={inquiryColumns}
                dataSource={inquiries}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="暂无询价记录" />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <h3 className="card-title flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-primary-500 rounded-full" />
              当前状态
            </h3>
            <div className="text-center py-4">
              <Tag
                color={getStatusColor(currentRequirement.status, PURCHASE_STATUS)}
                className="text-base px-4 py-1 mb-4"
              >
                {getStatusLabel(currentRequirement.status, PURCHASE_STATUS)}
              </Tag>
              <Divider className="my-4" />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">创建时间</span>
                  <span className="text-neutral-800">{formatDate(currentRequirement.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">预算金额</span>
                  <span className="font-semibold text-success-600">
                    {formatCurrency(currentRequirement.budget)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">期望到货</span>
                  <span className="text-neutral-800">{formatDate(currentRequirement.expectedDate)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
            <h3 className="card-title flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-purple-500 rounded-full" />
              操作记录
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800">创建采购需求</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {requester?.realName || '张采购'} · {formatDateTime(currentRequirement.createdAt)}
                  </p>
                </div>
              </div>
              {currentRequirement.status !== 'draft' && (
                <div className="flex items-start gap-3 pb-3 border-b border-neutral-100">
                  <div className="w-2 h-2 rounded-full bg-warning-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800">提交审批</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {requester?.realName || '张采购'} · {formatDateTime(currentRequirement.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
