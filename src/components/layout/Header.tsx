import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import type { SystemAlert } from '@shared/types';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

const mockAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'supplier_risk',
    level: 'warning',
    title: '供应商风险预警',
    content: '供应商"XX科技"的交货延迟率超过 10%，请关注',
    status: 'unread',
    createdAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    type: 'quality_issue',
    level: 'error',
    title: '采购价格异常',
    content: '采购订单"PO-2024-001"的价格超出历史均价 15%',
    status: 'unread',
    createdAt: new Date('2024-01-15T09:15:00'),
  },
  {
    id: '3',
    type: 'approval_timeout',
    level: 'info',
    title: '待处理审批',
    content: '您有 3 条采购付款审批待处理',
    status: 'unread',
    createdAt: new Date('2024-01-14T16:45:00'),
  },
];

const roleLabels: Record<string, string> = {
  finance: '财务专员',
  business_manager: '业务经理',
  finance_director: '财务总监',
  admin: '系统管理员',
};

const levelColors: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  critical: 'bg-red-600',
};

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  const unreadCount = mockAlerts.filter((a) => a.status === 'unread').length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-20' : 'left-64'
      )}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-neutral-700">
          企业采购与供应商协同管理平台
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger-500 text-white text-xs flex items-center justify-center rounded-full animate-pulse-soft">
                {unreadCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                <span className="font-semibold text-neutral-700">系统告警</span>
                <span className="text-xs text-primary-600 cursor-pointer hover:underline">
                  全部标为已读
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors',
                      alert.status === 'unread' && 'bg-primary-50/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                          levelColors[alert.level]
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-700">{alert.title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                          {alert.content}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {new Date(alert.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-neutral-200">
                <button className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium">
                  查看全部告警 →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-neutral-700">
                {user?.realName || '用户'}
              </p>
              <p className="text-xs text-neutral-500">
                {user?.role ? roleLabels[user.role] : ''}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-neutral-400 transition-transform duration-200',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-neutral-200">
                <p className="text-sm font-medium text-neutral-700">{user?.realName}</p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
                <p className="text-xs text-primary-600 mt-1">
                  {user?.role ? roleLabels[user.role] : ''}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
