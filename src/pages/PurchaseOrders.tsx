import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Timeline,
  Space,
  Card,
  message,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import {
  Search,
  RefreshCw,
  Eye,
  Truck,
  FileText,
  CreditCard,
  Filter,
  Plus,
  Download,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { PurchaseOrder, LogisticsStatus, PurchaseOrderStatus } from '@shared/types';
import { useOrdersStore } from '../store/useOrdersStore';
import { useSuppliersStore } from '../store/useSuppliersStore';
import { useReceiptsStore } from '../store/useReceiptsStore';
import { usePaymentsStore } from '../store/usePaymentsStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/format';
import {
  CATEGORIES,
  ORDER_STATUS,
  LOGISTICS_STATUS,
  PAYMENT_TERMS,
  DEFAULT_PAGE_SIZE,
} from '../utils/constants';
import { mockSuppliers, mockApprovalFlows } from '../utils/mock';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

interface LogisticsFormData {
  logisticsStatus: LogisticsStatus;
  trackingNumber: string;
  shippingCompany: string;
  remark?: string;
}

export default function PurchaseOrders() {
  const {
    orders,
    total,
    page,
    pageSize,
    loading,
    fetchOrders,
    updateLogistics,
    updateLogisticsStatus,
    setFilters,
    resetFilters,
  } = useOrdersStore();

  const { suppliers, fetchSuppliers } = useSuppliersStore();
  const { createReceipt } = useReceiptsStore();
  const { createPayment } = usePaymentsStore();

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [logisticsModalVisible, setLogisticsModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null);
  const [logisticsForm] = Form.useForm<LogisticsFormData>();
  const [filterForm] = Form.useForm();

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, [fetchOrders, fetchSuppliers]);

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId) || mockSuppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const handleSearch = (values: any) => {
    const filters: any = {
      keyword: values.keyword,
      supplierId: values.supplierId,
      status: values.status,
      category: values.category,
    };
    if (values.dateRange) {
      filters.startDate = values.dateRange[0]?.format('YYYY-MM-DD');
      filters.endDate = values.dateRange[1]?.format('YYYY-MM-DD');
    }
    setFilters(filters);
    fetchOrders(filters);
  };

  const handleReset = () => {
    filterForm.resetFields();
    resetFilters();
    fetchOrders();
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setFilters({ page: newPage, pageSize: newPageSize });
    fetchOrders({ page: newPage, pageSize: newPageSize });
  };

  const handleViewDetail = (order: PurchaseOrder) => {
    setCurrentOrder(order);
    setDetailModalVisible(true);
  };

  const handleUpdateLogistics = (order: PurchaseOrder) => {
    setCurrentOrder(order);
    logisticsForm.setFieldsValue({
      logisticsStatus: order.logisticsStatus,
      trackingNumber: order.trackingNumber,
      shippingCompany: order.shippingCompany,
    });
    setLogisticsModalVisible(true);
  };

  const handleLogisticsSubmit = async (values: LogisticsFormData) => {
    if (!currentOrder) return;
    try {
      await updateLogisticsStatus(currentOrder.id, values.logisticsStatus);
      if (values.trackingNumber && values.shippingCompany) {
        await updateLogistics(currentOrder.id, values.trackingNumber, values.shippingCompany);
      }
      message.success('物流信息更新成功');
      setLogisticsModalVisible(false);
      logisticsForm.resetFields();
    } catch (error) {
      message.error('物流信息更新失败');
    }
  };

  const handleCreateReceipt = async (order: PurchaseOrder) => {
    try {
      await createReceipt({
        orderId: order.id,
        receivedQuantity: order.quantity,
        acceptedQuantity: order.quantity,
        rejectedQuantity: 0,
        status: 'inspecting',
        receivedById: 'user_001',
      });
      message.success('入库单已生成');
    } catch (error) {
      message.error('生成入库单失败');
    }
  };

  const handleCreatePayment = async (order: PurchaseOrder) => {
    try {
      await createPayment({
        orderId: order.id,
        amount: order.totalAmount,
        currency: order.currency,
        paymentType: 'final',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        approvalLevel: order.totalAmount > 2000000 ? 2 : order.totalAmount > 500000 ? 1 : 0,
      });
      message.success('付款申请已发起');
    } catch (error) {
      message.error('发起付款申请失败');
    }
  };

  const getLogisticsTimeline = (status: LogisticsStatus) => {
    const statusOrder: LogisticsStatus[] = ['pending', 'picked', 'in_transit', 'delivered', 'signed'];
    const statusLabels: Record<LogisticsStatus, string> = {
      pending: '待发货',
      picked: '已揽收',
      in_transit: '运输中',
      delivered: '已送达',
      signed: '已签收',
    };
    
    return statusOrder.map((s, index) => {
      const currentIndex = statusOrder.indexOf(status);
      return {
        color: index <= currentIndex ? 'green' : 'gray',
        children: (
          <div className="py-1">
            <p className="font-medium text-neutral-700">{statusLabels[s]}</p>
            <p className="text-sm text-neutral-400">
              {index <= currentIndex ? formatDate(new Date()) : '待处理'}
            </p>
          </div>
        ),
      };
    });
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (text: string) => (
        <span className="font-medium text-primary-600">{text}</span>
      ),
    },
    {
      title: '物品名称',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '供应商',
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 200,
      render: (supplierId: string) => getSupplierName(supplierId),
      ellipsis: true,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val: number, record: PurchaseOrder) => `${val} ${record.unit}`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      render: (val: number) => (
        <span className="font-semibold text-neutral-800">{formatCurrency(val)}</span>
      ),
    },
    {
      title: '交货日期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
      render: (date: Date) => formatDate(date),
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PurchaseOrderStatus) => (
        <Tag color={getStatusColor(status, ORDER_STATUS)}>
          {getStatusLabel(status, ORDER_STATUS)}
        </Tag>
      ),
    },
    {
      title: '物流状态',
      dataIndex: 'logisticsStatus',
      key: 'logisticsStatus',
      width: 100,
      render: (status: LogisticsStatus) => (
        <Tag color={getStatusColor(status, LOGISTICS_STATUS)}>
          {getStatusLabel(status, LOGISTICS_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: PurchaseOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Truck className="w-3.5 h-3.5" />}
            onClick={() => handleUpdateLogistics(record)}
          >
            更新物流
          </Button>
          <Popconfirm
            title="确认生成入库单？"
            onConfirm={() => handleCreateReceipt(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<Package className="w-3.5 h-3.5" />}>
              生成入库单
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认发起付款申请？"
            onConfirm={() => handleCreatePayment(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CreditCard className="w-3.5 h-3.5" />}>
              发起付款
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statsCards = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    return [
      {
        title: '总订单数',
        value: total.toString(),
        icon: <FileText className="w-5 h-5" />,
        iconBg: 'rgba(22, 93, 255, 0.1)',
        iconColor: '#165DFF',
      },
      {
        title: '进行中',
        value: (statusCounts['processing'] || 0).toString(),
        icon: <Clock className="w-5 h-5" />,
        iconBg: 'rgba(255, 125, 0, 0.1)',
        iconColor: '#FF7D00',
      },
      {
        title: '已发货',
        value: (statusCounts['shipped'] || 0).toString(),
        icon: <Truck className="w-5 h-5" />,
        iconBg: 'rgba(114, 46, 209, 0.1)',
        iconColor: '#722ED1',
      },
      {
        title: '已完成',
        value: (statusCounts['completed'] || 0).toString(),
        icon: <CheckCircle className="w-5 h-5" />,
        iconBg: 'rgba(0, 180, 42, 0.1)',
        iconColor: '#00B42A',
      },
    ];
  }, [orders, total]);

  const orderTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
    },
    legend: {
      data: ['订单数量', '订单金额'],
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
      boundaryGap: false,
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C' },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      {
        type: 'value',
        name: '金额(万)',
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '订单数量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#165DFF' },
        itemStyle: { color: '#165DFF' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 93, 255, 0.25)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.02)' },
            ],
          },
        },
        data: [32, 45, 38, 52, 47, 56],
      },
      {
        name: '订单金额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        yAxisIndex: 1,
        lineStyle: { width: 3, color: '#00B42A' },
        itemStyle: { color: '#00B42A' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 180, 42, 0.25)' },
              { offset: 1, color: 'rgba(0, 180, 42, 0.02)' },
            ],
          },
        },
        data: [280, 350, 420, 380, 520, 580],
      },
    ],
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">采购订单</h1>
          <p className="text-sm text-neutral-500 mt-1">采购订单的创建与管理</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={handleReset}>
            刷新
          </Button>
          <Button icon={<Download className="w-4 h-4" />}>
            导出
          </Button>
          <Button type="primary" icon={<Plus className="w-4 h-4" />}>
            新建订单
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
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={handleSearch}
          className="mb-0"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="keyword" label="订单编号/物品名称">
                <Input
                  placeholder="请输入订单编号或物品名称"
                  prefix={<Search className="w-4 h-4 text-neutral-400" />}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="supplierId" label="供应商">
                <Select placeholder="请选择供应商" allowClear showSearch>
                  {[...suppliers, ...mockSuppliers].map(supplier => (
                    <Option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="category" label="品类">
                <Select placeholder="请选择品类" allowClear>
                  {CATEGORIES.map(cat => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" label="订单状态">
                <Select placeholder="请选择状态" allowClear>
                  {ORDER_STATUS.map(status => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={16} lg={12}>
              <Form.Item name="dateRange" label="日期范围">
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['开始日期', '结束日期']}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label=" " className="!mb-0">
                <Space className="w-full justify-end">
                  <Button onClick={handleReset}>重置</Button>
                  <Button type="primary" htmlType="submit" icon={<Filter className="w-4 h-4" />}>
                    查询
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title">订单趋势</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={orderTrendOption} style={{ height: 300 }} />
          </div>
        </div>
        <div className="card animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="card-header">
            <h3 className="card-title">订单状态分布</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts
              option={{
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { orient: 'vertical', left: 'left', top: 'center' },
                series: [{
                  type: 'pie',
                  radius: ['45%', '70%'],
                  center: ['65%', '50%'],
                  avoidLabelOverlap: false,
                  itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
                  label: { show: false },
                  emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: 'bold' },
                  },
                  data: [
                    { value: total, name: '总订单', itemStyle: { color: '#165DFF' } },
                    { value: orders.filter(o => o.status === 'processing').length, name: '处理中', itemStyle: { color: '#FF7D00' } },
                    { value: orders.filter(o => o.status === 'shipped').length, name: '已发货', itemStyle: { color: '#722ED1' } },
                    { value: orders.filter(o => o.status === 'completed').length, name: '已完成', itemStyle: { color: '#00B42A' } },
                  ],
                }],
              }}
              style={{ height: 300 }}
            />
          </div>
        </div>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '700ms' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: pageSize || DEFAULT_PAGE_SIZE,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handlePageChange,
          }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentOrder && (
          <div className="space-y-6">
            <Descriptions title="基本信息" bordered column={2} size="small">
              <Descriptions.Item label="订单编号">{currentOrder.orderNo}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={getStatusColor(currentOrder.status, ORDER_STATUS)}>
                  {getStatusLabel(currentOrder.status, ORDER_STATUS)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="物品名称">{currentOrder.itemName}</Descriptions.Item>
              <Descriptions.Item label="规格">{currentOrder.specification}</Descriptions.Item>
              <Descriptions.Item label="供应商">{getSupplierName(currentOrder.supplierId)}</Descriptions.Item>
              <Descriptions.Item label="数量">{currentOrder.quantity} {currentOrder.unit}</Descriptions.Item>
              <Descriptions.Item label="单价">{formatCurrency(currentOrder.unitPrice)}</Descriptions.Item>
              <Descriptions.Item label="总金额">
                <span className="font-bold text-danger-600">{formatCurrency(currentOrder.totalAmount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="交货日期">{formatDate(currentOrder.deliveryDate)}</Descriptions.Item>
              <Descriptions.Item label="付款条件">
                {getStatusLabel(currentOrder.paymentTerms, PAYMENT_TERMS)}
              </Descriptions.Item>
              <Descriptions.Item label="收货地址">{currentOrder.deliveryAddress}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(currentOrder.createdAt)}</Descriptions.Item>
            </Descriptions>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card size="small" title="物流信息">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">物流状态</span>
                    <Tag color={getStatusColor(currentOrder.logisticsStatus, LOGISTICS_STATUS)}>
                      {getStatusLabel(currentOrder.logisticsStatus, LOGISTICS_STATUS)}
                    </Tag>
                  </div>
                  {currentOrder.trackingNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">运单号</span>
                      <span className="font-medium">{currentOrder.trackingNumber}</span>
                    </div>
                  )}
                  {currentOrder.shippingCompany && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">物流公司</span>
                      <span>{currentOrder.shippingCompany}</span>
                    </div>
                  )}
                  <Timeline
                    items={getLogisticsTimeline(currentOrder.logisticsStatus)}
                    className="mt-4"
                  />
                </div>
              </Card>

              <Card size="small" title="审批流程">
                <Timeline
                  items={mockApprovalFlows[0]?.nodes.map((node, index) => ({
                    color: node.status === 'approved' ? 'green' : node.status === 'rejected' ? 'red' : 'gray',
                    children: (
                      <div>
                        <p className="font-medium">
                          {node.approverRole === 'finance' ? '财务人员' :
                           node.approverRole === 'finance_director' ? '财务总监' :
                           node.approverRole === 'ceo' ? '总裁' : node.approverRole}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {node.status === 'approved' ? '已审批' : node.status === 'rejected' ? '已驳回' : '待审批'}
                          {node.approvedAt && ` · ${formatDate(node.approvedAt)}`}
                        </p>
                        {node.comment && (
                          <p className="text-sm text-neutral-600 mt-1">意见：{node.comment}</p>
                        )}
                      </div>
                    ),
                  }))}
                />
              </Card>
            </div>

            <Card size="small" title="付款记录">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={[{
                  id: '1',
                  paymentNo: 'PAY-2024-0025',
                  type: '预付款',
                  amount: formatCurrency(currentOrder.totalAmount * 0.3),
                  status: '已支付',
                  paidDate: formatDate(new Date()),
                }]}
                columns={[
                  { title: '付款编号', dataIndex: 'paymentNo' },
                  { title: '付款类型', dataIndex: 'type' },
                  { title: '金额', dataIndex: 'amount' },
                  { title: '状态', dataIndex: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                  { title: '支付日期', dataIndex: 'paidDate' },
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="更新物流信息"
        open={logisticsModalVisible}
        onCancel={() => {
          setLogisticsModalVisible(false);
          logisticsForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setLogisticsModalVisible(false);
            logisticsForm.resetFields();
          }}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => logisticsForm.submit()}>
            确认更新
          </Button>,
        ]}
      >
        <Form
          form={logisticsForm}
          layout="vertical"
          onFinish={handleLogisticsSubmit}
        >
          <Form.Item
            name="logisticsStatus"
            label="物流状态"
            rules={[{ required: true, message: '请选择物流状态' }]}
          >
            <Select placeholder="请选择物流状态">
              {LOGISTICS_STATUS.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="trackingNumber"
            label="运单号"
            rules={[{ required: false, message: '请输入运单号' }]}
          >
            <Input placeholder="请输入运单号" />
          </Form.Item>
          <Form.Item
            name="shippingCompany"
            label="物流公司"
            rules={[{ required: false, message: '请输入物流公司' }]}
          >
            <Select placeholder="请选择或输入物流公司" allowClear showSearch>
              <Option value="顺丰速运">顺丰速运</Option>
              <Option value="京东物流">京东物流</Option>
              <Option value="中通快递">中通快递</Option>
              <Option value="圆通速递">圆通速递</Option>
              <Option value="德邦物流">德邦物流</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
