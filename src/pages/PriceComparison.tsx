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
  Descriptions,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Empty,
  Form,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  BarChartOutlined,
  UserOutlined,
  HistoryOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import dayjs from 'dayjs';
import type {
  ComparisonReport,
  QuoteComparison,
  Inquiry,
  PurchaseRequirement,
  Supplier,
} from '@shared/types';
import { CATEGORIES, DATE_FORMAT, DATETIME_FORMAT } from '../utils/constants';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getStatusLabel,
} from '../utils/format';
import { mockComparisonReports, mockInquiries, mockRequirements, mockSuppliers } from '../utils/mock';
import { selectSupplier, createOrderFromInquiry, generateComparisonReport } from '../api/inquiries';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface ReportWithDetail extends ComparisonReport {
  inquiryNo: string;
  inquiryTitle: string;
  requirementTitle: string;
  categoryName: string;
  recommendedSupplierName: string;
  recommendedSupplierShortName: string;
  hasOrder: boolean;
}

interface ReportDetailViewProps {
  report: ReportWithDetail;
  onConfirmWin: (supplierId: string) => void;
  onCreateOrder: (supplierId: string) => void;
  onReCompare: () => void;
}

const CHART_COLORS = ['#165DFF', '#00B42A', '#FF7D00', '#F53F3F', '#722ED1', '#14C9C9'];

const getSupplierById = (supplierId: string): Supplier | undefined => {
  return mockSuppliers.find((s) => s.id === supplierId);
};

const getInquiryById = (inquiryId: string): Inquiry | undefined => {
  return mockInquiries.find((i) => i.id === inquiryId);
};

const getRequirementById = (requirementId: string): PurchaseRequirement | undefined => {
  return mockRequirements.find((r) => r.id === requirementId);
};

const getCategoryName = (categoryCode: string): string => {
  const category = CATEGORIES.find((c) => c.value === categoryCode);
  return category?.label || categoryCode;
};

const enrichReport = (report: ComparisonReport): ReportWithDetail => {
  const inquiry = getInquiryById(report.inquiryId);
  const requirement = getRequirementById(report.requirementId);
  const supplier = getSupplierById(report.recommendedSupplierId || '');
  const enrichedQuotes = report.quotes.map((q) => ({
    ...q,
    supplierName: getSupplierById(q.supplierId)?.name || q.supplierName,
  }));

  return {
    ...report,
    quotes: enrichedQuotes,
    inquiryNo: inquiry?.inquiryNo || '-',
    inquiryTitle: inquiry?.title || '-',
    requirementTitle: requirement?.title || '-',
    categoryName: getCategoryName(inquiry?.category || ''),
    recommendedSupplierName: supplier?.name || '-',
    recommendedSupplierShortName: supplier?.shortName || '-',
    hasOrder: false,
  };
};

