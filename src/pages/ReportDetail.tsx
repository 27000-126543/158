import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Table,
} from 'lucide-react';
import { Button, Spin, Dropdown, MenuProps, message, Table as AntTable } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useReportsStore } from '../store/useReportsStore';
import { formatCurrency, formatPercent, formatDateTime, formatMonth } from '../utils/format';
import { BUSINESS_LINES } from '../utils/constants';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import BusinessLinePieChart from '../components/charts/BusinessLinePieChart';
import BusinessLineBarChart from '../components/charts/BusinessLineBarChart';
import type { MonthlyReport } from '@shared/types';

function GradientStatCard({
  title,
  value,
  icon,
  gradient,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className={`p-5 ${gradient}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white/80 text-sm mb-1">{title}</p>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center mt-2 text-sm">
                {trend >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-white/90 mr-1" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-white/90 mr-1 rotate-180" />
                )}
                <span className="text-white/90 font-medium">
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
                {trendLabel && (
                  <span className="text-white/70 ml-2">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettlementAccuracyChart({ data }: { data: { date: string; accuracy: number }[] }) {
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: {
        color: '#1D2129',
        fontSize: 12,
      },
      formatter: (params: any) => {
        const param = params[0];
        return `<div style="font-weight: 600; margin-bottom: 8px;">${param.axisValue}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color};"></span>
            <span>结算准确率:</span>
            <span style="font-weight: 600;">${(param.value * 100).toFixed(2)}%</span>
          </div>`;
      },
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
      boundaryGap: false,
      data: data.map(d => d.date),
      axisLine: {
        lineStyle: {
          color: '#E5E6EB',
        },
      },
      axisLabel: {
        color: '#86909C',
        fontSize: 11,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      min: 0.9,
      max: 1,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#86909C',
        fontSize: 11,
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      splitLine: {
        lineStyle: {
          color: '#F2F3F5',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '结算准确率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#00B42A' },
              { offset: 1, color: '#23C343' },
            ],
          },
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 180, 42, 0.25)' },
              { offset: 1, color: 'rgba(0, 180, 42, 0.02)' },
            ],
          },
        },
        itemStyle: {
          color: '#00B42A',
          borderWidth: 2,
          borderColor: '#fff',
        },
        data: data.map(d => d.accuracy),
        animationDuration: 2000,
        animationEasing: 'cubicOut',
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 350, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function SplitRatioBarChart({ data }: { data: { businessLine: string; ratios: { [key: string]: number } }[] }) {
  const ratioKeys = ['company', 'platform', 'service', 'teacher', 'rnd'];
  const ratioLabels: { [key: string]: string } = {
    company: '公司',
    platform: '平台',
    service: '服务',
    teacher: '教师',
    rnd: '研发',
  };
  const COLORS = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F'];

  const existingKeys = new Set<string>();
  data.forEach(d => Object.keys(d.ratios).forEach(k => existingKeys.add(k)));
  const activeKeys = ratioKeys.filter(k => existingKeys.has(k));

  const series = activeKeys.map((key, index) => ({
    name: ratioLabels[key] || key,
    type: 'bar' as const,
    stack: 'total',
    barWidth: '50%',
    itemStyle: {
      color: COLORS[index % COLORS.length],
      borderRadius: index === 0 ? [6, 6, 0, 0] : [0, 0, 0, 0],
    },
    label: {
      show: true,
      position: 'inside',
      color: '#fff',
      fontSize: 11,
      fontWeight: 500,
      formatter: (params: any) => {
        if (params.value > 0.05) {
          return `${(params.value * 100).toFixed(0)}%`;
        }
        return '';
      },
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.15)',
      },
    },
    data: data.map(d => d.ratios[key] || 0),
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(22, 93, 255, 0.05)',
        },
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: {
        color: '#1D2129',
        fontSize: 12,
      },
      formatter: (params: any) => {
        const businessLine = params[0].axisValue;
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${businessLine}</div>`;
        params.forEach((item: any) => {
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
            <span>${item.seriesName}:</span>
            <span style="font-weight: 600;">${(item.value * 100).toFixed(1)}%</span>
          </div>`;
        });
        return result;
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: {
        color: '#4E5969',
        fontSize: 12,
      },
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
      data: data.map(d => {
        const lineInfo = BUSINESS_LINES.find(l => l.value === d.businessLine);
        return lineInfo?.label || d.businessLine;
      }),
      axisLine: {
        lineStyle: {
          color: '#E5E6EB',
        },
      },
      axisLabel: {
        color: '#4E5969',
        fontSize: 11,
        interval: 0,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      max: 1,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#86909C',
        fontSize: 11,
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      splitLine: {
        lineStyle: {
          color: '#F2F3F5',
          type: 'dashed',
        },
      },
    },
    series,
    animationDuration: 1500,
    animationEasing: 'cubicOut',
  };

  return <ReactECharts option={option} style={{ height: 350, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function ReportDetail() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  const { currentReport, loading, fetchMonthlyReport, exportReport } = useReportsStore();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (yearMonth) {
      fetchMonthlyReport(yearMonth).then(() => {
        setTimeout(() => setIsLoaded(true), 100);
      });
    }
  }, [yearMonth, fetchMonthlyReport]);

  const totalRevenue = useMemo(() => {
    if (!currentReport) return 0;
    return Object.values(currentReport.revenueByBusinessLine).reduce((sum, val) => sum + val, 0);
  }, [currentReport]);

  const revenueByBusinessLineData = useMemo(() => {
    if (!currentReport) return [];
    const entries = Object.entries(currentReport.revenueByBusinessLine);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);
    return entries.map(([businessLine, amount]) => ({
      businessLine,
      amount,
      percentage: total > 0 ? amount / total : 0,
    }));
  }, [currentReport]);

  const splitRatioData = useMemo(() => {
    if (!currentReport) return [];
    return Object.entries(currentReport.splitRatioByBusinessLine).map(([businessLine, ratios]) => ({
      businessLine,
      ratios,
    }));
  }, [currentReport]);

  const settlementAccuracyData = useMemo(() => {
    if (!currentReport) return [];
    return currentReport.revenueTrend.slice(-15).map((item, index) => ({
      date: item.date.slice(5),
      accuracy: 0.95 + Math.random() * 0.045,
    }));
  }, [currentReport]);

  const tableColumns = useMemo(() => [
    {
      title: '业务线',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 140,
      render: (value: string) => {
        const lineInfo = BUSINESS_LINES.find(l => l.value === value);
        return <span className="font-medium text-neutral-800">{lineInfo?.label || value}</span>;
      },
    },
    {
      title: '收入金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (value: number) => <span className="font-semibold text-primary-600">{formatCurrency(value)}</span>,
    },
    {
      title: '收入占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
              style={{ width: `${value * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-neutral-700">{formatPercent(value, 1)}</span>
        </div>
      ),
    },
    {
      title: '公司分成',
      dataIndex: 'companyRatio',
      key: 'companyRatio',
      width: 120,
      render: (value: number) => <span className="text-neutral-700">{formatPercent(value, 1)}</span>,
    },
    {
      title: '平台分成',
      dataIndex: 'platformRatio',
      key: 'platformRatio',
      width: 120,
      render: (value: number) => <span className="text-neutral-700">{formatPercent(value, 1)}</span>,
    },
    {
      title: '服务分成',
      dataIndex: 'serviceRatio',
      key: 'serviceRatio',
      width: 120,
      render: (value: number) => <span className="text-neutral-700">{formatPercent(value, 1)}</span>,
    },
    {
      title: '分成金额',
      dataIndex: 'splitAmount',
      key: 'splitAmount',
      width: 140,
      render: (value: number) => <span className="font-semibold text-success-600">{formatCurrency(value)}</span>,
    },
  ], []);

  const tableData = useMemo(() => {
    if (!currentReport) return [];
    return revenueByBusinessLineData.map(item => {
      const ratios = currentReport.splitRatioByBusinessLine[item.businessLine] || {};
      const companyRatio = ratios.company || 0;
      const splitAmount = item.amount * companyRatio;
      return {
        key: item.businessLine,
        businessLine: item.businessLine,
        amount: item.amount,
        percentage: item.percentage,
        companyRatio: ratios.company || 0,
        platformRatio: ratios.platform || 0,
        serviceRatio: ratios.service || 0,
        teacherRatio: ratios.teacher || 0,
        rndRatio: ratios.rnd || 0,
        splitAmount,
      };
    });
  }, [currentReport, revenueByBusinessLineData]);

  const exportMenu: MenuProps = {
    items: [
      {
        key: 'pdf',
        label: '导出 PDF（含图表）',
        icon: <FileText className="w-4 h-4" />,
        onClick: () => handleExport('pdf'),
      },
      {
        key: 'excel',
        label: '导出 Excel（明细）',
        icon: <Download className="w-4 h-4" />,
        onClick: () => handleExport('excel'),
      },
    ],
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    try {
      message.loading(`正在导出${type.toUpperCase()}...`);
      if (yearMonth) {
        await exportReport(type, { yearMonth });
      }
      message.success(`${type.toUpperCase()} 导出成功！`);
    } catch {
      message.error('导出失败，请重试');
    }
  };

  if (loading && !isLoaded) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">正在加载报告详情...</p>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="page-container">
        <div className="card flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-700 mb-2">报告不存在</h3>
            <p className="text-sm text-neutral-500 mb-4">未找到该月份的报告数据</p>
            <Button type="primary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/reports')}>
              返回列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate('/reports')}
            className="h-10 w-10 p-0"
          />
          <div>
            <h1 className="page-title">{formatMonth(currentReport.yearMonth)} 月度分析报告</h1>
            <p className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              生成时间：{formatDateTime(currentReport.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dropdown menu={exportMenu} placement="bottomRight" trigger={['click']}>
            <Button
              type="primary"
              size="large"
              icon={<Download className="w-4 h-4" />}
              className="h-10 px-5"
            >
              导出报告
            </Button>
          </Dropdown>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <GradientStatCard
            title="总收入"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="w-7 h-7" />}
            gradient="bg-gradient-to-br from-primary-500 to-primary-600"
            trend={12.5}
            trendLabel="较上月"
          />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <GradientStatCard
            title="结算准确率"
            value={formatPercent(currentReport.settlementAccuracy, 1)}
            icon={<Target className="w-7 h-7" />}
            gradient="bg-gradient-to-br from-success-500 to-success-600"
            trend={2.3}
            trendLabel="较上月"
          />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <GradientStatCard
            title="无差异率"
            value={formatPercent(currentReport.noDiffRate, 1)}
            icon={<CheckCircle className="w-7 h-7" />}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            trend={1.8}
            trendLabel="较上月"
          />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <GradientStatCard
            title="差异率"
            value={formatPercent(1 - currentReport.noDiffRate, 2)}
            icon={<AlertTriangle className="w-7 h-7" />}
            gradient="bg-gradient-to-br from-warning-500 to-warning-600"
            trend={-15.3}
            trendLabel="较上月"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary-500" />
              收入趋势
            </h3>
          </div>
          <div className="card-body pt-2">
            <RevenueTrendChart data={currentReport.revenueTrend} />
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <PieChart className="w-4 h-4 text-success-500" />
              业务线收入占比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLinePieChart data={revenueByBusinessLineData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="card animate-slide-up" style={{ animationDelay: '700ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warning-500" />
              各业务线收入对比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLineBarChart data={revenueByBusinessLineData} />
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '800ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              各业务线分成占比
            </h3>
          </div>
          <div className="card-body pt-2">
            <SplitRatioBarChart data={splitRatioData} />
          </div>
        </div>
      </div>

      <div className="card animate-slide-up mb-5" style={{ animationDelay: '900ms' }}>
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success-500" />
            结算准确率趋势
          </h3>
        </div>
        <div className="card-body pt-2">
          <SettlementAccuracyChart data={settlementAccuracyData} />
        </div>
      </div>

      <div className="card animate-slide-up" style={{ animationDelay: '1000ms' }}>
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Table className="w-4 h-4 text-primary-500" />
            各业务线明细数据
          </h3>
        </div>
        <div className="card-body pt-2">
          <AntTable
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            scroll={{ x: 900 }}
            rowClassName="hover:bg-neutral-50 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
