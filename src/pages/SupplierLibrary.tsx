import { useEffect, useState } from 'react';
import {
  Table,
  Form,
  Select,
  Input,
  Button,
  Space,
  Tag,
  Card,
  Row,
  Col,
  message,
  Modal,
  Descriptions,
  Progress,
  Statistic,
  Tooltip,
  Popconfirm,
  Divider,
  Empty,
  Tabs,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  BankOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useSuppliersStore } from '../store/useSuppliersStore';
import type { Supplier } from '@shared/types';
import {
  CATEGORIES,
  SUPPLIER_STATUS,
  PERFORMANCE_LEVELS,
} from '../utils/constants';
import {
  formatPercent,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';

const { Option } = Select;
const { TextArea } = Input;

const CREDIT_RATINGS = [
  { value: '90', label: '优秀 (≥90分)' },
  { value: '80', label: '良好 (80-89分)' },
  { value: '70', label: '一般 (70-79分)' },
  { value: '60', label: '较差 (<70分)' },
];

export default function SupplierLibrary() {
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [blacklistForm] = Form.useForm();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [blacklistModalVisible, setBlacklistModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [blacklistingSupplier, setBlacklistingSupplier] = useState<Supplier | null>(null);

  const {
    suppliers,
    total,
    page,
    pageSize,
    loading,
    filters,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    approveSupplier,
    blacklistSupplier,
    exportSuppliers,
    setFilters,
    resetFilters,
    fetchDetail,
    currentSupplier,
  } = useSuppliersStore();

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = (values: any) => {
    setFilters({
      ...values,
      page: 1,
    });
    fetchSuppliers();
  };

  const handleReset = () => {
    form.resetFields();
    resetFilters();
    fetchSuppliers();
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setFilters({ page, pageSize });
    fetchSuppliers();
  };

  const handleCreate = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      await createSupplier(values);
      message.success('供应商创建成功，等待审核');
      setCreateModalVisible(false);
      fetchSuppliers();
    } catch (error) {
      // Validation error
    }
  };

  const handleEdit = (record: Supplier) => {
    setEditingSupplier(record);
    editForm.setFieldsValue({
      name: record.name,
      shortName: record.shortName,
      category: record.category,
      contactName: record.contactName,
      contactPhone: record.contactPhone,
      contactEmail: record.contactEmail,
      address: record.address,
      businessLicense: record.businessLicense,
      taxNumber: record.taxNumber,
      bankName: record.bankName,
      bankAccount: record.bankAccount,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    if (!editingSupplier) return;
    try {
      const values = await editForm.validateFields();
      await updateSupplier(editingSupplier.id, values);
      message.success('供应商信息更新成功');
      setEditModalVisible(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      // Validation error
    }
  };

  const handleViewDetail = async (record: Supplier) => {
    setViewingSupplier(record);
    await fetchDetail(record.id);
    setDetailModalVisible(true);
  };

  const handleApprove = async (record: Supplier) => {
    try {
      await approveSupplier(record.id);
      message.success('供应商审核通过');
      fetchSuppliers();
    } catch (error) {
      message.error('审核失败');
    }
  };

  const handleBlacklist = (record: Supplier) => {
    setBlacklistingSupplier(record);
    blacklistForm.resetFields();
    setBlacklistModalVisible(true);
  };

  const handleBlacklistSubmit = async () => {
    if (!blacklistingSupplier) return;
    try {
      const values = await blacklistForm.validateFields();
      await blacklistSupplier(blacklistingSupplier.id, values.reason);
      message.success('供应商已加入黑名单');
      setBlacklistModalVisible(false);
      setBlacklistingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      // Validation error
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportSuppliers();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `供应商列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const getCreditLevel = (score: number): string => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    return 'poor';
  };

  const getCreditColor = (score: number): string => {
    const level = getCreditLevel(score);
    const colorMap: { [key: string]: string } = {
      excellent: '#52c41a',
      good: '#1890ff',
      average: '#faad14',
      poor: '#f5222d',
    };
    return colorMap[level] || '#8c8c8c';
  };

  const getPerformanceChartOption = (supplier: Supplier) => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      radar: {
        indicator: [
          { name: '质量合格率', max: 100 },
          { name: '按时交货率', max: 100 },
          { name: '客户满意度', max: 5 },
          { name: '信用评分', max: 100 },
          { name: '绩效评分', max: 100 },
        ],
        radius: '70%',
        axisName: {
          color: '#4E5969',
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ['#f8f9fa', '#ffffff'],
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                supplier.qualityPassRate * 100,
                supplier.onTimeDeliveryRate * 100,
                supplier.satisfactionScore,
                supplier.creditRating,
                supplier.performanceScore,
              ],
              name: '绩效数据',
              areaStyle: {
                color: 'rgba(22, 93, 255, 0.2)',
              },
              lineStyle: {
                color: '#165DFF',
                width: 2,
              },
              itemStyle: {
                color: '#165DFF',
              },
            },
          ],
        },
      ],
    };
  };

  const getTrendChartOption = () => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['订单数量', '交易金额'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969' },
      },
      yAxis: [
        {
          type: 'value',
          name: '订单数',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#86909C' },
          splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '金额(万)',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#86909C' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '订单数量',
          type: 'bar',
          data: [15, 22, 18, 25, 30, 28],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#165DFF' },
                { offset: 1, color: '#4080FF' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '40%',
        },
        {
          name: '交易金额',
          type: 'line',
          yAxisIndex: 1,
          data: [120, 180, 150, 220, 280, 250],
          smooth: true,
          lineStyle: { color: '#00B42A', width: 2 },
          itemStyle: { color: '#00B42A' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 180, 42, 0.3)' },
                { offset: 1, color: 'rgba(0, 180, 42, 0.05)' },
              ],
            },
          },
        },
      ],
    };
  };

  const columns: ColumnsType<Supplier> = [
    {
      title: '供应商编号',
      dataIndex: 'supplierNo',
      key: 'supplierNo',
      width: 140,
      render: (text: string) => (
        <span className="font-mono text-blue-600">{text}</span>
      ),
    },
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (text: string, record) => (
        <Tooltip title={text}>
          <span className="font-medium">{text}</span>
          {record.status === 'pending' && (
            <Tag color="orange" className="ml-2">待审核</Tag>
          )}
        </Tooltip>
      ),
    },
    {
      title: '简称',
      dataIndex: 'shortName',
      key: 'shortName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '品类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (value: string) =>
        getStatusLabel(value, CATEGORIES as any),
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 130,
    },
    {
      title: '信用评分',
      dataIndex: 'creditRating',
      key: 'creditRating',
      width: 120,
      sorter: (a, b) => a.creditRating - b.creditRating,
      render: (score: number) => (
        <div className="flex items-center gap-2">
          <Progress
            type="circle"
            percent={score}
            size={40}
            strokeColor={getCreditColor(score)}
            format={(percent) => <span className="text-xs font-bold">{percent}</span>}
          />
        </div>
      ),
    },
    {
      title: '绩效等级',
      dataIndex: 'performanceLevel',
      key: 'performanceLevel',
      width: 100,
      render: (level: string) => {
        const color = getStatusColor(level, PERFORMANCE_LEVELS as any);
        const label = getStatusLabel(level, PERFORMANCE_LEVELS as any);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = getStatusColor(status, SUPPLIER_STATUS as any);
        const label = getStatusLabel(status, SUPPLIER_STATUS as any);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status !== 'blacklisted' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              className="text-green-600"
              onClick={() => handleApprove(record)}
            >
              审核
            </Button>
          )}
          {record.status === 'active' && (
            <Popconfirm
              title="确认加入黑名单"
              description="加入黑名单后将无法与该供应商合作"
              onConfirm={() => handleBlacklist(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
                className="text-red-600"
              >
                拉黑
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            size="small"
            icon={<BarChartOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            绩效
          </Button>
        </Space>
      ),
    },
  ];

  const renderSupplierForm = (formInstance: any, initialData?: Supplier) => (
    <Form form={formInstance} layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label="供应商名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="shortName"
            label="简称"
            rules={[{ required: true, message: '请输入简称' }]}
          >
            <Input placeholder="请输入简称" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="category"
            label="品类"
            rules={[{ required: true, message: '请选择品类' }]}
          >
            <Select placeholder="请选择品类">
              {CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="contactName"
            label="联系人"
            rules={[{ required: true, message: '请输入联系人' }]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="contactPhone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="contactEmail"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="address"
        label="地址"
        rules={[{ required: true, message: '请输入地址' }]}
      >
        <Input placeholder="请输入详细地址" />
      </Form.Item>
      <Divider orientation="left">企业资质信息</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="businessLicense"
            label="营业执照号"
          >
            <Input placeholder="请输入营业执照号" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="taxNumber"
            label="税号"
          >
            <Input placeholder="请输入税号" />
          </Form.Item>
        </Col>
      </Row>
      <Divider orientation="left">银行信息</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="bankName"
            label="开户银行"
          >
            <Input placeholder="请输入开户银行" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="bankAccount"
            label="银行账号"
          >
            <Input placeholder="请输入银行账号" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const renderDetailModal = () => {
    const supplier = currentSupplier || viewingSupplier;
    if (!supplier) return null;

    return (
      <Modal
        title={
          <div className="flex items-center gap-2">
            <UserOutlined className="text-blue-600" />
            <span>供应商详情 - {supplier.name}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setViewingSupplier(null);
        }}
        footer={null}
        width={900}
      >
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <div>
                  <Descriptions column={2} bordered size="small" className="mb-4">
                    <Descriptions.Item label="供应商编号" span={1}>
                      <span className="font-mono">{supplier.supplierNo}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="简称" span={1}>
                      {supplier.shortName}
                    </Descriptions.Item>
                    <Descriptions.Item label="供应商名称" span={2}>
                      {supplier.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="品类" span={1}>
                      {getStatusLabel(supplier.category, CATEGORIES as any)}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态" span={1}>
                      <Tag color={getStatusColor(supplier.status, SUPPLIER_STATUS as any)}>
                        {getStatusLabel(supplier.status, SUPPLIER_STATUS as any)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="绩效等级" span={1}>
                      <Tag color={getStatusColor(supplier.performanceLevel, PERFORMANCE_LEVELS as any)}>
                        {getStatusLabel(supplier.performanceLevel, PERFORMANCE_LEVELS as any)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="信用评分" span={1}>
                      <span className="font-bold" style={{ color: getCreditColor(supplier.creditRating) }}>
                        {supplier.creditRating}分
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="联系人" span={1}>
                      <span className="flex items-center gap-1">
                        <UserOutlined />
                        {supplier.contactName}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="联系电话" span={1}>
                      <span className="flex items-center gap-1">
                        <PhoneOutlined />
                        {supplier.contactPhone}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="邮箱" span={2}>
                      <span className="flex items-center gap-1">
                        <MailOutlined />
                        {supplier.contactEmail}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="地址" span={2}>
                      <span className="flex items-center gap-1">
                        <EnvironmentOutlined />
                        {supplier.address}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions column={2} bordered size="small" title="企业资质">
                    <Descriptions.Item label="营业执照号" span={1}>
                      <span className="flex items-center gap-1">
                        <FileTextOutlined />
                        {supplier.businessLicense || '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="税号" span={1}>
                      {supplier.taxNumber || '-'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions column={2} bordered size="small" title="银行信息" className="mt-4">
                    <Descriptions.Item label="开户银行" span={1}>
                      <span className="flex items-center gap-1">
                        <BankOutlined />
                        {supplier.bankName || '-'}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="银行账号" span={1}>
                      <span className="flex items-center gap-1">
                        <CreditCardOutlined />
                        {supplier.bankAccount || '-'}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>

                  <Descriptions column={2} bordered size="small" title="合作信息" className="mt-4">
                    <Descriptions.Item label="创建时间" span={1}>
                      {formatDate(supplier.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间" span={1}>
                      {formatDate(supplier.updatedAt)}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'performance',
              label: '绩效数据',
              children: (
                <div>
                  <Row gutter={16} className="mb-4">
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="历史订单"
                          value={supplier.totalOrders}
                          suffix="单"
                          valueStyle={{ color: '#165DFF' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="累计金额"
                          value={supplier.totalAmount / 10000}
                          precision={2}
                          suffix="万"
                          valueStyle={{ color: '#00B42A' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="按时交货率"
                          value={supplier.onTimeDeliveryRate * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{ color: '#722ED1' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic
                          title="质量合格率"
                          value={supplier.qualityPassRate * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{ color: '#FA8C16' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small" title="绩效雷达图">
                        <ReactECharts
                          option={getPerformanceChartOption(supplier)}
                          style={{ height: 300 }}
                          opts={{ renderer: 'canvas' }}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="历史合作趋势">
                        <ReactECharts
                          option={getTrendChartOption()}
                          style={{ height: 300 }}
                          opts={{ renderer: 'canvas' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card size="small" title="绩效指标详情" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">质量合格率</span>
                          <span className="text-sm font-medium">{formatPercent(supplier.qualityPassRate)}</span>
                        </div>
                        <Progress
                          percent={supplier.qualityPassRate * 100}
                          strokeColor="#52c41a"
                          showInfo={false}
                          size="small"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">按时交货率</span>
                          <span className="text-sm font-medium">{formatPercent(supplier.onTimeDeliveryRate)}</span>
                        </div>
                        <Progress
                          percent={supplier.onTimeDeliveryRate * 100}
                          strokeColor="#1890ff"
                          showInfo={false}
                          size="small"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">满意度评分</span>
                          <span className="text-sm font-medium">{supplier.satisfactionScore.toFixed(1)}/5.0</span>
                        </div>
                        <Progress
                          percent={(supplier.satisfactionScore / 5) * 100}
                          strokeColor="#722ed1"
                          showInfo={false}
                          size="small"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">信用评分</span>
                          <span className="text-sm font-medium">{supplier.creditRating}分</span>
                        </div>
                        <Progress
                          percent={supplier.creditRating}
                          strokeColor={getCreditColor(supplier.creditRating)}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">绩效评分</span>
                          <span className="text-sm font-medium">{supplier.performanceScore}分</span>
                        </div>
                        <Progress
                          percent={supplier.performanceScore}
                          strokeColor="#fa8c16"
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">供应商库</h1>
          <p className="text-sm text-neutral-500 mt-1">供应商信息管理与维护</p>
        </div>
      </div>

      <Card className="mb-4 shadow-sm">
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
          className="m-0"
        >
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Form.Item name="keyword" label="供应商编号/名称" className="mb-0">
                <Input placeholder="请输入编号或名称" allowClear />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="category" label="品类" className="mb-0">
                <Select placeholder="请选择品类" allowClear>
                  {CATEGORIES.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="状态" className="mb-0">
                <Select placeholder="请选择状态" allowClear>
                  {SUPPLIER_STATUS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="performanceLevel" label="绩效等级" className="mb-0">
                <Select placeholder="请选择绩效等级" allowClear>
                  {PERFORMANCE_LEVELS.map((level) => (
                    <Option key={level.value} value={level.value}>
                      {level.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} align="middle" className="mt-4">
            <Col span={6}>
              <Form.Item name="creditRating" label="信用等级" className="mb-0">
                <Select placeholder="请选择信用等级" allowClear>
                  {CREDIT_RATINGS.map((rating) => (
                    <Option key={rating.value} value={rating.value}>
                      {rating.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={18} className="text-right">
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  htmlType="submit"
                >
                  查询
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-600">
            共 <span className="font-bold text-blue-600">{total}</span> 条记录
          </div>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              批量导出
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => fetchSuppliers({ status: 'pending' })}
            >
              供应商准入审核
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新增供应商
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={suppliers}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1400 }}
          rowClassName={(record, index) =>
            index % 2 === 1 ? 'bg-gray-50 hover:bg-blue-50' : 'hover:bg-blue-50'
          }
          locale={{
            emptyText: <Empty description="暂无供应商数据" />,
          }}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-green-600" />
            <span>新增供应商</span>
          </div>
        }
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalVisible(false)}
        okText="确认创建"
        cancelText="取消"
        width={700}
        confirmLoading={loading}
      >
        {renderSupplierForm(createForm)}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-blue-600" />
            <span>编辑供应商 - {editingSupplier?.name}</span>
          </div>
        }
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingSupplier(null);
        }}
        okText="确认修改"
        cancelText="取消"
        width={700}
        confirmLoading={loading}
      >
        {renderSupplierForm(editForm, editingSupplier || undefined)}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <StopOutlined className="text-red-600" />
            <span>加入黑名单 - {blacklistingSupplier?.name}</span>
          </div>
        }
        open={blacklistModalVisible}
        onOk={handleBlacklistSubmit}
        onCancel={() => {
          setBlacklistModalVisible(false);
          setBlacklistingSupplier(null);
        }}
        okText="确认拉黑"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
      >
        <Alert
          message="重要提示"
          description="将供应商加入黑名单后，系统将禁止向该供应商发送任何采购订单和询价，请谨慎操作。"
          type="warning"
          showIcon
          className="mb-4"
        />
        <Form form={blacklistForm} layout="vertical">
          <Form.Item
            name="reason"
            label="拉黑原因"
            rules={[{ required: true, message: '请输入拉黑原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明拉黑原因"
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>

      {renderDetailModal()}
    </div>
  );
}
