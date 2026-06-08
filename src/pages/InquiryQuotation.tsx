import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  Tabs,
  Descriptions,
  message,
  Popconfirm,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  Inquiry,
  Quote,
  Supplier,
  PurchaseRequirement,
  ComparisonReport,
} from '@shared/types';
import {
  INQUIRY_STATUS,
  QUOTE_STATUS,
  CATEGORIES,
  PAYMENT_TERMS,
  DATE_FORMAT,
  DATETIME_FORMAT,
} from '../utils/constants';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';
import { useInquiriesStore } from '../store/useInquiriesStore';
import { mockSuppliers, mockRequirements } from '../utils/mock';
import { generateComparisonReport, selectSupplier, createOrderFromInquiry } from '../api/inquiries';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

type TabKey = 'myInquiries' | 'receivedQuotes';

interface QuoteWithSupplier extends Quote {
  supplierName: string;
  supplierShortName: string;
}

interface InquiryWithStats extends Inquiry {
  requirementTitle: string;
  categoryName: string;
  invitedSupplierCount: number;
  quotedCount: number;
}

const InquiryQuotation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('myInquiries');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryWithStats | null>(null);
  const [inquiryQuotes, setInquiryQuotes] = useState<QuoteWithSupplier[]>([]);
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [createForm] = Form.useForm();
  const [quoteForm] = Form.useForm();

  const {
    inquiries,
    total,
    page,
    pageSize,
    loading,
    fetchInquiries,
    fetchQuotes,
    createInquiry,
    sendInquiry,
    setFilters,
    resetFilters,
    filters,
  } = useInquiriesStore();

  const [searchForm] = Form.useForm();

  useEffect(() => {
    if (activeTab === 'myInquiries') {
      loadInquiries();
    }
  }, [activeTab, page, pageSize]);

  const loadInquiries = () => {
    fetchInquiries({
      page,
      pageSize,
      ...filters,
    });
  };

  const getSupplierName = (supplierId: string): string => {
    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    return supplier?.name || supplierId;
  };

  const getSupplierShortName = (supplierId: string): string => {
    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    return supplier?.shortName || supplier?.name || supplierId;
  };

  const getCategoryName = (categoryCode: string): string => {
    const category = CATEGORIES.find((c) => c.value === categoryCode);
    return category?.label || categoryCode;
  };

  const getRequirementTitle = (requirementId: string): string => {
    const req = mockRequirements.find((r) => r.id === requirementId);
    return req?.title || requirementId;
  };

  const getQuotedCount = (inquiryId: string): number => {
    return useInquiriesStore.getState().quotes.filter((q) => q.inquiryId === inquiryId).length;
  };

  const enrichedInquiries: InquiryWithStats[] = inquiries.map((inquiry) => ({
    ...inquiry,
    requirementTitle: getRequirementTitle(inquiry.requirementId),
    categoryName: getCategoryName(inquiry.category),
    invitedSupplierCount: inquiry.supplierIds.length,
    quotedCount: getQuotedCount(inquiry.id),
  }));

  const handleSearch = (values: any) => {
    const newFilters: any = {};
    if (values.inquiryNo) newFilters.keyword = values.inquiryNo;
    if (values.status) newFilters.status = values.status;
    if (values.category) newFilters.category = values.category;
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0].format(DATE_FORMAT);
      newFilters.endDate = values.dateRange[1].format(DATE_FORMAT);
    }
    setFilters(newFilters);
    fetchInquiries({ page: 1, pageSize, ...newFilters });
  };

  const handleReset = () => {
    searchForm.resetFields();
    resetFilters();
    loadInquiries();
  };

  const handleCreateInquiry = async (values: any) => {
    try {
      const requirement = mockRequirements.find((r) => r.id === values.requirementId);
      const newInquiry = await createInquiry({
        requirementId: values.requirementId,
        title: requirement?.title || '新询价单',
        category: requirement?.category || 'office_supplies',
        itemName: requirement?.itemName || '',
        specification: requirement?.specification || '',
        quantity: requirement?.quantity || 1,
        unit: requirement?.unit || 'piece',
        description: values.description,
        supplierIds: values.supplierIds,
        deadline: values.deadline.toDate(),
        createdById: 'user_001',
        status: 'draft',
      });
      message.success('询价单创建成功');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      loadInquiries();
    } catch (error) {
      message.error('创建失败，请重试');
    }
  };

  const handleSendInquiry = async (id: string) => {
    try {
      await sendInquiry(id);
      message.success('询价单已发送');
      loadInquiries();
    } catch (error) {
      message.error('发送失败，请重试');
    }
  };

  const handleViewQuotes = async (inquiry: InquiryWithStats) => {
    setSelectedInquiry(inquiry);
    try {
      await fetchQuotes(inquiry.id);
      const quotes = useInquiriesStore.getState().quotes.filter(
        (q) => q.inquiryId === inquiry.id
      );
      const quotesWithSupplier: QuoteWithSupplier[] = quotes.map((q) => ({
        ...q,
        supplierName: getSupplierName(q.supplierId),
        supplierShortName: getSupplierShortName(q.supplierId),
      }));
      setInquiryQuotes(quotesWithSupplier);
      setIsQuoteModalOpen(true);
    } catch (error) {
      message.error('获取报价失败');
    }
  };

  const handleViewDetail = (inquiry: InquiryWithStats) => {
    setSelectedInquiry(inquiry);
    setIsDetailModalOpen(true);
  };

  const handleGenerateComparison = async (inquiryId: string) => {
    try {
      const report = await generateComparisonReport(inquiryId);
      const enrichedQuotes = report.quotes.map((q) => ({
        ...q,
        supplierName: getSupplierName(q.supplierId),
      }));
      setComparisonReport({
        ...report,
        quotes: enrichedQuotes,
      });
      setIsComparisonModalOpen(true);
      message.success('比价报告生成成功');
    } catch (error) {
      message.error('生成比价报告失败');
    }
  };

  const handleSelectSupplier = async (supplierId: string) => {
    if (!selectedInquiry) return;
    try {
      await selectSupplier(selectedInquiry.id, supplierId);
      message.success('已选择中标供应商');
      setIsQuoteModalOpen(false);
      loadInquiries();
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleCreateOrder = async (supplierId: string) => {
    if (!selectedInquiry) return;
    try {
      const result = await createOrderFromInquiry(selectedInquiry.id, supplierId);
      message.success(`采购订单已创建，订单号：${result.orderId}`);
      setIsQuoteModalOpen(false);
      loadInquiries();
    } catch (error) {
      message.error('创建订单失败，请重试');
    }
  };

  const inquiryColumns: ColumnsType<InquiryWithStats> = [
    {
      title: '询价编号',
      dataIndex: 'inquiryNo',
      key: 'inquiryNo',
      width: 140,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '需求标题',
      dataIndex: 'requirementTitle',
      key: 'requirementTitle',
      ellipsis: true,
    },
    {
      title: '品类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 100,
    },
    {
      title: '邀请供应商数',
      dataIndex: 'invitedSupplierCount',
      key: 'invitedSupplierCount',
      width: 120,
      align: 'center',
      render: (count) => `${count} 家`,
    },
    {
      title: '已报价数',
      dataIndex: 'quotedCount',
      key: 'quotedCount',
      width: 100,
      align: 'center',
      render: (count, record) => (
        <Tag color={count > 0 ? 'green' : 'default'}>
          {count}/{record.invitedSupplierCount}
        </Tag>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status, INQUIRY_STATUS)}>
          {getStatusLabel(status, INQUIRY_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleSendInquiry(record.id)}
            >
              发送
            </Button>
          )}
          {(record.status === 'quoting' || record.status === 'quoted') && (
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewQuotes(record)}
            >
              报价
            </Button>
          )}
          {record.quotedCount > 0 && (
            <Button
              type="link"
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => handleGenerateComparison(record.id)}
            >
              比价
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const quoteColumns: ColumnsType<QuoteWithSupplier> = [
    {
      title: '供应商名称',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: '总价',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 140,
      align: 'right',
      render: (price) => <Text strong>{formatCurrency(price)}</Text>,
    },
    {
      title: '交货期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '付款方式',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 120,
      render: (terms) => getStatusLabel(terms, PAYMENT_TERMS),
    },
    {
      title: '保修期',
      dataIndex: 'warranty',
      key: 'warranty',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status, QUOTE_STATUS)}>
          {getStatusLabel(status, QUOTE_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="确认选择该供应商中标？"
            onConfirm={() => handleSelectSupplier(record.supplierId)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={selectedInquiry?.status === 'completed'}
            >
              选择中标
            </Button>
          </Popconfirm>
          <Button
            size="small"
            onClick={() => handleCreateOrder(record.supplierId)}
          >
            生成订单
          </Button>
        </Space>
      ),
    },
  ];

  const renderMyInquiries = () => (
    <>
      <Card className="mb-4" variant="outlined">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="flex flex-wrap gap-4"
        >
          <Form.Item name="inquiryNo" label="询价编号">
            <Input
              placeholder="请输入询价编号"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" style={{ width: 150 }} allowClear>
              {INQUIRY_STATUS.map((s) => (
                <Option key={s.value} value={s.value}>
                  {s.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="category" label="品类">
            <Select placeholder="请选择品类" style={{ width: 150 }} allowClear>
              {CATEGORIES.map((c) => (
                <Option key={c.value} value={c.value}>
                  {c.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="截止日期">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        variant="outlined"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            发起询价
          </Button>
        }
      >
        <Table
          columns={inquiryColumns}
          dataSource={enrichedInquiries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (p, ps) => {
              setFilters({ page: p, pageSize: ps });
            },
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </>
  );

  const renderReceivedQuotes = () => (
    <Card>
      <div className="text-center py-20">
        <FileTextOutlined className="text-6xl text-neutral-300 mb-4" />
        <p className="text-neutral-500">
          供应商视角功能开发中，切换到供应商账号可查看收到的报价邀请
        </p>
      </div>
    </Card>
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">询价报价</h1>
          <p className="text-sm text-neutral-500 mt-1">供应商询价与报价管理</p>
        </div>
      </div>

      <Card variant="outlined" className="!p-0">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          className="px-6 pt-2"
          items={[
            {
              key: 'myInquiries',
              label: '我发起的询价',
              children: renderMyInquiries(),
            },
            {
              key: 'receivedQuotes',
              label: '收到的报价',
              children: renderReceivedQuotes(),
            },
          ]}
        />
      </Card>

      <Modal
        title="发起询价"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateInquiry}
          className="mt-4"
        >
          <Form.Item
            name="requirementId"
            label="选择采购需求"
            rules={[{ required: true, message: '请选择采购需求' }]}
          >
            <Select
              placeholder="请选择已审批的采购需求"
              showSearch
              optionFilterProp="children"
            >
              {mockRequirements
                .filter((r) => r.status === 'approved')
                .map((req) => (
                  <Option key={req.id} value={req.id}>
                    {req.requirementNo} - {req.title}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="supplierIds"
            label="选择供应商"
            rules={[{ required: true, message: '请选择至少一个供应商' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择要邀请报价的供应商（可多选）"
              showSearch
              optionFilterProp="children"
              maxTagCount={3}
            >
              {mockSuppliers
                .filter((s) => s.status === 'active')
                .map((supplier) => (
                  <Option key={supplier.id} value={supplier.id}>
                    {supplier.shortName} ({supplier.supplierNo})
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="报价截止日期"
            rules={[{ required: true, message: '请设置报价截止日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              minDate={dayjs().add(1, 'day')}
              format={DATETIME_FORMAT}
            />
          </Form.Item>

          <Form.Item name="description" label="询价说明">
            <TextArea
              rows={4}
              placeholder="请输入询价说明，如质量要求、交付要求等"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item className="text-right mb-0">
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建询价单
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`报价详情 - ${selectedInquiry?.inquiryNo}`}
        open={isQuoteModalOpen}
        onCancel={() => setIsQuoteModalOpen(false)}
        width={1200}
        footer={
          <Space>
            <Button onClick={() => setIsQuoteModalOpen(false)}>关闭</Button>
            {selectedInquiry && selectedInquiry.quotedCount > 0 && (
              <Button
                type="primary"
                icon={<BarChartOutlined />}
                onClick={() => handleGenerateComparison(selectedInquiry.id)}
              >
                生成比价报告
              </Button>
            )}
          </Space>
        }
      >
        {selectedInquiry && (
          <>
            <Descriptions
              bordered
              size="small"
              column={3}
              className="mb-4"
            >
              <Descriptions.Item label="询价编号">
                {selectedInquiry.inquiryNo}
              </Descriptions.Item>
              <Descriptions.Item label="需求标题">
                {selectedInquiry.requirementTitle}
              </Descriptions.Item>
              <Descriptions.Item label="品类">
                {selectedInquiry.categoryName}
              </Descriptions.Item>
              <Descriptions.Item label="物品名称">
                {selectedInquiry.itemName}
              </Descriptions.Item>
              <Descriptions.Item label="规格">
                {selectedInquiry.specification}
              </Descriptions.Item>
              <Descriptions.Item label="数量">
                {selectedInquiry.quantity} {selectedInquiry.unit}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} className="!mb-3">
              供应商报价列表
            </Title>

            <Table
              columns={quoteColumns}
              dataSource={inquiryQuotes}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
            />
          </>
        )}
      </Modal>

      <Modal
        title={`询价单详情 - ${selectedInquiry?.inquiryNo}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={800}
        footer={null}
      >
        {selectedInquiry && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="询价编号" span={2}>
              {selectedInquiry.inquiryNo}
            </Descriptions.Item>
            <Descriptions.Item label="需求标题">{selectedInquiry.requirementTitle}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(selectedInquiry.status, INQUIRY_STATUS)}>
                {getStatusLabel(selectedInquiry.status, INQUIRY_STATUS)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="品类">{selectedInquiry.categoryName}</Descriptions.Item>
            <Descriptions.Item label="物品名称">{selectedInquiry.itemName}</Descriptions.Item>
            <Descriptions.Item label="规格">{selectedInquiry.specification}</Descriptions.Item>
            <Descriptions.Item label="数量">
              {selectedInquiry.quantity} {selectedInquiry.unit}
            </Descriptions.Item>
            <Descriptions.Item label="报价截止日期">
              {formatDateTime(selectedInquiry.deadline)}
            </Descriptions.Item>
            <Descriptions.Item label="邀请供应商">
              {selectedInquiry.supplierIds.map((id) => (
                <Tag key={id}>{getSupplierShortName(id)}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(selectedInquiry.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="询价说明" span={2}>
              {selectedInquiry.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="比价报告预览"
        open={isComparisonModalOpen}
        onCancel={() => setIsComparisonModalOpen(false)}
        width={1000}
        footer={
          <Space>
            <Button onClick={() => setIsComparisonModalOpen(false)}>关闭</Button>
            {comparisonReport && (
              <Button
                type="primary"
                onClick={() => {
                  message.success('已跳转到比价报告页面');
                  setIsComparisonModalOpen(false);
                }}
              >
                查看完整报告
              </Button>
            )}
          </Space>
        }
      >
        {comparisonReport && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="报告编号">
                {comparisonReport.reportNo}
              </Descriptions.Item>
              <Descriptions.Item label="关联询价单">
                {selectedInquiry?.inquiryNo}
              </Descriptions.Item>
              <Descriptions.Item label="推荐供应商">
                {getSupplierName(comparisonReport.recommendedSupplierId || '')}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(comparisonReport.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="推荐理由" span={2}>
                {comparisonReport.recommendationReason}
              </Descriptions.Item>
            </Descriptions>

            <Table
              size="small"
              dataSource={comparisonReport.quotes}
              rowKey="supplierId"
              pagination={false}
              columns={[
                {
                  title: '排名',
                  dataIndex: 'rank',
                  key: 'rank',
                  width: 60,
                  align: 'center',
                  render: (rank) => (
                    <Tag color={rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'default'}>
                      {rank}
                    </Tag>
                  ),
                },
                { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
                {
                  title: '单价',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  align: 'right',
                  render: (v) => formatCurrency(v),
                },
                {
                  title: '总价',
                  dataIndex: 'totalPrice',
                  key: 'totalPrice',
                  align: 'right',
                  render: (v) => <Text strong>{formatCurrency(v)}</Text>,
                },
                {
                  title: '交货期',
                  dataIndex: 'deliveryDate',
                  key: 'deliveryDate',
                  render: (v) => formatDate(v),
                },
                {
                  title: '价格得分',
                  dataIndex: 'priceScore',
                  key: 'priceScore',
                  align: 'center',
                },
                {
                  title: '交货得分',
                  dataIndex: 'deliveryScore',
                  key: 'deliveryScore',
                  align: 'center',
                },
                {
                  title: '质量得分',
                  dataIndex: 'qualityScore',
                  key: 'qualityScore',
                  align: 'center',
                },
                {
                  title: '综合得分',
                  dataIndex: 'totalScore',
                  key: 'totalScore',
                  align: 'center',
                  render: (v) => <Text strong>{v.toFixed(1)}</Text>,
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default InquiryQuotation;
