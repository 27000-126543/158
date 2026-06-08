/**
 * @deprecated 此页面属于旧的收入分成与结算管理系统，当前项目为采购管理系统
 * 此页面已不再使用，保留仅作历史参考
 */
import { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ChevronRight,
  DollarSign,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Button, Spin, Dropdown, MenuProps, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useReportsStore } from '../store/useReportsStore';
import { formatCurrency, formatPercent, formatDateTime, formatMonth } from '../utils/format';
import { BUSINESS_LINES } from '../utils/constants';
import type { MonthlyReport } from '@shared/types';

type ReportStatus = 'generating' | 'completed' | 'failed';

interface ReportWithStatus extends MonthlyReport {
  status: ReportStatus;
}

function getStatusConfig(status: ReportStatus) {
  const configs: Record<ReportStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    generating: {
      label: '生成中',
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    completed: {
      label: '已生成',
      color: 'text-success-600',
      bgColor: 'bg-success-50',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    failed: {
      label: '生成失败',
      color: 'text-danger-600',
      bgColor: 'bg-danger-50',
      icon: <XCircle className="w-4 h-4" />,
    },
  };
  return configs[status];
}

function StatBadge({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string; gradient: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 backdrop-blur-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gradient}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold text-neutral-800">{value}</p>
      </div>
    </div>
  );
}

function ReportCard({ report, onView, onExport }: { report: ReportWithStatus; onView: () => void; onExport: (type: 'pdf' | 'excel') => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const statusConfig = getStatusConfig(report.status);

  const totalRevenue = useMemo(() => {
    return Object.values(report.revenueByBusinessLine).reduce((sum, val) => sum + val, 0);
  }, [report.revenueByBusinessLine]);

  const topBusinessLine = useMemo(() => {
    const entries = Object.entries(report.revenueByBusinessLine);
    const maxEntry = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max, entries[0]);
    const lineInfo = BUSINESS_LINES.find(l => l.value === maxEntry[0]);
    return lineInfo?.label || maxEntry[0];
  }, [report.revenueByBusinessLine]);

  const exportMenu: MenuProps = {
    items: [
      {
        key: 'pdf',
        label: '导出 PDF（含图表）',
        icon: <FileText className="w-4 h-4" />,
        onClick: () => onExport('pdf'),
      },
      {
        key: 'excel',
        label: '导出 Excel（明细）',
        icon: <Download className="w-4 h-4" />,
        onClick: () => onExport('excel'),
      },
    ],
  };

  return (
    <div
      className={`card overflow-hidden transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-lg -translate-y-1' : 'shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-success-500/10 to-purple-500/10" />
        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">
                    {formatMonth(report.yearMonth)} 月度报告
                  </h3>
                  <p className="text-sm text-neutral-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    生成于 {formatDateTime(report.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatBadge
              icon={<DollarSign className="w-4 h-4 text-white" />}
              label="总收入"
              value={formatCurrency(totalRevenue)}
              gradient="bg-gradient-to-br from-primary-500 to-primary-600"
            />
            <StatBadge
              icon={<Target className="w-4 h-4 text-white" />}
              label="结算准确率"
              value={formatPercent(report.settlementAccuracy, 1)}
              gradient="bg-gradient-to-br from-success-500 to-success-600"
            />
            <StatBadge
              icon={<AlertTriangle className="w-4 h-4 text-white" />}
              label="无差异率"
              value={formatPercent(report.noDiffRate, 1)}
              gradient="bg-gradient-to-br from-warning-500 to-warning-600"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <TrendingUp className="w-4 h-4 text-success-500" />
              <span>核心业务：</span>
              <span className="font-medium text-neutral-700">{topBusinessLine}</span>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Dropdown menu={exportMenu} placement="bottomRight" trigger={['click']}>
                <Button
                  size="small"
                  icon={<Download className="w-4 h-4" />}
                  disabled={report.status !== 'completed'}
                >
                  导出
                </Button>
              </Dropdown>
              <Button
                type="primary"
                size="small"
                icon={<Eye className="w-4 h-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                查看详情
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const { monthlyReports, loading, fetchMonthlyReports, generateMonthlyReport, exportReport } = useReportsStore();
  const [reportsWithStatus, setReportsWithStatus] = useState<ReportWithStatus[]>([]);

  useEffect(() => {
    fetchMonthlyReports();
  }, [fetchMonthlyReports]);

  useEffect(() => {
    const statuses: ReportStatus[] = ['completed', 'completed', 'generating', 'completed', 'failed', 'completed'];
    const reports = monthlyReports.map((report, index) => ({
      ...report,
      status: statuses[index % statuses.length],
    }));
    setReportsWithStatus(reports);
  }, [monthlyReports]);

  const handleGenerateReport = async () => {
    try {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const newReport = await generateMonthlyReport(yearMonth);
      setReportsWithStatus(prev => [
        { ...newReport, status: 'generating' as ReportStatus },
        ...prev,
      ]);
      message.success('报告生成中，请稍候...');
      setTimeout(() => {
        setReportsWithStatus(prev =>
          prev.map(r => r.id === newReport.id ? { ...r, status: 'completed' as ReportStatus } : r)
        );
        message.success('报告生成成功！');
      }, 3000);
    } catch {
      message.error('报告生成失败，请重试');
    }
  };

  const handleViewDetail = (report: ReportWithStatus) => {
    navigate(`/reports/${report.yearMonth}`);
  };

  const handleExport = async (yearMonth: string, type: 'pdf' | 'excel') => {
    try {
      message.loading(`正在导出${type.toUpperCase()}...`);
      await exportReport(type, { yearMonth });
      message.success(`${type.toUpperCase()} 导出成功！`);
    } catch {
      message.error('导出失败，请重试');
    }
  };

  if (loading && reportsWithStatus.length === 0) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-neutral-500">正在加载报告列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">分析报告中心</h1>
          <p className="text-sm text-neutral-500 mt-1">查看和管理月度业务分析报告</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleGenerateReport}
          className="h-10 px-5"
        >
          生成报告
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {reportsWithStatus.map((report, index) => (
          <div
            key={report.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ReportCard
              report={report}
              onView={() => handleViewDetail(report)}
              onExport={(type) => handleExport(report.yearMonth, type)}
            />
          </div>
        ))}
      </div>

      {reportsWithStatus.length === 0 && !loading && (
        <div className="card flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-700 mb-2">暂无报告</h3>
            <p className="text-sm text-neutral-500 mb-4">点击上方按钮生成您的第一份月度报告</p>
            <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleGenerateReport}>
              生成报告
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
