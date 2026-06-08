import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bell,
  Plus,
  FileText,
  RefreshCw,
  Settings,
  Info,
  XCircle,
  Flame,
} from 'lucide-react';
import { Progress, Button, Spin } from 'antd';
import { useDashboardStore } from '../store/useDashboardStore';
import { formatCurrency, formatPercent, formatRelativeTime } from '../utils/format';
import { ALERT_LEVELS } from '../utils/constants';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import BusinessLinePieChart from '../components/charts/BusinessLinePieChart';
import BusinessLineBarChart from '../components/charts/BusinessLineBarChart';
import type { SystemAlert, AlertLevel } from '@shared/types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: number;
  trendLabel?: string;
  suffix?: string;
  delay: number;
}

function StatCard({ title, value, icon, iconBg, iconColor, trend, trendLabel, suffix, delay }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;
    
    const numericValue = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
    const duration = 1500;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (numericValue - startValue) * easeProgress;

      if (value.includes('%')) {
        setDisplayValue(currentValue.toFixed(2) + '%');
      } else if (value.includes('¥')) {
        setDisplayValue('¥' + formatNumber(currentValue));
      } else {
        setDisplayValue(Math.round(currentValue).toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, isVisible]);

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      className={`stat-card animate-slide-up ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-neutral-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-neutral-800 tracking-tight">
            {displayValue}
            {suffix && <span className="text-sm font-normal text-neutral-500 ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <div className="flex items-center mt-2 text-sm">
              {trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger-500 mr-1" />
              )}
              <span className={trend >= 0 ? 'text-success-600' : 'text-danger-600'}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-neutral-400 ml-2">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className="stat-card-icon"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface AlertItemProps {
  alert: SystemAlert;
  delay: number;
}

function AlertItem({ alert, delay }: AlertItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const levelConfig: Record<AlertLevel, { icon: React.ReactNode; color: string; bg: string; borderColor: string }> = {
    info: {
      icon: <Info className="w-4 h-4" />,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      borderColor: 'border-l-primary-400',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      borderColor: 'border-l-warning-400',
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-danger-600',
      bg: 'bg-danger-50',
      borderColor: 'border-l-danger-400',
    },
    critical: {
      icon: <Flame className="w-4 h-4" />,
      color: 'text-red-700',
      bg: 'bg-red-50',
      borderColor: 'border-l-red-600',
    },
  };

  const config = levelConfig[alert.level];
  const levelLabel = ALERT_LEVELS.find(l => l.value === alert.level)?.label || alert.level;

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${config.bg} ${config.borderColor} transition-all duration-300 hover:shadow-sm cursor-pointer ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-neutral-800 text-sm">{alert.title}</span>
            <span className={`tag text-xs ${
              alert.level === 'critical' ? 'bg-red-100 text-red-700' :
              alert.level === 'error' ? 'tag-danger' :
              alert.level === 'warning' ? 'tag-warning' : 'tag-info'
            }`}>
              {levelLabel}
            </span>
            {alert.status === 'unread' && (
              <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-neutral-600 line-clamp-2">{alert.content}</p>
          <p className="text-xs text-neutral-400 mt-2">{formatRelativeTime(alert.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    stats,
    revenueTrend,
    revenueByBusinessLine,
    alerts,
    loading,
    fetchAllDashboardData,
  } = useDashboardStore();

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchAllDashboardData().then(() => {
      setTimeout(() => setIsLoaded(true), 100);
    });
  }, [fetchAllDashboardData]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: '今日收入',
        value: formatCurrency(stats.todayRevenue),
        icon: <DollarSign className="w-6 h-6" />,
        iconBg: 'rgba(22, 93, 255, 0.1)',
        iconColor: '#165DFF',
        trend: 12.5,
        trendLabel: '较昨日',
        delay: 100,
      },
      {
        title: '本月收入',
        value: formatCurrency(stats.monthRevenue),
        icon: <Calendar className="w-6 h-6" />,
        iconBg: 'rgba(0, 180, 42, 0.1)',
        iconColor: '#00B42A',
        trend: 8.3,
        trendLabel: '较上月',
        delay: 200,
      },
      {
        title: '结算进度',
        value: formatPercent(stats.settlementProgress, 1),
        icon: <Target className="w-6 h-6" />,
        iconBg: 'rgba(114, 46, 209, 0.1)',
        iconColor: '#722ED1',
        trend: 5.2,
        trendLabel: '较上周',
        delay: 300,
      },
      {
        title: '差异率',
        value: formatPercent(stats.diffRate, 2),
        icon: <AlertTriangle className="w-6 h-6" />,
        iconBg: 'rgba(255, 125, 0, 0.1)',
        iconColor: '#FF7D00',
        trend: -2.1,
        trendLabel: '较上周',
        delay: 400,
      },
      {
        title: '待办审批',
        value: stats.pendingApprovals.toString(),
        suffix: '条',
        icon: <Clock className="w-6 h-6" />,
        iconBg: 'rgba(245, 63, 63, 0.1)',
        iconColor: '#F53F3F',
        delay: 500,
      },
      {
        title: '今日交易数',
        value: stats.todayTransactions.toString(),
        suffix: '笔',
        icon: <CheckCircle className="w-6 h-6" />,
        iconBg: 'rgba(0, 191, 188, 0.1)',
        iconColor: '#00BFBC',
        trend: 15.8,
        trendLabel: '较昨日',
        delay: 600,
      },
    ];
  }, [stats]);

  const quickActions = [
    { label: '新增收入', icon: <Plus className="w-4 h-4" />, type: 'primary' },
    { label: '生成结算单', icon: <FileText className="w-4 h-4" />, type: 'default' },
    { label: '手动对账', icon: <RefreshCw className="w-4 h-4" />, type: 'default' },
    { label: '系统设置', icon: <Settings className="w-4 h-4" />, type: 'default' },
  ];

  if (loading && !isLoaded) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">数据概览</h1>
          <p className="text-sm text-neutral-500 mt-1">实时监控业务运营关键指标</p>
        </div>
        <div className="flex items-center gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              type={action.type === 'primary' ? 'primary' : 'default'}
              icon={action.icon}
              className="h-9"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {stats && (
        <div className="card animate-slide-up" style={{ animationDelay: '700ms' }}>
          <div className="card-body">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">本月结算进度</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(stats.settlementProgress, 1)}
                  </span>
                </div>
                <Progress
                  percent={stats.settlementProgress * 100}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#165DFF',
                    '100%': '#00B42A',
                  }}
                  strokeWidth={12}
                  size="small"
                />
              </div>
              <div className="h-12 w-px bg-neutral-200" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">对账准确率</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(1 - stats.diffRate, 1)}
                  </span>
                </div>
                <Progress
                  percent={(1 - stats.diffRate) * 100}
                  showInfo={false}
                  strokeColor="#00B42A"
                  strokeWidth={12}
                  size="small"
                />
              </div>
              <div className="h-12 w-px bg-neutral-200" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">差异处理率</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(0.85, 1)}
                  </span>
                </div>
                <Progress
                  percent={85}
                  showInfo={false}
                  strokeColor="#722ED1"
                  strokeWidth={12}
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '800ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              收入趋势
            </h3>
            <div className="flex gap-2">
              <Button size="small" type="primary">近30天</Button>
              <Button size="small">近90天</Button>
              <Button size="small">本年度</Button>
            </div>
          </div>
          <div className="card-body pt-2">
            <RevenueTrendChart data={revenueTrend} />
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '900ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Target className="w-4 h-4 text-success-500" />
              业务线收入占比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLinePieChart data={revenueByBusinessLine} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warning-500" />
              业务线收入对比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLineBarChart data={revenueByBusinessLine} />
          </div>
        </div>

        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '1100ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Bell className="w-4 h-4 text-danger-500" />
              系统告警
              <span className="tag tag-danger ml-2">
                {alerts.filter(a => a.status === 'unread').length} 条未读
              </span>
            </h3>
            <Button type="link" size="small">查看全部</Button>
          </div>
          <div className="card-body pt-2">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {alerts.map((alert, index) => (
                <AlertItem key={alert.id} alert={alert} delay={1200 + index * 100} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart3(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