const ReportDetailView: React.FC<ReportDetailViewProps> = ({
  report,
  onConfirmWin,
  onCreateOrder,
  onReCompare,
}) => {
  const inquiry = getInquiryById(report.inquiryId);
  const requirement = getRequirementById(report.requirementId);
  const recommendedSupplier = getSupplierById(report.recommendedSupplierId || '');

  const totalPrices = report.quotes.map((q) => q.totalPrice);
  const maxPrice = Math.max(...totalPrices);
  const minPrice = Math.min(...totalPrices);
  const priceDiffPercent = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

  const barChartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>总价: ${formatCurrency(data.value)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: report.quotes.map((q) => q.supplierName),
      axisLabel: {
        interval: 0,
        rotate: 30,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
      },
    },
    series: [
      {
        name: '总价',
        type: 'bar',
        data: report.quotes.map((q, index) => ({
          value: q.totalPrice,
          itemStyle: {
            color: q.supplierId === report.recommendedSupplierId
              ? CHART_COLORS[0]
              : CHART_COLORS[index % CHART_COLORS.length],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value),
          fontSize: 11,
        },
        barWidth: '50%',
      },
    ],
  };

  const radarChartOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      data: report.quotes.map((q) => q.supplierName),
      bottom: 0,
      type: 'scroll',
    },
    radar: {
      indicator: [
        { name: '价格得分', max: 100 },
        { name: '交货得分', max: 100 },
        { name: '质量得分', max: 100 },
      ],
      radius: '65%',
      center: ['50%', '50%'],
    },
    series: [
      {
        name: '供应商评分',
        type: 'radar',
        data: report.quotes.map((q, index) => ({
          value: [q.priceScore, q.deliveryScore, q.qualityScore],
          name: q.supplierName,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
          lineStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
            width: q.supplierId === report.recommendedSupplierId ? 3 : 1,
          },
          areaStyle: {
            color: q.supplierId === report.recommendedSupplierId
              ? `${CHART_COLORS[0]}33`
              : 'transparent',
          },
        })),
      },
    ],
  };

  const comparisonColumns: ColumnsType<QuoteComparison> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center',
      render: (rank) => (
        <Tag
          color={
            rank === 1 ? 'gold' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'default'
          }
          className="!m-0 !text-xs font-bold"
        >
          <TrophyOutlined className="mr-1" />
          {rank}
        </Tag>
      ),
    },
    {
      title: '供应商名称',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
      render: (name, record) => (
        <Space>
          <span>{name}</span>
          {record.supplierId === report.recommendedSupplierId && (
            <Tag color="green" className="!m-0">
              推荐
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: '总价',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 130,
      align: 'right',
      render: (value, record) => (
        <Text strong={record.supplierId === report.recommendedSupplierId}>
          {formatCurrency(value)}
        </Text>
      ),
      sorter: (a, b) => a.totalPrice - b.totalPrice,
    },
    {
      title: '交货期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: '价格得分',
      dataIndex: 'priceScore',
      key: 'priceScore',
      width: 100,
      align: 'center',
      render: (score) => (
        <Tag color={score >= 90 ? 'green' : score >= 80 ? 'blue' : 'orange'}>
          {score}
        </Tag>
      ),
      sorter: (a, b) => a.priceScore - b.priceScore,
    },
    {
      title: '交货得分',
      dataIndex: 'deliveryScore',
      key: 'deliveryScore',
      width: 100,
      align: 'center',
      render: (score) => (
        <Tag color={score >= 90 ? 'green' : score >= 80 ? 'blue' : 'orange'}>
          {score}
        </Tag>
      ),
      sorter: (a, b) => a.deliveryScore - b.deliveryScore,
    },
    {
      title: '质量得分',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 100,
      align: 'center',
      render: (score) => (
        <Tag color={score >= 90 ? 'green' : score >= 80 ? 'blue' : 'orange'}>
          {score}
        </Tag>
      ),
      sorter: (a, b) => a.qualityScore - b.qualityScore,
    },
    {
      title: '综合得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
      align: 'center',
      render: (score, record) => (
        <Text
          strong={record.supplierId === report.recommendedSupplierId}
          className={record.supplierId === report.recommendedSupplierId ? 'text-blue-600' : ''}
        >
          {score.toFixed(1)}
        </Text>
      ),
      sorter: (a, b) => a.totalScore - b.totalScore,
      defaultSortOrder: 'descend',
    },
  ];

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <Title level={4} className="!mb-4 flex items-center gap-2">
          <BarChartOutlined className="text-blue-500" />
          比价信息概览
        </Title>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="比价供应商数"
              value={report.quotes.length}
              suffix="家"
              valueStyle={{ color: '#165DFF' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最高报价"
              value={maxPrice}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#F53F3F' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最低报价"
              value={minPrice}
              formatter={(value) => formatCurrency(value as number)}
              valueStyle={{ color: '#00B42A' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="价差幅度"
              value={priceDiffPercent}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#FF7D00' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card variant="outlined" title="询价单信息">
            {inquiry && (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="询价编号">{inquiry.inquiryNo}</Descriptions.Item>
                <Descriptions.Item label="询价标题">{inquiry.title}</Descriptions.Item>
                <Descriptions.Item label="物品名称">{inquiry.itemName}</Descriptions.Item>
                <Descriptions.Item label="规格">{inquiry.specification}</Descriptions.Item>
                <Descriptions.Item label="数量">
                  {inquiry.quantity} {inquiry.unit}
                </Descriptions.Item>
                <Descriptions.Item label="品类">{getCategoryName(inquiry.category)}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card variant="outlined" title="采购需求信息">
            {requirement && (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="需求编号">{requirement.requirementNo}</Descriptions.Item>
                <Descriptions.Item label="需求标题">{requirement.title}</Descriptions.Item>
                <Descriptions.Item label="预算金额">
                  {formatCurrency(requirement.budget)}
                </Descriptions.Item>
                <Descriptions.Item label="期望日期">
                  {formatDate(requirement.expectedDate)}
                </Descriptions.Item>
                <Descriptions.Item label="需求描述">
                  {requirement.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
      </Row>

      <Card variant="outlined" title="比价表格">
        <Table
          columns={comparisonColumns}
          dataSource={report.quotes}
          rowKey="supplierId"
          pagination={false}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card variant="outlined" title="供应商总价对比">
            <ReactECharts option={barChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card variant="outlined" title="供应商综合得分对比">
            <ReactECharts option={radarChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {recommendedSupplier && (
        <Card
          variant="outlined"
          className="border-blue-300 bg-blue-50"
          title={
            <Space>
              <TrophyOutlined className="text-yellow-500" />
              <span>推荐供应商</span>
            </Space>
          }
          extra={
            <Space>
              <Popconfirm
                title="确认选择该供应商中标？"
                onConfirm={() => onConfirmWin(recommendedSupplier.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button type="primary" icon={<CheckCircleOutlined />}>
                  确认中标
                </Button>
              </Popconfirm>
              <Button
                icon={<FileTextOutlined />}
                onClick={() => onCreateOrder(recommendedSupplier.id)}
              >
                生成采购订单
              </Button>
              <Popconfirm
                title="确认重新比价？"
                onConfirm={onReCompare}
                okText="确认"
                cancelText="取消"
              >
                <Button icon={<ReloadOutlined />}>重新比价</Button>
              </Popconfirm>
            </Space>
          }
        >
          <Row gutter={24}>
            <Col span={8}>
              <div className="bg-white rounded-lg p-4 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserOutlined className="text-2xl text-blue-500" />
                  </div>
                  <div>
                    <Title level={5} className="!mb-0">
                      {recommendedSupplier.name}
                    </Title>
                    <Text type="secondary">{recommendedSupplier.supplierNo}</Text>
                  </div>
                </div>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="联系人">
                    {recommendedSupplier.contactName}
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    {recommendedSupplier.contactPhone}
                  </Descriptions.Item>
                  <Descriptions.Item label="信用评级">
                    <Tag color="green">{recommendedSupplier.creditRating} 分</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="绩效等级">
                    <Tag
                      color={
                        recommendedSupplier.performanceLevel === 'excellent'
                          ? 'green'
                          : recommendedSupplier.performanceLevel === 'good'
                          ? 'blue'
                          : 'orange'
                      }
                    >
                      {recommendedSupplier.performanceLevel === 'excellent'
                        ? '优秀'
                        : recommendedSupplier.performanceLevel === 'good'
                        ? '良好'
                        : recommendedSupplier.performanceLevel === 'average'
                        ? '一般'
                        : '较差'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Col>
            <Col span={8}>
              <div className="bg-white rounded-lg p-4 h-full">
                <Title level={5} className="!mb-3 flex items-center gap-2">
                  <BarChartOutlined className="text-blue-500" />
                  推荐理由
                </Title>
                <Paragraph className="text-sm leading-relaxed">
                  {report.recommendationReason}
                </Paragraph>
              </div>
            </Col>
            <Col span={8}>
              <div className="bg-white rounded-lg p-4 h-full">
                <Title level={5} className="!mb-3 flex items-center gap-2">
                  <HistoryOutlined className="text-blue-500" />
                  历史合作记录
                </Title>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Text type="secondary">累计合作订单</Text>
                    <Text strong>{recommendedSupplier.totalOrders} 单</Text>
                  </div>
                  <div className="flex justify-between text-sm">
                    <Text type="secondary">累计合作金额</Text>
                    <Text strong>{formatCurrency(recommendedSupplier.totalAmount)}</Text>
                  </div>
                  <div className="flex justify-between text-sm">
                    <Text type="secondary">准时交货率</Text>
                    <Text strong className="text-green-600">
                      {formatNumber(recommendedSupplier.onTimeDeliveryRate * 100, 1)}%
                    </Text>
                  </div>
                  <div className="flex justify-between text-sm">
                    <Text type="secondary">质量合格率</Text>
                    <Text strong className="text-green-600">
                      {formatNumber(recommendedSupplier.qualityPassRate * 100, 1)}%
                    </Text>
                  </div>
                  <div className="flex justify-between text-sm">
                    <Text type="secondary">满意度评分</Text>
                    <Text strong className="text-yellow-600">
                      {recommendedSupplier.satisfactionScore} 分
                    </Text>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

const PriceComparison: React.FC = () => {
  const [reports, setReports] = useState<ReportWithDetail[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetail | null>(null);
  const [searchForm] = Form.useForm();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    setLoading(true);
    setTimeout(() => {
      const enriched = mockComparisonReports.map((report) => enrichReport(report));
      setReports(enriched);
      setFilteredReports(enriched);
      setLoading(false);
    }, 300);
  };

  const handleSearch = (values: any) => {
    let filtered = [...reports];

    if (values.keyword) {
      const keyword = values.keyword.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reportNo.toLowerCase().includes(keyword) ||
          r.inquiryNo.toLowerCase().includes(keyword) ||
          r.requirementTitle.toLowerCase().includes(keyword) ||
          r.recommendedSupplierName.toLowerCase().includes(keyword)
      );
    }

    if (values.category) {
      filtered = filtered.filter((r) => {
        const inquiry = getInquiryById(r.inquiryId);
        return inquiry?.category === values.category;
      });
    }

    if (values.dateRange) {
      const start = dayjs(values.dateRange[0]).startOf('day');
      const end = dayjs(values.dateRange[1]).endOf('day');
      filtered = filtered.filter((r) => {
        const createdAt = dayjs(r.createdAt);
        return createdAt.isAfter(start) && createdAt.isBefore(end);
      });
    }

    setFilteredReports(filtered);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFilteredReports(reports);
  };

  const handleViewDetail = (report: ReportWithDetail) => {
    setSelectedReport(report);
    setIsDetailVisible(true);
  };

  const handleConfirmWin = async (supplierId: string) => {
    if (!selectedReport) return;
    try {
      await selectSupplier(selectedReport.inquiryId, supplierId);
      message.success('已确认中标供应商');
      setIsDetailVisible(false);
      loadReports();
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  const handleCreateOrder = async (supplierId: string) => {
    if (!selectedReport) return;
    try {
      const result = await createOrderFromInquiry(selectedReport.inquiryId, supplierId);
      message.success(`采购订单已创建，订单号：${result.orderId}`);
      setIsDetailVisible(false);
      loadReports();
    } catch (error) {
      message.error('创建订单失败，请重试');
    }
  };

  const handleReCompare = async () => {
    if (!selectedReport) return;
    try {
      const newReport = await generateComparisonReport(selectedReport.inquiryId);
      const enriched = enrichReport(newReport);
      setReports((prev) => prev.map((r) => (r.id === selectedReport.id ? enriched : r)));
      setFilteredReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? enriched : r))
      );
      setSelectedReport(enriched);
      message.success('比价报告已重新生成');
    } catch (error) {
      message.error('重新比价失败，请重试');
    }
  };

  const columns: ColumnsType<ReportWithDetail> = [
    {
      title: '报告编号',
      dataIndex: 'reportNo',
      key: 'reportNo',
      width: 160,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '关联询价单',
      key: 'inquiry',
      width: 280,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.inquiryNo}</div>
          <div className="text-sm text-neutral-500 truncate">{record.inquiryTitle}</div>
        </div>
      ),
    },
    {
      title: '关联需求',
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
      title: '供应商数',
      dataIndex: 'quotes',
      key: 'supplierCount',
      width: 100,
      align: 'center',
      render: (quotes) => `${quotes.length} 家`,
    },
    {
      title: '推荐供应商',
      key: 'recommended',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tag color="green">{record.recommendedSupplierShortName}</Tag>
          {record.hasOrder && <Tag color="blue">已下单</Tag>}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">比价报告</h1>
          <p className="text-sm text-neutral-500 mt-1">供应商价格对比分析报告</p>
        </div>
      </div>

      {!isDetailVisible ? (
        <>
          <Card className="mb-4" variant="outlined">
            <Form
              form={searchForm}
              layout="inline"
              onFinish={handleSearch}
              className="flex flex-wrap gap-4"
            >
              <Form.Item name="keyword" label="关键词">
                <Input
                  placeholder="报告编号/询价单/供应商"
                  prefix={<SearchOutlined />}
                  style={{ width: 240 }}
                />
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
              <Form.Item name="dateRange" label="创建时间">
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

          <Card variant="outlined">
            <Table
              columns={columns}
              dataSource={filteredReports}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
                pageSize: 10,
              }}
              scroll={{ x: 1200 }}
              locale={{
                emptyText: (
                  <Empty
                    description="暂无比价报告数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </Card>
        </>
      ) : (
        <Card
          variant="outlined"
          title={
            <Space>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => setIsDetailVisible(false)}
              >
                返回列表
              </Button>
              <span>|</span>
              <span>{selectedReport?.reportNo} 详情</span>
            </Space>
          }
        >
          {selectedReport && (
            <ReportDetailView
              report={selectedReport}
              onConfirmWin={handleConfirmWin}
              onCreateOrder={handleCreateOrder}
              onReCompare={handleReCompare}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default PriceComparison;
