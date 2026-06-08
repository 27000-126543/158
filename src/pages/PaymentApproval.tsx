import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  Descriptions,
  Tabs,
  Space,
  Card,
  message,
  Timeline,
  Alert,
  Row,
  Col,
  Statistic,
  Progress,
} from 'antd';
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  User,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { Payment, PaymentStatus, PaymentType, PurchaseOrder } from '@shared/types';
import { usePaymentsStore } from '../store/usePaymentsStore';
import { useOrdersStore } from '../store/useOrdersStore';
import { useSuppliersStore } from '../store/useSuppliersStore';
import { useApprovalsStore } from '../store/useApprovalsStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/format';
import {
  PAYMENT_STATUS,
  PAYMENT_TYPES,
  DEFAULT_PAGE_SIZE,
  PAYMENT_APPROVAL_THRESHOLDS,
  USER_ROLES,
} from '../utils/constants';
import { mockPayments, mockOrders, mockSuppliers, mockApprovalFlows, mockUsers } from '../utils/mock';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface ApprovalFormData {
  comment: string;
  result: 'approved' | 'rejected';
}

interface PaymentWithOrder extends Payment {
  order?: PurchaseOrder;
}

export default function PaymentApproval() {
  const {
    payments,
    loading,
    fetchPayments,
    approvePayment,
    rejectPayment,
    fetchDetail,
  } = usePaymentsStore();

  const { orders, fetchOrders } = useOrdersStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();

  const [activeTab, setActiveTab] = useState('pending');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<PaymentWithOrder | null>(null);
  const [approvalForm] = Form.useForm<ApprovalFormData>();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchOrders();
    fetchSuppliers();
  }, [fetchPayments, fetchOrders, fetchSuppliers]);

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId) || mockSuppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const getOrderInfo = (orderId: string) => {
    return orders.find(o => o.id === orderId) || mockOrders.find(o => o.id === orderId);
  };

  const getApprovalRoleLabel = (role: string) => {
    const roleInfo = USER_ROLES.find(r => r.value === role);
    return roleInfo?.label || role;
  };

  const getCurrentApprovalNode = (payment: Payment) => {
    const flow = mockApprovalFlows.find(f => f.relatedId === payment.id);
    if (!flow) return null;
    return flow.nodes.find(n => n.status === 'pending');
  };

  const allPayments = useMemo(() => {
    return [...payments, ...mockPayments].map(p => ({
      ...p,
      order: getOrderInfo(p.orderId),
    }));
  }, [payments, orders]);

  const pendingPayments = useMemo(() => {
    return allPayments.filter(p => p.status === 'pending' || p.status === 'processing');
  }, [allPayments]);

  const myInitiatedPayments = useMemo(() => {
    return allPayments.filter(p => p.createdAt);
  }, [allPayments]);

  const completedPayments = useMemo(() => {
    return allPayments.filter(p => p.status === 'approved' || p.status === 'paid' || p.status === 'rejected');
  }, [allPayments]);

  const getApprovalWarning = (amount: number) => {
    if (amount >= PAYMENT_APPROVAL_THRESHOLDS.CEO) {
      return {
        type: 'error' as const,
        message: '该款项超过200万，需要总裁终审',
        icon: <AlertCircle className="w-5 h-5" />,
      };
    }
    if (amount >= PAYMENT_APPROVAL_THRESHOLDS.FINANCE_DIRECTOR) {
      return {
        type: 'warning' as const,
        message: '该款项超过50万，需要财务总监审批',
        icon: <AlertCircle className="w-5 h-5" />,
      };
    }
    return null;
  };

  const handleViewDetail = async (payment: PaymentWithOrder) => {
    try {
      await fetchDetail(payment.id);
      setCurrentPayment(payment);
      setDetailModalVisible(true);
    } catch (error) {
      setCurrentPayment(payment);
      setDetailModalVisible(true);
    }
  };

  const handleApprove = (payment: PaymentWithOrder) => {
    setCurrentPayment(payment);
    approvalForm.resetFields();
    setApprovalModalVisible(true);
  };

  const handleApprovalSubmit = async (values: ApprovalFormData) => {
    if (!currentPayment) return;

    try {
      if (values.result === 'approved') {
        await approvePayment(currentPayment.id);
        message.success('审批通过');
      } else {
        await rejectPayment(currentPayment.id, values.comment);
        message.success('已驳回');
      }
      setApprovalModalVisible(false);
      approvalForm.resetFields();
      fetchPayments();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '付款编号',
      dataIndex: 'paymentNo',
      key: 'paymentNo',
      width: 160,
      render: (text: string) => (
        <span className="font-medium text-primary-600">{text}</span>
      ),
    },
    {
      title: '关联订单',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (_: any, record: PaymentWithOrder) => record.order?.orderNo || '-',
    },
    {
      title: '供应商',
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 200,
      render: (_: any, record: PaymentWithOrder) => getSupplierName(record.order?.supplierId || ''),
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (val: number, record: PaymentWithOrder) => {
        const warning = getApprovalWarning(val);
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">{formatCurrency(val)}</span>
            {warning && <span title={warning.message}>{warning.icon}</span>}
          </div>
        );
      },
    },
    {
      title: '付款类型',
      dataIndex: 'paymentType',
      key: 'paymentType',
      width: 100,
      render: (type: PaymentType) => getStatusLabel(type, PAYMENT_TYPES),
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: Date) => {
        const isOverdue = new Date(date) < new Date();
        return (
          <span className={isOverdue ? 'text-danger-600' : ''}>
            {formatDate(date)}
            {isOverdue && <Tag color="red" className="ml-2">已逾期</Tag>}
          </span>
        );
      },
    },
    {
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PaymentStatus) => (
        <Tag color={getStatusColor(status, PAYMENT_STATUS)}>
          {getStatusLabel(status, PAYMENT_STATUS)}
        </Tag>
      ),
    },
    {
      title: '当前审批节点',
      dataIndex: 'approvalLevel',
      key: 'approvalLevel',
      width: 140,
      render: (_: any, record: PaymentWithOrder) => {
        const currentNode = getCurrentApprovalNode(record);
        if (record.status === 'approved' || record.status === 'paid') {
          return <Tag color="green">已完成</Tag>;
        }
        if (record.status === 'rejected') {
          return <Tag color="red">已驳回</Tag>;
        }
        return currentNode ? (
          <span className="text-primary-600">{getApprovalRoleLabel(currentNode.approverRole)}</span>
        ) : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: PaymentWithOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircle className="w-3.5 h-3.5 text-success-500" />}
                onClick={() => handleApprove(record)}
              >
                审批
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const statsCards = [
    {
      title: '待我审批',
      value: pendingPayments.length.toString(),
      icon: <Clock className="w-5 h-5" />,
      iconBg: 'rgba(255, 125, 0, 0.1)',
      iconColor: '#FF7D00',
      trend: pendingPayments.length > 0 ? `¥${pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}` : undefined,
    },
    {
      title: '本月付款',
      value: '¥285.6万',
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'rgba(0, 180, 42, 0.1)',
      iconColor: '#00B42A',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: '付款笔数',
      value: completedPayments.filter(p => p.status === 'paid').length.toString(),
      icon: <CreditCard className="w-5 h-5" />,
      iconBg: 'rgba(22, 93, 255, 0.1)',
      iconColor: '#165DFF',
    },
    {
      title: '逾期未付',
      value: '3笔',
      icon: <AlertCircle className="w-5 h-5" />,
      iconBg: 'rgba(245, 63, 63, 0.1)',
      iconColor: '#F53F3F',
      trend: '¥156.8万',
    },
  ];

  const paymentTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
    },
    legend: {
      data: ['申请金额', '已付金额'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: {
      type: 'value',
      name: '金额(万)',
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    series: [
      {
        name: '申请金额',
        type: 'bar',
        data: [320, 280, 450, 380, 520, 480],
        itemStyle: { color: 'rgba(22, 93, 255, 0.8)', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '已付金额',
        type: 'bar',
        data: [300, 280, 420, 360, 480, 450],
        itemStyle: { color: 'rgba(0, 180, 42, 0.8)', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  const paymentTypeOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
      },
      data: [
        { value: 45, name: '预付款', itemStyle: { color: '#165DFF' } },
        { value: 30, name: '进度款', itemStyle: { color: '#722ED1' } },
        { value: 60, name: '尾款', itemStyle: { color: '#00B42A' } },
        { value: 15, name: '保证金', itemStyle: { color: '#FF7D00' } },
      ],
    }],
  };

  const filterPayments = (list: PaymentWithOrder[]) => {
    if (!searchText) return list;
    return list.filter(p =>
      p.paymentNo.includes(searchText) ||
      p.order?.orderNo.includes(searchText) ||
      getSupplierName(p.order?.supplierId || '').includes(searchText)
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">付款审批</h1>
          <p className="text-sm text-neutral-500 mt-1">采购付款申请与审批流程</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => {
            fetchPayments();
          }}>
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <div key={index} className="stat-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-neutral-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-neutral-800">{card.value}</p>
                {card.trend && (
                  <p className="text-xs text-neutral-400 mt-1">{card.trend}</p>
                )}
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="card-header">
            <h3 className="card-title">付款趋势</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={paymentTrendOption} style={{ height: 280 }} />
          </div>
        </div>
        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title">付款类型分布</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={paymentTypeOption} style={{ height: 280 }} />
          </div>
        </div>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between mb-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="mb-0"
            items={[
              {
                key: 'pending',
                label: (
                  <span>
                    待我审批
                    <Tag color="orange" className="ml-2">{pendingPayments.length}</Tag>
                  </span>
                ),
              },
              {
                key: 'initiated',
                label: (
                  <span>
                    我发起的
                    <Tag color="blue" className="ml-2">{myInitiatedPayments.length}</Tag>
                  </span>
                ),
              },
              {
                key: 'completed',
                label: (
                  <span>
                    已完成
                    <Tag color="green" className="ml-2">{completedPayments.length}</Tag>
                  </span>
                ),
              },
            ]}
          />
          <Input
            placeholder="搜索付款编号、订单编号、供应商"
            prefix={<Search className="w-4 h-4 text-neutral-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        </div>

        {activeTab === 'pending' && (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filterPayments(pendingPayments)}
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: DEFAULT_PAGE_SIZE,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}

        {activeTab === 'initiated' && (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filterPayments(myInitiatedPayments)}
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: DEFAULT_PAGE_SIZE,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}

        {activeTab === 'completed' && (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filterPayments(completedPayments)}
            loading={loading}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: DEFAULT_PAGE_SIZE,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}
      </Card>

      <Modal
        title="付款详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          currentPayment?.status === 'pending' && (
            <Button key="approve" type="primary" onClick={() => {
              setDetailModalVisible(false);
              handleApprove(currentPayment);
            }}>
              去审批
            </Button>
          ),
        ]}
      >
        {currentPayment && (
          <div className="space-y-6">
            {getApprovalWarning(currentPayment.amount) && (
              <Alert
                type={getApprovalWarning(currentPayment.amount)!.type}
                message={getApprovalWarning(currentPayment.amount)!.message}
                showIcon
                icon={getApprovalWarning(currentPayment.amount)!.icon}
              />
            )}

            <Descriptions title="付款信息" bordered column={2} size="small">
              <Descriptions.Item label="付款编号">{currentPayment.paymentNo}</Descriptions.Item>
              <Descriptions.Item label="付款状态">
                <Tag color={getStatusColor(currentPayment.status, PAYMENT_STATUS)}>
                  {getStatusLabel(currentPayment.status, PAYMENT_STATUS)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="付款类型">
                {getStatusLabel(currentPayment.paymentType, PAYMENT_TYPES)}
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                <span className="font-bold text-danger-600 text-lg">
                  {formatCurrency(currentPayment.amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="币种">{currentPayment.currency}</Descriptions.Item>
              <Descriptions.Item label="到期日期">
                {formatDate(currentPayment.dueDate)}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(currentPayment.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="实际支付日期">
                {currentPayment.actualPaidDate ? formatDate(currentPayment.actualPaidDate) : '-'}
              </Descriptions.Item>
            </Descriptions>

            {currentPayment.order && (
              <Descriptions title="订单信息" bordered column={2} size="small">
                <Descriptions.Item label="订单编号">{currentPayment.order.orderNo}</Descriptions.Item>
                <Descriptions.Item label="物品名称">{currentPayment.order.itemName}</Descriptions.Item>
                <Descriptions.Item label="供应商">
                  {getSupplierName(currentPayment.order.supplierId)}
                </Descriptions.Item>
                <Descriptions.Item label="订单金额">
                  {formatCurrency(currentPayment.order.totalAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="数量">
                  {currentPayment.order.quantity} {currentPayment.order.unit}
                </Descriptions.Item>
                <Descriptions.Item label="交货日期">
                  {formatDate(currentPayment.order.deliveryDate)}
                </Descriptions.Item>
              </Descriptions>
            )}

            <Card size="small" title="多级审批流程">
              <Timeline
                items={mockApprovalFlows[0]?.nodes.map((node, index) => {
                  const isCurrent = node.status === 'pending' && index === mockApprovalFlows[0].currentNode;
                  return {
                    color: node.status === 'approved' ? 'green' : 
                           node.status === 'rejected' ? 'red' : 
                           isCurrent ? 'blue' : 'gray',
                    dot: isCurrent ? <Clock className="w-4 h-4" /> : undefined,
                    children: (
                      <div className={`${isCurrent ? 'font-medium' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span>
                            {getApprovalRoleLabel(node.approverRole)}
                          </span>
                          {isCurrent && <Tag color="blue">当前节点</Tag>}
                          <Tag color={
                            node.status === 'approved' ? 'green' :
                            node.status === 'rejected' ? 'red' : 'default'
                          }>
                            {node.status === 'approved' ? '已通过' :
                             node.status === 'rejected' ? '已驳回' : '待审批'}
                          </Tag>
                        </div>
                        {node.approverId && (
                          <p className="text-sm text-neutral-500 mt-1">
                            <User className="w-3.5 h-3.5 inline mr-1" />
                            {mockUsers.find(u => u.id === node.approverId)?.realName || node.approverId}
                          </p>
                        )}
                        {node.comment && (
                          <p className="text-sm text-neutral-600 mt-1">
                            <FileText className="w-3.5 h-3.5 inline mr-1" />
                            {node.comment}
                          </p>
                        )}
                        {node.approvedAt && (
                          <p className="text-xs text-neutral-400 mt-1">
                            {formatDate(node.approvedAt)}
                          </p>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            </Card>

            {currentPayment.status === 'pending' && (
              <Card size="small" className="bg-primary-50 border-primary-200">
                <Row gutter={16} align="middle">
                  <Col span={16}>
                    <p className="font-medium text-primary-700 mb-1">待您审批</p>
                    <p className="text-sm text-primary-600">
                      该款项金额为 {formatCurrency(currentPayment.amount)}，请核对相关单据后进行审批
                    </p>
                  </Col>
                  <Col span={8} className="text-right">
                    <Button type="primary" onClick={() => {
                      setDetailModalVisible(false);
                      handleApprove(currentPayment);
                    }}>
                      立即审批
                    </Button>
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="审批付款"
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          approvalForm.resetFields();
        }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => {
            setApprovalModalVisible(false);
            approvalForm.resetFields();
          }}>
            取消
          </Button>,
          <Button key="reject" danger onClick={() => {
            approvalForm.setFieldsValue({ result: 'rejected' });
            approvalForm.submit();
          }}>
            驳回
          </Button>,
          <Button key="approve" type="primary" onClick={() => {
            approvalForm.setFieldsValue({ result: 'approved' });
            approvalForm.submit();
          }}>
            通过
          </Button>,
        ]}
      >
        {currentPayment && (
          <div className="space-y-4">
            {getApprovalWarning(currentPayment.amount) && (
              <Alert
                type={getApprovalWarning(currentPayment.amount)!.type}
                message={getApprovalWarning(currentPayment.amount)!.message}
                showIcon
                icon={getApprovalWarning(currentPayment.amount)!.icon}
              />
            )}

            <Card size="small" className="bg-neutral-50">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="付款编号" className="font-medium text-primary-600">
                  {currentPayment.paymentNo}
                </Descriptions.Item>
                <Descriptions.Item label="金额">
                  <span className="font-bold text-danger-600">
                    {formatCurrency(currentPayment.amount)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="付款类型">
                  {getStatusLabel(currentPayment.paymentType, PAYMENT_TYPES)}
                </Descriptions.Item>
                <Descriptions.Item label="供应商">
                  {getSupplierName(currentPayment.order?.supplierId || '')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Form
              form={approvalForm}
              layout="vertical"
              onFinish={handleApprovalSubmit}
            >
              <Form.Item name="result" hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name="comment"
                label="审批意见"
                rules={[
                  { required: true, message: '请填写审批意见' },
                  { min: 2, message: '审批意见至少2个字符' },
                ]}
              >
                <TextArea rows={4} placeholder="请填写审批意见..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
