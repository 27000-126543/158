import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bell,
  Plus,
  FileText,
  Search,
  Settings,
  Info,
  XCircle,
  Flame,
  Users,
  BarChart3,
  Truck,
} from 'lucide-react';
import { Progress, Button, Spin } from 'antd';
import { useDashboardStore } from '../store/useDashboardStore';
import { formatCurrency, formatPercent, formatRelativeTime, formatTurnoverRate } from '../utils/format';
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
      } else if (value.includes('次')) {
        setDisplayValue(currentValue.toFixed(1) + '次');
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
    purchaseTrend,
    purchaseByCategory,
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
        title: '本月采购额',
        value: formatCurrency(stats.monthPurchaseAmount),
        icon: <DollarSign className="w-6 h-6" />,
        iconBg: 'rgba(22, 93, 255, 0.1)',
        iconColor: '#165DFF',
        trend: 12.5,
        trendLabel: '较上月',
        delay: 100,
      },
      {
        title: '累计采购额',
        value: formatCurrency(stats.totalPurchaseAmount),
        icon: <Calendar className="w-6 h-6" />,
        iconBg: 'rgba(0, 180, 42, 0.1)',
        iconColor: '#00B42A',
        trend: 8.3,
        trendLabel: '较去年同期',
        delay: 200,
      },
      {
        title: '订单总数',
        value: stats.totalOrders.toString(),
        suffix: '笔',
        icon: <FileText className="w-6 h-6" />,
        iconBg: 'rgba(114, 46, 209, 0.1)',
        iconColor: '#722ED1',
        trend: 5.2,
        trendLabel: '较上月',
        delay: 300,
      },
      {
        title: '活跃供应商',
        value: stats.activeSuppliers.toString(),
        suffix: '家',
        icon: <Users className="w-6 h-6" />,
        iconBg: 'rgba(0, 191, 188, 0.1)',
        iconColor: '#00BFBC',
        trend: 3.8,
        trendLabel: '较上月',
        delay: 400,
      },
      {
        title: '库存周转率',
        value: formatTurnoverRate(stats.inventoryTurnover),
        icon: <Package className="w-6 h-6" />,
        iconBg: 'rgba(255, 125, 0, 0.1)',
        iconColor: '#FF7D00',
        trend: -1.5,
        trendLabel: '较上月',
        delay: 500,
      },
      {
        title: '准时交货率',
        value: formatPercent(stats.onTimeDeliveryRate, 1),
        icon: <Truck className="w-6 h-6" />,
        iconBg: 'rgba(0, 180, 42, 0.1)',
        iconColor: '#00B42A',
        trend: 2.1,
        trendLabel: '较上月',
        delay: 600,
      },
      {
        title: '待处理审批',
        value: stats.pendingApprovals.toString(),
        suffix: '条',
        icon: <Clock className="w-6 h-6" />,
        iconBg: 'rgba(245, 63, 63, 0.1)',
        iconColor: '#F53F3F',
        delay: 700,
      },
      {
        title: '本月订单数',
        value: stats.monthOrders.toString(),
        suffix: '笔',
        icon: <CheckCircle className="w-6 h-6" />,
        iconBg: 'rgba(114, 46, 209, 0.1)',
        iconColor: '#722ED1',
        trend: 15.8,
        trendLabel: '较上月',
        delay: 800,
      },
    ];
  }, [stats]);

  const quickActions = [
    { label: '新增需求', icon: <Plus className="w-4 h-4" />, type: 'primary' },
    { label: '发起询价', icon: <Search className="w-4 h-4" />, type: 'default' },
    { label: '新建订单', icon: <FileText className="w-4 h-4" />, type: 'default' },
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
          <h1 className="page-title">采购数据概览</h1>
          <p className="text-sm text-neutral-500 mt-1">实时监控采购业务运营关键指标</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {stats && (
        <div className="card animate-slide-up" style={{ animationDelay: '900ms' }}>
          <div className="card-body">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">订单完成率</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(0.925, 1)}
                  </span>
                </div>
                <Progress
                  percent={92.5}
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
                  <span className="text-sm text-neutral-500">供应商合格率</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(0.968, 1)}
                  </span>
                </div>
                <Progress
                  percent={96.8}
                  showInfo={false}
                  strokeColor="#00B42A"
                  strokeWidth={12}
                  size="small"
                />
              </div>
              <div className="h-12 w-px bg-neutral-200" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">付款及时率</span>
                  <span className="text-lg font-semibold text-neutral-800">
                    {formatPercent(0.894, 1)}
                  </span>
                </div>
                <Progress
                  percent={89.4}
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
        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '1000ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              采购趋势
            </h3>
            <div className="flex gap-2">
              <Button size="small" type="primary">近30天</Button>
              <Button size="small">近90天</Button>
              <Button size="small">本年度</Button>
            </div>
          </div>
          <div className="card-body pt-2">
            <RevenueTrendChart data={purchaseTrend} />
          </div>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '1100ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Package className="w-4 h-4 text-success-500" />
              采购分类占比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLinePieChart data={purchaseByCategory.map(item => ({
              businessLine: item.category,
              amount: item.amount,
              percentage: item.percentage,
            }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card animate-slide-up" style={{ animationDelay: '1200ms' }}>
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-warning-500" />
              采购分类对比
            </h3>
          </div>
          <div className="card-body pt-2">
            <BusinessLineBarChart data={purchaseByCategory.map(item => ({
              businessLine: item.category,
              amount: item.amount,
              percentage: item.percentage,
            }))} />
          </div>
        </div>

        <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '1300ms' }}>
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
                <AlertItem key={alert.id} alert={alert} delay={1400 + index * 100} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
