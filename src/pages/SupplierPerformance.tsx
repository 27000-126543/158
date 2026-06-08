import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Descriptions,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Rate,
  Tabs,
  Empty,
} from 'antd';
import {
  Search,
  RefreshCw,
  Eye,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Clock,
  CheckCircle,
  Users,
  ThumbsUp,
  AlertCircle,
  BarChart3,
  FileText,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { Supplier, PerformanceLevel } from '@shared/types';
import { useSuppliersStore } from '../store/useSuppliersStore';
import { formatCurrency, formatDate, formatPercent, getStatusLabel, getStatusColor } from '../utils/format';
import {
  CATEGORIES,
  SUPPLIER_STATUS,
  PERFORMANCE_LEVELS,
  DEFAULT_PAGE_SIZE,
} from '../utils/constants';
import { mockSuppliers } from '../utils/mock';

const { Option } = Select;
const { TabPane } = Tabs;

interface SupplierWithStats extends Supplier {
  comprehensiveScore: number;
}

export default function SupplierPerformance() {
  const { suppliers, loading, fetchSuppliers } = useSuppliersStore();

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<SupplierWithStats | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const allSuppliers = useMemo(() => {
    return [...suppliers, ...mockSuppliers].map(s => ({
      ...s,
      comprehensiveScore: Math.round(
        (s.onTimeDeliveryRate * 0.3 + s.qualityPassRate * 0.3 + s.satisfactionScore / 5 * 0.2 + s.performanceScore / 100 * 0.2) * 100
      ),
    }));
  }, [suppliers]);

  const statsCards = useMemo(() => {
    const total = allSuppliers.length;
    const excellent = allSuppliers.filter(s => s.performanceLevel === 'excellent').length;
    const good = allSuppliers.filter(s => s.performanceLevel === 'good').length;
    const avgSatisfaction = total > 0 
      ? (allSuppliers.reduce((sum, s) => sum + s.satisfactionScore, 0) / total).toFixed(1)
      : '0';

    return [
      {
        title: '总供应商数',
        value: total.toString(),
        icon: <Users className="w-5 h-5" />,
        iconBg: 'rgba(22, 93, 255, 0.1)',
        iconColor: '#165DFF',
      },
      {
        title: '优秀供应商',
        value: excellent.toString(),
        icon: <Award className="w-5 h-5" />,
        iconBg: 'rgba(255, 215, 0, 0.15)',
        iconColor: '#FFD700',
      },
      {
        title: '良好供应商',
        value: good.toString(),
        icon: <ThumbsUp className="w-5 h-5" />,
        iconBg: 'rgba(0, 180, 42, 0.1)',
        iconColor: '#00B42A',
      },
      {
        title: '平均满意度',
        value: `${avgSatisfaction}`,
        icon: <Star className="w-5 h-5" />,
        iconBg: 'rgba(114, 46, 209, 0.1)',
        iconColor: '#722ED1',
        suffix: <span className="text-lg">/ 5.0</span>,
      },
    ];
  }, [allSuppliers]);

  const performanceTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
    },
    legend: {
      data: ['准时交货率', '质量合格率', '综合评分'],
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
    yAxis: [
      {
        type: 'value',
        name: '比率(%)',
        min: 80,
        max: 100,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      {
        type: 'value',
        name: '评分',
        min: 80,
        max: 100,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '准时交货率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#165DFF' },
        itemStyle: { color: '#165DFF' },
        data: [95.2, 94.8, 96.5, 95.8, 97.2, 96.8],
      },
      {
        name: '质量合格率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#00B42A' },
        itemStyle: { color: '#00B42A' },
        data: [97.5, 96.8, 98.2, 97.5, 98.5, 98.0],
      },
      {
        name: '综合评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        yAxisIndex: 1,
        lineStyle: { width: 3, color: '#722ED1' },
        itemStyle: { color: '#722ED1' },
        data: [88, 86, 90, 89, 92, 91],
      },
    ],
  };

  const categoryDistributionOption = {
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
      data: CATEGORIES.slice(0, 6).map((cat, index) => {
        const count = allSuppliers.filter(s => s.category === cat.value).length;
        const colors = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#00BFBC'];
        return {
          value: count,
          name: cat.label,
          itemStyle: { color: colors[index % colors.length] },
        };
      }).filter(d => d.value > 0),
    }],
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return '#00B42A';
    if (score >= 80) return '#165DFF';
    if (score >= 70) return '#FF7D00';
    return '#F53F3F';
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const filteredSuppliers = useMemo(() => {
    return allSuppliers.filter(s => {
      const matchSearch = !searchText || 
        s.name.includes(searchText) ||
        s.shortName.includes(searchText) ||
        s.supplierNo.includes(searchText);
      const matchCategory = !filterCategory || s.category === filterCategory;
      const matchLevel = !filterLevel || s.performanceLevel === filterLevel;
      return matchSearch && matchCategory && matchLevel;
    }).sort((a, b) => b.comprehensiveScore - a.comprehensiveScore);
  }, [allSuppliers, searchText, filterCategory, filterLevel]);

  const handleViewDetail = (supplier: SupplierWithStats) => {
    setCurrentSupplier(supplier);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1;
        if (rank <= 3) {
          return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-amber-600'
            }`}>
              {rank}
            </div>
          );
        }
        return <span className="text-neutral-500">{rank}</span>;
      },
    },
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string, record: SupplierWithStats) => (
        <div>
          <p className="font-medium text-neutral-800">{text}</p>
          <p className="text-xs text-neutral-400">{record.supplierNo}</p>
        </div>
      ),
    },
    {
      title: '品类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => getCategoryLabel(category),
    },
    {
      title: '合作订单数',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 120,
      align: 'right' as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: '准时交货率',
      dataIndex: 'onTimeDeliveryRate',
      key: 'onTimeDeliveryRate',
      width: 130,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor="#165DFF"
            showInfo={false}
            style={{ width: 60 }}
          />
          <span>{formatPercent(val, 1)}</span>
        </div>
      ),
    },
    {
      title: '质量合格率',
      dataIndex: 'qualityPassRate',
      key: 'qualityPassRate',
      width: 130,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor="#00B42A"
            showInfo={false}
            style={{ width: 60 }}
          />
          <span>{formatPercent(val, 1)}</span>
        </div>
      ),
    },
    {
      title: '满意度',
      dataIndex: 'satisfactionScore',
      key: 'satisfactionScore',
      width: 140,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Rate disabled value={val} allowHalf count={5} className="text-sm" />
          <span className="text-neutral-600">{val.toFixed(1)}</span>
        </div>
      ),
    },
    {
      title: '综合评分',
      dataIndex: 'comprehensiveScore',
      key: 'comprehensiveScore',
      width: 120,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: getPerformanceColor(val) }}
          >
            {val}
          </div>
        </div>
      ),
    },
    {
      title: '等级',
      dataIndex: 'performanceLevel',
      key: 'performanceLevel',
      width: 100,
      render: (level: PerformanceLevel) => (
        <Tag color={getStatusColor(level, PERFORMANCE_LEVELS)}>
          {getStatusLabel(level, PERFORMANCE_LEVELS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: SupplierWithStats) => (
        <Button
          type="link"
          size="small"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">供应商绩效</h1>
          <p className="text-sm text-neutral-500 mt-1">供应商绩效评估与考核</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => fetchSuppliers()}>
            刷新
          </Button>
          <Button icon={<FileText className="w-4 h-4" />}>
            导出报表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <div key={index} className="stat-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-neutral-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {card.value}
                  {card.suffix}
                </p>
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
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              绩效趋势
            </h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={performanceTrendOption} style={{ height: 300 }} />
          </div>
        </div>
        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-success-500" />
              品类分布
            </h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={categoryDistributionOption} style={{ height: 300 }} />
          </div>
        </div>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h3 className="text-base font-semibold text-neutral-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-warning-500" />
            供应商绩效排行榜
          </h3>
          <Space wrap>
            <Input
              placeholder="搜索供应商名称、编号"
              prefix={<Search className="w-4 h-4 text-neutral-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              placeholder="选择品类"
              value={filterCategory || undefined}
              onChange={setFilterCategory}
              style={{ width: 150 }}
              allowClear
            >
              {CATEGORIES.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="绩效等级"
              value={filterLevel || undefined}
              onChange={setFilterLevel}
              style={{ width: 120 }}
              allowClear
            >
              {PERFORMANCE_LEVELS.map(level => (
                <Option key={level.value} value={level.value}>
                  {level.label}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredSuppliers}
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="供应商绩效详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentSupplier && (
          <div className="space-y-6">
            <Card size="small" className="bg-gradient-to-r from-primary-50 to-transparent">
              <Row gutter={16} align="middle">
                <Col span={4}>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: getPerformanceColor(currentSupplier.comprehensiveScore) }}
                  >
                    {currentSupplier.comprehensiveScore}
                  </div>
                </Col>
                <Col span={14}>
                  <h3 className="text-lg font-bold text-neutral-800 mb-1">
                    {currentSupplier.name}
                  </h3>
                  <p className="text-sm text-neutral-500 mb-2">
                    {currentSupplier.supplierNo} · {getCategoryLabel(currentSupplier.category)}
                  </p>
                  <Space>
                    <Tag color={getStatusColor(currentSupplier.performanceLevel, PERFORMANCE_LEVELS)}>
                      {getStatusLabel(currentSupplier.performanceLevel, PERFORMANCE_LEVELS)}
                    </Tag>
                    <Tag color={getStatusColor(currentSupplier.status, SUPPLIER_STATUS)}>
                      {getStatusLabel(currentSupplier.status, SUPPLIER_STATUS)}
                    </Tag>
                  </Space>
                </Col>
                <Col span={6} className="text-right">
                  <p className="text-sm text-neutral-500 mb-1">综合评分</p>
                  <p className="text-3xl font-bold" style={{ color: getPerformanceColor(currentSupplier.comprehensiveScore) }}>
                    {currentSupplier.comprehensiveScore}
                  </p>
                </Col>
              </Row>
            </Card>

            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="合作订单数"
                  value={currentSupplier.totalOrders}
                  suffix="笔"
                  valueStyle={{ color: '#165DFF' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="累计金额"
                  value={currentSupplier.totalAmount}
                  precision={2}
                  formatter={(val) => `¥${Number(val).toLocaleString()}`}
                  valueStyle={{ color: '#00B42A' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="信用评级"
                  value={currentSupplier.creditRating}
                  suffix="分"
                  valueStyle={{ color: '#722ED1' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="绩效得分"
                  value={currentSupplier.performanceScore}
                  suffix="分"
                  valueStyle={{ color: '#FF7D00' }}
                />
              </Col>
            </Row>

            <Card size="small" title="绩效指标详情">
              <Row gutter={[16, 24]}>
                <Col span={12}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> 准时交货率
                    </span>
                    <span className="font-semibold">{formatPercent(currentSupplier.onTimeDeliveryRate, 1)}</span>
                  </div>
                  <Progress
                    percent={currentSupplier.onTimeDeliveryRate * 100}
                    strokeColor="#165DFF"
                    showInfo={false}
                  />
                </Col>
                <Col span={12}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> 质量合格率
                    </span>
                    <span className="font-semibold">{formatPercent(currentSupplier.qualityPassRate, 1)}</span>
                  </div>
                  <Progress
                    percent={currentSupplier.qualityPassRate * 100}
                    strokeColor="#00B42A"
                    showInfo={false}
                  />
                </Col>
                <Col span={12}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-600 flex items-center gap-2">
                      <Star className="w-4 h-4" /> 满意度
                    </span>
                    <span className="font-semibold">
                      <Rate disabled value={currentSupplier.satisfactionScore} allowHalf count={5} className="text-sm" />
                      {currentSupplier.satisfactionScore.toFixed(1)}
                    </span>
                  </div>
                  <Progress
                    percent={(currentSupplier.satisfactionScore / 5) * 100}
                    strokeColor="#722ED1"
                    showInfo={false}
                  />
                </Col>
                <Col span={12}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-600 flex items-center gap-2">
                      <Award className="w-4 h-4" /> 综合评分
                    </span>
                    <span className="font-semibold">{currentSupplier.comprehensiveScore}分</span>
                  </div>
                  <Progress
                    percent={currentSupplier.comprehensiveScore}
                    strokeColor={{
                      '0%': '#165DFF',
                      '100%': '#00B42A',
                    }}
                    showInfo={false}
                  />
                </Col>
              </Row>
            </Card>

            <Descriptions title="基本信息" bordered column={2} size="small">
              <Descriptions.Item label="供应商编号">{currentSupplier.supplierNo}</Descriptions.Item>
              <Descriptions.Item label="简称">{currentSupplier.shortName}</Descriptions.Item>
              <Descriptions.Item label="联系人">{currentSupplier.contactName}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{currentSupplier.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="联系邮箱">{currentSupplier.contactEmail}</Descriptions.Item>
              <Descriptions.Item label="地址">{currentSupplier.address}</Descriptions.Item>
              <Descriptions.Item label="合作时间">{formatDate(currentSupplier.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatDate(currentSupplier.updatedAt)}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="绩效历史趋势">
              <ReactECharts
                option={{
                  tooltip: { trigger: 'axis' },
                  legend: { data: ['准时交货率', '质量合格率', '满意度'] },
                  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
                  },
                  yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
                  series: [
                    {
                      name: '准时交货率',
                      type: 'line',
                      smooth: true,
                      data: [93, 94, 95, 96, 95, currentSupplier.onTimeDeliveryRate * 100],
                      itemStyle: { color: '#165DFF' },
                    },
                    {
                      name: '质量合格率',
                      type: 'line',
                      smooth: true,
                      data: [96, 97, 98, 97, 98, currentSupplier.qualityPassRate * 100],
                      itemStyle: { color: '#00B42A' },
                    },
                    {
                      name: '满意度',
                      type: 'line',
                      smooth: true,
                      data: [4.5, 4.6, 4.7, 4.6, 4.8, currentSupplier.satisfactionScore].map(v => v * 20),
                      itemStyle: { color: '#722ED1' },
                    },
                  ],
                }}
                style={{ height: 250 }}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
