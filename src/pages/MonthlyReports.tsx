import { useState, useMemo, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Descriptions,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Space,
  Select,
  DatePicker,
  message,
} from 'antd';
import {
  FileText,
  Calendar,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  Eye,
  Download,
  FileSpreadsheet,
  FileImage,
  TrendingUp,
  PieChart,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import type { MonthlyReport } from '@shared/types';
import { formatCurrency, formatPercent, formatNumber } from '../utils/format';
import { CATEGORIES, DEFAULT_PAGE_SIZE } from '../utils/constants';
import { mockMonthlyReports } from '../utils/mock';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function MonthlyReports() {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
  const [filterYear, setFilterYear] = useState<string>('');
  const [dateRange, setDateRange] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const categoryPieOption = (report: MonthlyReport) => {
    const colors = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#00BFBC', '#86909C', '#722ED1'];
    return {
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
        data: Object.entries(report.purchaseByCategory).map(([key, value], index) => ({
          value,
          name: getCategoryLabel(key),
          itemStyle: { color: colors[index % colors.length] },
        })),
      }],
    };
  };

  const supplierRankOption = (report: MonthlyReport) => {
    return {
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
        data: report.supplierRanking.slice().reverse().map(s => s.supplierName),
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
        data: report.supplierRanking.slice().reverse().map(s => s.amount),
      }],
    };
  };

  const satisfactionBarOption = (report: MonthlyReport) => {
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E6EB',
        textStyle: { color: '#4E5969' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: report.satisfactionScores.map(s => s.supplierName),
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C', rotate: 30 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 5,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C' },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      series: [{
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#FF7D00' },
              { offset: 1, color: 'rgba(255, 125, 0, 0.3)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: report.satisfactionScores.map(s => s.score),
      }],
    };
  };

  const trendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      textStyle: { color: '#4E5969' },
    },
    legend: {
      data: ['采购总额', '订单数'],
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
      data: mockMonthlyReports.map(r => r.yearMonth),
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
        name: '采购总额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 3, color: '#165DFF' },
        itemStyle: { color: '#165DFF' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 93, 255, 0.3)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.05)' },
            ],
          },
        },
        data: mockMonthlyReports.map(r => r.performanceMetrics.totalAmount),
      },
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        yAxisIndex: 1,
        lineStyle: { width: 3, color: '#00B42A' },
        itemStyle: { color: '#00B42A' },
        data: mockMonthlyReports.map(r => r.performanceMetrics.orderCount),
      },
    ],
  };

  const filteredReports = useMemo(() => {
    return mockMonthlyReports.filter(r => {
      const matchYear = !filterYear || r.yearMonth.startsWith(filterYear);
      return matchYear;
    }).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }, [filterYear]);

  const handleViewDetail = (report: MonthlyReport) => {
    setCurrentReport(report);
    setDetailModalVisible(true);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !currentReport) return;

    try {
      message.loading('正在生成PDF...');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`月度报表_${currentReport.yearMonth}.pdf`);
      message.success('PDF导出成功');
    } catch (error) {
      message.error('PDF导出失败');
      console.error(error);
    }
  };

  const handleExportExcel = () => {
    if (!currentReport) return;

    try {
      message.loading('正在生成Excel...');

      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['指标', '数值'],
        ['月份', currentReport.yearMonth],
        ['采购总额', currentReport.performanceMetrics.totalAmount],
        ['订单数', currentReport.performanceMetrics.orderCount],
        ['平均交货天数', currentReport.performanceMetrics.averageDeliveryDays],
        ['质量合格率', currentReport.performanceMetrics.qualityPassRate],
        ['按时付款率', currentReport.performanceMetrics.onTimePaymentRate],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, '概览');

      const categoryData = [
        ['品类', '采购金额'],
        ...Object.entries(currentReport.purchaseByCategory).map(([key, value]) => [
          getCategoryLabel(key),
          value,
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, ws2, '品类采购');

      const supplierData = [
        ['排名', '供应商名称', '采购金额', '订单数'],
        ...currentReport.supplierRanking.map((s, i) => [
          i + 1,
          s.supplierName,
          s.amount,
          s.orderCount,
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(supplierData);
      XLSX.utils.book_append_sheet(wb, ws3, '供应商排名');

      XLSX.writeFile(wb, `月度报表_${currentReport.yearMonth}.xlsx`);
      message.success('Excel导出成功');
    } catch (error) {
      message.error('Excel导出失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '月份',
      dataIndex: 'yearMonth',
      key: 'yearMonth',
      width: 120,
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span className="font-medium text-neutral-800">{text}</span>
        </div>
      ),
    },
    {
      title: '采购总额',
      dataIndex: ['performanceMetrics', 'totalAmount'],
      key: 'totalAmount',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <div>
          <p className="font-semibold text-neutral-800">{formatCurrency(val)}</p>
          {val > 10000000 && (
            <span className="text-xs text-success-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 超千万
            </span>
          )}
        </div>
      ),
    },
    {
      title: '订单数',
      dataIndex: ['performanceMetrics', 'orderCount'],
      key: 'orderCount',
      width: 100,
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-medium">{val.toLocaleString()} 笔</span>
      ),
    },
    {
      title: '平均交货天数',
      dataIndex: ['performanceMetrics', 'averageDeliveryDays'],
      key: 'averageDeliveryDays',
      width: 130,
      align: 'center' as const,
      render: (val: number) => (
        <Tag color={val <= 5 ? 'green' : val <= 7 ? 'blue' : 'orange'}>
          {val} 天
        </Tag>
      ),
    },
    {
      title: '质量合格率',
      dataIndex: ['performanceMetrics', 'qualityPassRate'],
      key: 'qualityPassRate',
      width: 180,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor={val >= 0.98 ? '#00B42A' : val >= 0.95 ? '#165DFF' : '#FF7D00'}
            showInfo={false}
            style={{ width: 80 }}
          />
          <span className="font-medium">{formatPercent(val, 1)}</span>
        </div>
      ),
    },
    {
      title: '按时付款率',
      dataIndex: ['performanceMetrics', 'onTimePaymentRate'],
      key: 'onTimePaymentRate',
      width: 180,
      render: (val: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={val * 100}
            size="small"
            strokeColor="#722ED1"
            showInfo={false}
            style={{ width: 80 }}
          />
          <span className="font-medium">{formatPercent(val, 1)}</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: MonthlyReport) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">月度报表</h1>
          <p className="text-sm text-neutral-500 mt-1">采购月度数据分析报告</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            placeholder="选择年份"
            value={filterYear || undefined}
            onChange={setFilterYear}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="2024">2024年</Option>
            <Option value="2023">2023年</Option>
          </Select>
          <RangePicker
            picker="month"
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 250 }}
          />
        </div>
      </div>

      <Card className="mb-4 animate-slide-up">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            历史趋势
          </h3>
        </div>
        <div className="card-body pt-2">
          <ReactECharts option={trendOption} style={{ height: 300 }} />
        </div>
      </Card>

      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-neutral-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            报表列表
          </h3>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredReports}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="月度报表详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="export-pdf"
            icon={<FileImage className="w-4 h-4" />}
            onClick={handleExportPDF}
          >
            导出PDF
          </Button>,
          <Button
            key="export-excel"
            type="primary"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExportExcel}
          >
            导出Excel
          </Button>,
        ]}
      >
        {currentReport && (
          <div ref={reportRef} className="space-y-6 bg-white p-4">
            <div className="text-center pb-4 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-800 mb-1">
                {currentReport.yearMonth} 月度采购报表
              </h2>
              <p className="text-sm text-neutral-500">生成时间：{new Date().toLocaleString()}</p>
            </div>

            <Row gutter={[16, 24]}>
              <Col span={6}>
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1">采购总额</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {formatCurrency(currentReport.performanceMetrics.totalAmount)}
                      </p>
                    </div>
                    <div className="stat-card-icon" style={{ backgroundColor: 'rgba(22, 93, 255, 0.1)', color: '#165DFF' }}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1">订单总数</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {currentReport.performanceMetrics.orderCount}
                        <span className="text-sm font-normal text-neutral-500 ml-1">笔</span>
                      </p>
                    </div>
                    <div className="stat-card-icon" style={{ backgroundColor: 'rgba(0, 180, 42, 0.1)', color: '#00B42A' }}>
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1">平均交货天数</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {currentReport.performanceMetrics.averageDeliveryDays}
                        <span className="text-sm font-normal text-neutral-500 ml-1">天</span>
                      </p>
                    </div>
                    <div className="stat-card-icon" style={{ backgroundColor: 'rgba(255, 125, 0, 0.1)', color: '#FF7D00' }}>
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className="stat-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-500 mb-1">质量合格率</p>
                      <p className="text-2xl font-bold text-neutral-800">
                        {formatPercent(currentReport.performanceMetrics.qualityPassRate, 1)}
                      </p>
                    </div>
                    <div className="stat-card-icon" style={{ backgroundColor: 'rgba(114, 46, 209, 0.1)', color: '#722ED1' }}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary-500" />
                    各品类采购额
                  </h3>
                </div>
                <div className="card-body pt-2">
                  <ReactECharts option={categoryPieOption(currentReport)} style={{ height: 280 }} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-success-500" />
                    供应商排名
                  </h3>
                </div>
                <div className="card-body pt-2">
                  <ReactECharts option={supplierRankOption(currentReport)} style={{ height: 280 }} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <Users className="w-4 h-4 text-warning-500" />
                  供应商满意度
                </h3>
              </div>
              <div className="card-body pt-2">
                <ReactECharts option={satisfactionBarOption(currentReport)} style={{ height: 250 }} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  付款时效
                </h3>
              </div>
              <div className="card-body pt-2">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div className="text-center p-4 bg-success-50 rounded-lg">
                      <p className="text-3xl font-bold text-success-600 mb-1">
                        {currentReport.paymentTimeliness.onTime}
                      </p>
                      <p className="text-sm text-neutral-600">按时付款</p>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center p-4 bg-warning-50 rounded-lg">
                      <p className="text-3xl font-bold text-warning-600 mb-1">
                        {currentReport.paymentTimeliness.overdue}
                      </p>
                      <p className="text-sm text-neutral-600">逾期付款</p>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="text-center p-4 bg-primary-50 rounded-lg">
                      <p className="text-3xl font-bold text-primary-600 mb-1">
                        {currentReport.paymentTimeliness.averageDays}
                      </p>
                      <p className="text-sm text-neutral-600">平均付款天数</p>
                    </div>
                  </Col>
                </Row>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-600">按时付款率</span>
                    <span className="font-semibold">
                      {formatPercent(
                        currentReport.paymentTimeliness.onTime /
                        (currentReport.paymentTimeliness.onTime + currentReport.paymentTimeliness.overdue),
                        1
                      )}
                    </span>
                  </div>
                  <Progress
                    percent={
                      (currentReport.paymentTimeliness.onTime /
                        (currentReport.paymentTimeliness.onTime + currentReport.paymentTimeliness.overdue)) * 100
                    }
                    strokeColor="#722ED1"
                    showInfo={false}
                  />
                </div>
              </div>
            </div>

            <Card size="small" title="品类采购明细">
              <Table
                rowKey="category"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '品类',
                    dataIndex: 'category',
                    key: 'category',
                    render: (category: string) => getCategoryLabel(category),
                  },
                  {
                    title: '采购金额',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right' as const,
                    render: (val: number) => formatCurrency(val),
                  },
                  {
                    title: '占比',
                    key: 'percentage',
                    align: 'right' as const,
                    render: (_: any, record: any) => {
                      const total = Object.values(currentReport.purchaseByCategory).reduce((a, b) => a + b, 0);
                      return formatPercent(record.amount / total, 1);
                    },
                  },
                ]}
                dataSource={Object.entries(currentReport.purchaseByCategory).map(([category, amount]) => ({
                  category,
                  amount,
                }))}
              />
            </Card>

            <Card size="small" title="供应商采购排名">
              <Table
                rowKey="supplierId"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '排名',
                    key: 'rank',
                    width: 60,
                    render: (_: any, __: any, index: number) => (
                      <span className={`font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-500' : index === 2 ? 'text-amber-600' : 'text-neutral-500'}`}>
                        {index + 1}
                      </span>
                    ),
                  },
                  {
                    title: '供应商名称',
                    dataIndex: 'supplierName',
                    key: 'supplierName',
                  },
                  {
                    title: '采购金额',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right' as const,
                    render: (val: number) => formatCurrency(val),
                  },
                  {
                    title: '订单数',
                    dataIndex: 'orderCount',
                    key: 'orderCount',
                    align: 'right' as const,
                    render: (val: number) => val.toLocaleString() + '笔',
                  },
                ]}
                dataSource={currentReport.supplierRanking}
              />
            </Card>

            <Card size="small" title="供应商满意度">
              <Table
                rowKey="supplierId"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: '供应商名称',
                    dataIndex: 'supplierName',
                    key: 'supplierName',
                  },
                  {
                    title: '满意度评分',
                    dataIndex: 'score',
                    key: 'score',
                    render: (val: number) => (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{val.toFixed(1)}</span>
                        <span className="text-yellow-500">
                          {'★'.repeat(Math.floor(val))}
                          {'☆'.repeat(5 - Math.floor(val))}
                        </span>
                      </div>
                    ),
                  },
                ]}
                dataSource={currentReport.satisfactionScores}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
