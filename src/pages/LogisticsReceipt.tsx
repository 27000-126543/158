import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Tabs,
  Space,
  Card,
  message,
  Upload,
  Radio,
  Progress,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  Search,
  RefreshCw,
  Eye,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload as UploadIcon,
  Package,
  Truck,
  Clock,
  FileText,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { PurchaseOrder, Receipt, ReceiptStatus } from '@shared/types';
import { useOrdersStore } from '../store/useOrdersStore';
import { useReceiptsStore } from '../store/useReceiptsStore';
import { useSuppliersStore } from '../store/useSuppliersStore';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/format';
import {
  ORDER_STATUS,
  LOGISTICS_STATUS,
  RECEIPT_STATUS,
  DEFAULT_PAGE_SIZE,
} from '../utils/constants';
import { mockOrders, mockSuppliers, mockReceipts } from '../utils/mock';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface InspectionFormData {
  orderNo: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  inspectionReport?: string;
  inspectionResult: 'all_qualified' | 'partial_qualified' | 'all_rejected';
}

interface ReceiptWithOrder extends Receipt {
  order?: PurchaseOrder;
}

export default function LogisticsReceipt() {
  const { orders, fetchOrders } = useOrdersStore();
  const { receipts, fetchReceipts, createReceipt, updateReceipt, startInspection, acceptReceipt, rejectReceipt } = useReceiptsStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();

  const [activeTab, setActiveTab] = useState('pending');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [inspectionModalVisible, setInspectionModalVisible] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptWithOrder | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null);
  const [inspectionForm] = Form.useForm<InspectionFormData>();
  const [searchText, setSearchText] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchReceipts();
    fetchSuppliers();
  }, [fetchOrders, fetchReceipts, fetchSuppliers]);

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId) || mockSuppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const getOrderInfo = (orderId: string) => {
    return orders.find(o => o.id === orderId) || mockOrders.find(o => o.id === orderId);
  };

  const pendingReceipts = useMemo(() => {
    const shippedOrders = orders.filter(o => 
      o.logisticsStatus === 'in_transit' || o.logisticsStatus === 'delivered'
    );
    return shippedOrders.map(order => ({
      id: `pending_${order.id}`,
      receiptNo: '-',
      orderId: order.id,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      status: 'pending' as ReceiptStatus,
      receivedById: '',
      receivedAt: new Date(),
      createdAt: new Date(),
      order,
    }));
  }, [orders]);

  const completedReceipts = useMemo(() => {
    const allReceipts = [...receipts, ...mockReceipts];
    return allReceipts.map(r => ({
      ...r,
      order: getOrderInfo(r.orderId),
    })).filter(r => r.status !== 'pending');
  }, [receipts, orders]);

  const handleViewDetail = (receipt: ReceiptWithOrder) => {
    setCurrentReceipt(receipt);
    setDetailModalVisible(true);
  };

  const handleViewOrderDetail = (order: PurchaseOrder) => {
    setCurrentOrder(order);
    setDetailModalVisible(true);
  };

  const handleStartInspection = (order: PurchaseOrder) => {
    setCurrentOrder(order);
    inspectionForm.setFieldsValue({
      orderNo: order.orderNo,
      receivedQuantity: order.quantity,
      acceptedQuantity: order.quantity,
      rejectedQuantity: 0,
      inspectionResult: 'all_qualified',
    });
    setFileList([]);
    setInspectionModalVisible(true);
  };

  const handleInspectionSubmit = async (values: InspectionFormData) => {
    if (!currentOrder) return;

    const totalQty = values.acceptedQuantity + values.rejectedQuantity;
    if (totalQty !== values.receivedQuantity) {
      message.error('实收数量必须等于验收数量加上不合格数量');
      return;
    }

    try {
      let status: ReceiptStatus = 'accepted';
      if (values.inspectionResult === 'partial_qualified') {
        status = 'partial';
      } else if (values.inspectionResult === 'all_rejected') {
        status = 'rejected';
      }

      await createReceipt({
        orderId: currentOrder.id,
        receivedQuantity: values.receivedQuantity,
        acceptedQuantity: values.acceptedQuantity,
        rejectedQuantity: values.rejectedQuantity,
        inspectionReport: values.inspectionReport,
        status,
        receivedById: 'user_001',
        receivedAt: new Date(),
      });

      message.success('验收完成');
      setInspectionModalVisible(false);
      inspectionForm.resetFields();
      fetchReceipts();
    } catch (error) {
      message.error('验收失败');
    }
  };

  const handleQuantityChange = (field: 'acceptedQuantity' | 'rejectedQuantity', value: number) => {
    const receivedQty = inspectionForm.getFieldValue('receivedQuantity') || 0;
    const otherField = field === 'acceptedQuantity' ? 'rejectedQuantity' : 'acceptedQuantity';
    const otherValue = inspectionForm.getFieldValue(otherField) || 0;
    const maxValue = receivedQty - otherValue;
    
    if (value > maxValue) {
      inspectionForm.setFieldsValue({
        [field]: maxValue,
      });
    }

    const total = (value || 0) + otherValue;
    if (total === receivedQty && otherValue === 0) {
      inspectionForm.setFieldsValue({ inspectionResult: 'all_qualified' });
    } else if (total === receivedQty && (value || 0) === 0) {
      inspectionForm.setFieldsValue({ inspectionResult: 'all_rejected' });
    } else if (total === receivedQty) {
      inspectionForm.setFieldsValue({ inspectionResult: 'partial_qualified' });
    }
  };

  const pendingColumns = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (_: any, record: any) => (
        <span className="font-medium text-primary-600">{record.order?.orderNo}</span>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 200,
      render: (_: any, record: any) => getSupplierName(record.order?.supplierId),
    },
    {
      title: '物品名称',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 180,
      render: (_: any, record: any) => record.order?.itemName,
    },
    {
      title: '应收数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: any) => `${record.order?.quantity} ${record.order?.unit}`,
    },
    {
      title: '实收数量',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      width: 120,
      render: () => '-',
    },
    {
      title: '验收状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ReceiptStatus) => (
        <Tag color="orange">待验收</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<QrCode className="w-3.5 h-3.5" />}
            onClick={() => handleStartInspection(record.order)}
          >
            扫码验收
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => handleViewOrderDetail(record.order)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  const completedColumns = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (_: any, record: ReceiptWithOrder) => (
        <span className="font-medium text-primary-600">{record.order?.orderNo}</span>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 200,
      render: (_: any, record: ReceiptWithOrder) => getSupplierName(record.order?.supplierId || ''),
    },
    {
      title: '物品名称',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 180,
      render: (_: any, record: ReceiptWithOrder) => record.order?.itemName,
    },
    {
      title: '应收数量',
      dataIndex: 'expectedQuantity',
      key: 'expectedQuantity',
      width: 120,
      render: (_: any, record: ReceiptWithOrder) => `${record.order?.quantity} ${record.order?.unit}`,
    },
    {
      title: '实收数量',
      dataIndex: 'receivedQuantity',
      key: 'receivedQuantity',
      width: 120,
      render: (val: number, record: ReceiptWithOrder) => `${val} ${record.order?.unit}`,
    },
    {
      title: '验收数量',
      dataIndex: 'acceptedQuantity',
      key: 'acceptedQuantity',
      width: 120,
      render: (val: number, record: ReceiptWithOrder) => `${val} ${record.order?.unit}`,
    },
    {
      title: '不合格数量',
      dataIndex: 'rejectedQuantity',
      key: 'rejectedQuantity',
      width: 120,
      render: (val: number, record: ReceiptWithOrder) => 
        val > 0 ? <span className="text-danger-600 font-medium">{val} {record.order?.unit}</span> : '-',
    },
    {
      title: '验收状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ReceiptStatus) => (
        <Tag color={getStatusColor(status, RECEIPT_STATUS)}>
          {getStatusLabel(status, RECEIPT_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ReceiptWithOrder) => (
        <Button
          type="link"
          size="small"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const statsCards = [
    {
      title: '待收货',
      value: pendingReceipts.length.toString(),
      icon: <Clock className="w-5 h-5" />,
      iconBg: 'rgba(255, 125, 0, 0.1)',
      iconColor: '#FF7D00',
    },
    {
      title: '今日收货',
      value: '8',
      icon: <Package className="w-5 h-5" />,
      iconBg: 'rgba(22, 93, 255, 0.1)',
      iconColor: '#165DFF',
    },
    {
      title: '验收合格率',
      value: '98.5%',
      icon: <CheckCircle className="w-5 h-5" />,
      iconBg: 'rgba(0, 180, 42, 0.1)',
      iconColor: '#00B42A',
    },
    {
      title: '异常批次',
      value: '2',
      icon: <AlertCircle className="w-5 h-5" />,
      iconBg: 'rgba(245, 63, 63, 0.1)',
      iconColor: '#F53F3F',
    },
  ];

  const receiptTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
    },
    legend: {
      data: ['收货数量', '验收数量', '不合格数量'],
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
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    series: [
      {
        name: '收货数量',
        type: 'bar',
        data: [120, 132, 101, 134, 90, 230, 210],
        itemStyle: { color: '#165DFF', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '验收数量',
        type: 'bar',
        data: [118, 130, 100, 132, 88, 228, 208],
        itemStyle: { color: '#00B42A', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '不合格数量',
        type: 'bar',
        data: [2, 2, 1, 2, 2, 2, 2],
        itemStyle: { color: '#F53F3F', borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">物流收货</h1>
          <p className="text-sm text-neutral-500 mt-1">物流跟踪与收货确认</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => {
            fetchOrders();
            fetchReceipts();
          }}>
            刷新
          </Button>
          <Button icon={<QrCode className="w-4 h-4" />} type="primary">
            扫码收货
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="card-header">
            <h3 className="card-title">本周收货趋势</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={receiptTrendOption} style={{ height: 280 }} />
          </div>
        </div>
        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title">验收状态分布</h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts
              option={{
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
                    { value: 156, name: '全部合格', itemStyle: { color: '#00B42A' } },
                    { value: 23, name: '部分合格', itemStyle: { color: '#FF7D00' } },
                    { value: 5, name: '全部不合格', itemStyle: { color: '#F53F3F' } },
                  ],
                }],
              }}
              style={{ height: 280 }}
            />
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
                    待收货
                    <Tag color="orange" className="ml-2">{pendingReceipts.length}</Tag>
                  </span>
                ),
              },
              {
                key: 'completed',
                label: (
                  <span>
                    已收货
                    <Tag color="green" className="ml-2">{completedReceipts.length}</Tag>
                  </span>
                ),
              },
            ]}
          />
          <Input
            placeholder="搜索订单编号、供应商、物品名称"
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
            columns={pendingColumns}
            dataSource={pendingReceipts.filter(r => 
              !searchText || 
              r.order?.orderNo.includes(searchText) ||
              r.order?.itemName.includes(searchText) ||
              getSupplierName(r.order?.supplierId || '').includes(searchText)
            )}
            scroll={{ x: 1200 }}
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
            columns={completedColumns}
            dataSource={completedReceipts.filter(r => 
              !searchText || 
              r.order?.orderNo.includes(searchText) ||
              r.order?.itemName.includes(searchText) ||
              getSupplierName(r.order?.supplierId || '').includes(searchText)
            )}
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
        title="收货详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {(currentReceipt?.order || currentOrder) && (
          <div className="space-y-6">
            <Descriptions title="订单信息" bordered column={2} size="small">
              <Descriptions.Item label="订单编号">
                {currentReceipt?.order?.orderNo || currentOrder?.orderNo}
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={getStatusColor((currentReceipt?.order?.status || currentOrder?.status) as any, ORDER_STATUS)}>
                  {getStatusLabel((currentReceipt?.order?.status || currentOrder?.status) as any, ORDER_STATUS)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="物品名称">
                {currentReceipt?.order?.itemName || currentOrder?.itemName}
              </Descriptions.Item>
              <Descriptions.Item label="规格">
                {currentReceipt?.order?.specification || currentOrder?.specification}
              </Descriptions.Item>
              <Descriptions.Item label="供应商">
                {getSupplierName(currentReceipt?.order?.supplierId || currentOrder?.supplierId || '')}
              </Descriptions.Item>
              <Descriptions.Item label="应收数量">
                {currentReceipt?.order?.quantity || currentOrder?.quantity} 
                {currentReceipt?.order?.unit || currentOrder?.unit}
              </Descriptions.Item>
              <Descriptions.Item label="单价">
                {formatCurrency(currentReceipt?.order?.unitPrice || currentOrder?.unitPrice || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                <span className="font-bold text-danger-600">
                  {formatCurrency(currentReceipt?.order?.totalAmount || currentOrder?.totalAmount || 0)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            {currentReceipt && currentReceipt.status !== 'pending' && (
              <>
                <Descriptions title="验收信息" bordered column={2} size="small">
                  <Descriptions.Item label="入库单号">{currentReceipt.receiptNo}</Descriptions.Item>
                  <Descriptions.Item label="验收状态">
                    <Tag color={getStatusColor(currentReceipt.status, RECEIPT_STATUS)}>
                      {getStatusLabel(currentReceipt.status, RECEIPT_STATUS)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="实收数量">
                    {currentReceipt.receivedQuantity} {currentReceipt.order?.unit}
                  </Descriptions.Item>
                  <Descriptions.Item label="验收数量">
                    {currentReceipt.acceptedQuantity} {currentReceipt.order?.unit}
                  </Descriptions.Item>
                  <Descriptions.Item label="不合格数量">
                    {currentReceipt.rejectedQuantity > 0 ? (
                      <span className="text-danger-600 font-medium">
                        {currentReceipt.rejectedQuantity} {currentReceipt.order?.unit}
                      </span>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="验收时间">
                    {formatDate(currentReceipt.receivedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="验收人">张仓库</Descriptions.Item>
                  <Descriptions.Item label="验收报告">
                    {currentReceipt.inspectionReport || '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Card size="small" title="验收进度">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="应收数量"
                        value={currentReceipt.order?.quantity || 0}
                        suffix={currentReceipt.order?.unit}
                        valueStyle={{ color: '#165DFF' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="验收通过"
                        value={currentReceipt.acceptedQuantity}
                        suffix={currentReceipt.order?.unit}
                        valueStyle={{ color: '#00B42A' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="不合格"
                        value={currentReceipt.rejectedQuantity}
                        suffix={currentReceipt.order?.unit}
                        valueStyle={{ color: '#F53F3F' }}
                      />
                    </Col>
                  </Row>
                  <div className="mt-4">
                    <Progress
                      percent={Math.round((currentReceipt.acceptedQuantity / (currentReceipt.order?.quantity || 1)) * 100)}
                      strokeColor="#00B42A"
                      showInfo
                      format={(percent) => `合格率 ${percent}%`}
                    />
                  </div>
                </Card>
              </>
            )}

            <Card size="small" title="物流信息">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="物流状态">
                  <Tag color={getStatusColor((currentReceipt?.order?.logisticsStatus || currentOrder?.logisticsStatus) as any, LOGISTICS_STATUS)}>
                    {getStatusLabel((currentReceipt?.order?.logisticsStatus || currentOrder?.logisticsStatus) as any, LOGISTICS_STATUS)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="运单号">
                  {currentReceipt?.order?.trackingNumber || currentOrder?.trackingNumber || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="物流公司">
                  {currentReceipt?.order?.shippingCompany || currentOrder?.shippingCompany || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计送达">
                  {formatDate(currentReceipt?.order?.deliveryDate || currentOrder?.deliveryDate)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="扫码验收"
        open={inspectionModalVisible}
        onCancel={() => {
          setInspectionModalVisible(false);
          inspectionForm.resetFields();
          setFileList([]);
        }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => {
            setInspectionModalVisible(false);
            inspectionForm.resetFields();
            setFileList([]);
          }}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={() => inspectionForm.submit()}>
            确认验收
          </Button>,
        ]}
      >
        {currentOrder && (
          <div className="space-y-4">
            <Card size="small" className="bg-neutral-50">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="订单编号" className="font-medium text-primary-600">
                  {currentOrder.orderNo}
                </Descriptions.Item>
                <Descriptions.Item label="物品名称">
                  {currentOrder.itemName}
                </Descriptions.Item>
                <Descriptions.Item label="供应商">
                  {getSupplierName(currentOrder.supplierId)}
                </Descriptions.Item>
                <Descriptions.Item label="应收数量">
                  <span className="font-semibold">{currentOrder.quantity} {currentOrder.unit}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Form
              form={inspectionForm}
              layout="vertical"
              onFinish={handleInspectionSubmit}
            >
              <Form.Item name="orderNo" label="订单编号" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="receivedQuantity"
                label="实收数量"
                rules={[{ required: true, message: '请输入实收数量' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={currentOrder.quantity}
                  addonAfter={currentOrder.unit}
                  placeholder="请输入实收数量"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="acceptedQuantity"
                    label="验收数量"
                    rules={[{ required: true, message: '请输入验收数量' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={currentOrder.quantity}
                      addonAfter={currentOrder.unit}
                      placeholder="验收通过数量"
                      onChange={(value) => handleQuantityChange('acceptedQuantity', value as number)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="rejectedQuantity"
                    label="不合格数量"
                    rules={[{ required: true, message: '请输入不合格数量' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={currentOrder.quantity}
                      addonAfter={currentOrder.unit}
                      placeholder="不合格数量"
                      onChange={(value) => handleQuantityChange('rejectedQuantity', value as number)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="inspectionResult"
                label="验收结果"
                rules={[{ required: true, message: '请选择验收结果' }]}
              >
                <Radio.Group>
                  <Radio.Button value="all_qualified">
                    <CheckCircle className="w-4 h-4 mr-1 text-success-500" />
                    全部合格
                  </Radio.Button>
                  <Radio.Button value="partial_qualified">
                    <AlertCircle className="w-4 h-4 mr-1 text-warning-500" />
                    部分合格
                  </Radio.Button>
                  <Radio.Button value="all_rejected">
                    <XCircle className="w-4 h-4 mr-1 text-danger-500" />
                    全部不合格
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="inspectionReport"
                label="检验报告"
              >
                <TextArea rows={3} placeholder="请填写检验报告内容，描述质量情况..." />
              </Form.Item>

              <Form.Item label="上传检验报告附件">
                <Upload
                  fileList={fileList}
                  onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                  beforeUpload={() => false}
                  multiple
                >
                  <Button icon={<UploadIcon className="w-4 h-4" />}>
                    点击上传
                  </Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
