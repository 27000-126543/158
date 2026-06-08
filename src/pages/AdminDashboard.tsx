import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Space,
  Table,
  Tag,
  Progress,
} from 'antd';
import {
  DollarSign,
  ShoppingCart,
  Users,
  RefreshCw,
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Activity,
  Filter,
  Download,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { MonthlyReport } from '@shared/types';
import { formatCurrency, formatPercent, formatNumber, getStatusLabel } from '../utils/format';
import { CATEGORIES, DEFAULT_PAGE_SIZE } from '../utils/constants';
import { mockMonthlyReports, mockSuppliers, mockOrders } from '../utils/mock';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function AdminDashboard() {
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const mockPurchaseTrend = [
    { month: '1月', amount: 8500000, orders: 38 },
    { month: '2月', amount: 7200000, orders: 32 },
    { month: '3月', amount: 10855000, orders: 52 },
    { month: '4月', amount: 8672000, orders: 39 },
    { month: '5月', amount: 10987000, orders: 47 },
    { month: '6月', amount: 11200000, orders: 50 },
  ];

  const mockCategoryData = [
    { category: 'it_equipment', amount: 2850000, percentage: 25.9 },
    { category: 'raw_materials', amount: 5680000, percentage: 51.7 },
    { category: 'office_supplies', amount: 456000, percentage: 4.2 },
    { category: 'software', amount: 1200000, percentage: 10.9 },
    { category: 'packaging', amount: 234000, percentage: 2.1 },
    { category: 'marketing', amount: 567000, percentage: 5.2 },
  ];

  const mockSupplierRanking = [
    { rank: 1, supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', amount: 28900000, orderCount: 234, onTimeRate: 0.96, qualityRate: 0.98 },
    { rank: 2, supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', amount: 12580000, orderCount: 156, onTimeRate: 0.985, qualityRate: 0.992 },
    { rank: 3, supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', amount: 8900000, orderCount: 45, onTimeRate: 0.99, qualityRate: 0.995 },
    { rank: 4, supplierId: 'supp_002', supplierName: '广州市办公设备有限公司', amount: 3560000, orderCount: 89, onTimeRate: 0.95, qualityRate: 0.97 },
    { rank: 5, supplierId: 'supp_004', supplierName: '佛山市包装材料有限公司', amount: 1280000, orderCount: 67, onTimeRate: 0.92, qualityRate: 0.94 },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, [filterCategory, dateRange]);

  const totalPurchaseAmount = useMemo(() => {
    return mockPurchaseTrend.reduce((sum, item) => sum + item.amount, 0);
  }, []);

  const totalOrders = useMemo(() => {
    return mockPurchaseTrend.reduce((sum, item) => sum + item.orders, 0);
  }, []);

  const activeSuppliers = useMemo(() => {
    return mockSuppliers.filter(s => s.status === 'active').length;
  }, []);

  const inventoryTurnover = 6.8;

  const statCards = [
    {
      title: '采购总金额',
      value: formatCurrency(totalPurchaseAmount),
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'rgba(22, 93, 255, 0.1)',
      iconColor: '#165DFF',
      trend: 12.5,
      trendLabel: '较上期',
    },
    {
      title: '订单总量',
      value: totalOrders.toLocaleString(),
      suffix: '笔',
      icon: <ShoppingCart className="w-5 h-5" />,
      iconBg: 'rgba(0, 180, 42, 0.1)',
      iconColor: '#00B42A',
      trend: 8.3,
      trendLabel: '较上期',
    },
    {
      title: '活跃供应商',
      value: activeSuppliers.toString(),
      suffix: '家',
      icon: <Users className="w-5 h-5" />,
      iconBg: 'rgba(114, 46, 209, 0.1)',
      iconColor: '#722ED1',
      trend: 3.8,
      trendLabel: '较上期',
    },
    {
      title: '库存周转率',
      value: inventoryTurnover.toFixed(1),
      suffix: '次/年',
      icon: <Activity className="w-5 h-5" />,
      iconBg: 'rgba(255, 125, 0, 0.1)',
      iconColor: '#FF7D00',
      trend: -1.5,
      trendLabel: '较上期',
    },
  ];

  const purchaseTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['采购金额', '订单数量'],
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
      data: mockPurchaseTrend.map(item => item.month),
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: [
      {
        type: 'value',
        name: '金额(万元)',
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: {
          color: '#86909C',
          formatter: (value: number) => (value / 10000).toFixed(0),
        },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      {
        type: 'value',
        name: '订单数',
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '采购金额',
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#165DFF' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.3)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: mockPurchaseTrend.map(item => item.amount),
      },
      {
        name: '订单数量',
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
              { offset: 0, color: 'rgba(0, 180, 42, 0.3)' },
              { offset: 1, color: 'rgba(0, 180, 42, 0.05)' },
            ],
          },
        },
        data: mockPurchaseTrend.map(item => item.orders),
      },
    ],
  };

  const categoryPieOption = {
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
      data: mockCategoryData.map((item, index) => {
        const cat = CATEGORIES.find(c => c.value === item.category);
        const colors = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#00BFBC'];
        return {
          value: item.amount,
          name: cat?.label || item.category,
          itemStyle: { color: colors[index % colors.length] },
        };
      }),
    }],
  };

  const supplierRankOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: {
        color: '#86909C',
        formatter: (value: number) => (value / 10000).toFixed(0) + '万',
      },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    yAxis: {
      type: 'category',
      data: mockSupplierRanking.slice().reverse().map(s => s.supplierName),
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    series: [{
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#722ED1' },
            { offset: 1, color: '#165DFF' },
          ],
        },
        borderRadius: [0, 4, 4, 0],
      },
      data: mockSupplierRanking.slice().reverse().map(s => s.amount),
    }],
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank === 2) return 'bg-gray-400';
    if (rank === 3) return 'bg-amber-600';
    return 'bg-neutral-300';
  };

  const supplierColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, record: any) => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRankColor(record.rank)}`}>
          {record.rank}
        </div>
      ),
    },
    {
      title: '供应商名称',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 220,
    },
    {
      title: '合作订单',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right' as const,
      render: (val: number) => val.toLocaleString() + '笔',
    },
    {
      title: '采购金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: '准时交货率',
      dataIndex: 'onTimeRate',
      key: 'onTimeRate',
      width: 150,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor="#165DFF"
            showInfo={false}
            style={{ width: 70 }}
          />
          <span>{formatPercent(val, 1)}</span>
        </div>
      ),
    },
    {
      title: '质量合格率',
      dataIndex: 'qualityRate',
      key: 'qualityRate',
      width: 150,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor="#00B42A"
            showInfo={false}
            style={{ width: 70 }}
          />
          <span>{formatPercent(val, 1)}</span>
        </div>
      ),
    },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">管理员看板</h1>
          <p className="text-sm text-neutral-500 mt-1">系统管理全局数据概览</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<Download className="w-4 h-4" />}>
            导出报表
          </Button>
        </div>
      </div>

      <Card className="mb-4 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-600 font-medium">筛选条件</span>
          </div>
          <Space wrap>
            <Select
              placeholder="选择品类"
              value={filterCategory || undefined}
              onChange={setFilterCategory}
              style={{ width: 180 }}
              allowClear
            >
              {CATEGORIES.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 280 }}
            />
            <Button type="primary">
              应用筛选
            </Button>
          </Space>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-neutral-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {card.value}
                  {card.suffix && <span className="text-sm font-normal text-neutral-500 ml-1">{card.suffix}</span>}
                </p>
                {card.trend !== undefined && (
                  <div className="flex items-center mt-2 text-sm">
                    {card.trend >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-danger-500 mr-1 rotate-180" />
                    )}
                    <span className={card.trend >= 0 ? 'text-success-600' : 'text-danger-600'}>
                      {card.trend >= 0 ? '+' : ''}{card.trend.toFixed(1)}%
                    </span>
                    <span className="text-neutral-400 ml-2">{card.trendLabel}</span>
                  </div>
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
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              采购趋势
            </h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={purchaseTrendOption} style={{ height: 320 }} />
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <PieChart className="w-4 h-4 text-success-500" />
              品类占比
            </h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={categoryPieOption} style={{ height: 320 }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warning-500" />
              供应商排名
            </h3>
          </div>
          <div className="card-body pt-2">
            <ReactECharts option={supplierRankOption} style={{ height: 320 }} />
          </div>
        </div>

        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '700ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" />
              供应商绩效排行
            </h3>
          </div>
          <div className="card-body pt-2">
            <Table
              rowKey="rank"
              columns={supplierColumns}
              dataSource={mockSupplierRanking}
              loading={loading}
              pagination={false}
              scroll={{ x: 800 }}
            />
          </div>
        </div>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '800ms' }}>
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            关键指标监控
          </h3>
        </div>
        <div className="card-body pt-2">
          <Row gutter={[16, 24]}>
            <Col span={6}>
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">订单完成率</p>
                <p className="text-3xl font-bold text-primary-600 mb-2">92.5%</p>
                <Progress percent={92.5} strokeColor="#165DFF" showInfo={false} />
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">供应商合格率</p>
                <p className="text-3xl font-bold text-success-600 mb-2">96.8%</p>
                <Progress percent={96.8} strokeColor="#00B42A" showInfo={false} />
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">付款及时率</p>
                <p className="text-3xl font-bold text-purple-600 mb-2">89.4%</p>
                <Progress percent={89.4} strokeColor="#722ED1" showInfo={false} />
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">质量合格率</p>
                <p className="text-3xl font-bold text-warning-600 mb-2">98.2%</p>
                <Progress percent={98.2} strokeColor="#FF7D00" showInfo={false} />
              </div>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
}
