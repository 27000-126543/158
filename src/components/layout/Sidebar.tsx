import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Sparkles,
  MessageSquare,
  BarChart3,
  ShoppingCart,
  Truck,
  CreditCard,
  TrendingUp,
  Shield,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package,
  ChevronDown,
} from 'lucide-react';
import type { UserRole } from '@shared/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole?: UserRole;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
  },
  {
    path: '/purchase-requirements',
    label: '采购需求',
    icon: FileText,
  },
  {
    path: '/supplier-library',
    label: '供应商库',
    icon: Building2,
  },
  {
    path: '/smart-recommend',
    label: '智能推荐',
    icon: Sparkles,
  },
  {
    path: '/inquiry-quotation',
    label: '询价报价',
    icon: MessageSquare,
  },
  {
    path: '/price-comparison',
    label: '比价报告',
    icon: BarChart3,
  },
  {
    path: '/purchase-orders',
    label: '采购订单',
    icon: ShoppingCart,
  },
  {
    path: '/logistics-receipt',
    label: '物流收货',
    icon: Truck,
  },
  {
    path: '/payment-approval',
    label: '付款审批',
    icon: CreditCard,
  },
  {
    path: '/supplier-performance',
    label: '供应商绩效',
    icon: TrendingUp,
  },
  {
    path: '/admin-dashboard',
    label: '管理员看板',
    icon: Shield,
    roles: ['admin'],
  },
  {
    path: '/monthly-reports',
    label: '月度报表',
    icon: Calendar,
  },
  {
    path: '/system',
    label: '系统管理',
    icon: Settings,
    roles: ['admin', 'finance_director'],
    children: [
      {
        path: '/system/logs',
        label: '操作日志',
        icon: FileText,
      },
      {
        path: '/system/tasks',
        label: '定时任务',
        icon: Calendar,
      },
      {
        path: '/system/users',
        label: '用户管理',
        icon: Shield,
      },
      {
        path: '/system/alerts',
        label: '系统告警',
        icon: BarChart3,
      },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const location = useLocation();
  const [isHovering, setIsHovering] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/system']);

  const showExpanded = !collapsed || isHovering;

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter((item) => {
        if (!item.roles) return true;
        return userRole ? item.roles.includes(userRole) : false;
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterMenuItems(item.children) : undefined,
      }));
  };

  const filteredMenuItems = filterMenuItems(menuItems);

  const renderMenuItem = (item: MenuItem, index: number, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.path);
    const isActive = location.pathname.startsWith(item.path) && !hasChildren;
    const isParentActive = hasChildren && item.children?.some((child) => location.pathname.startsWith(child.path));

    return (
      <li key={item.path} style={{ animationDelay: `${index * 50}ms` }}>
        {hasChildren ? (
          <div>
            <button
              onClick={() => toggleMenu(item.path)}
              className={cn(
                'sidebar-link group relative w-full text-left',
                isParentActive && 'active',
                'animate-fade-in'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors duration-200',
                    isParentActive
                      ? 'text-primary-600'
                      : 'text-neutral-500 group-hover:text-primary-600'
                  )}
                />
                {isParentActive && (
                  <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'flex-1 transition-all duration-300 whitespace-nowrap',
                  showExpanded
                    ? 'opacity-100 ml-0'
                    : 'opacity-0 ml-0 absolute left-full ml-3 bg-neutral-800 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-50 group-hover:opacity-100'
                )}
              >
                {item.label}
              </span>
              {showExpanded && (
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isExpanded ? 'rotate-180' : '',
                    isParentActive ? 'text-primary-600' : 'text-neutral-400'
                  )}
                />
              )}
            </button>
            {showExpanded && isExpanded && (
              <ul className="ml-4 mt-1 space-y-1 border-l border-neutral-200 pl-2">
                {item.children?.map((child, childIndex) =>
                  renderMenuItem(child, childIndex, level + 1)
                )}
              </ul>
            )}
          </div>
        ) : (
          <NavLink
            to={item.path}
            className={cn(
              'sidebar-link group relative',
              isActive && 'active',
              'animate-fade-in',
              level > 0 && 'ml-2'
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors duration-200',
                  isActive
                    ? 'text-primary-600'
                    : 'text-neutral-500 group-hover:text-primary-600'
                )}
              />
              {isActive && (
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-full" />
              )}
            </div>
            <span
              className={cn(
                'transition-all duration-300 whitespace-nowrap',
                showExpanded
                  ? 'opacity-100 ml-0'
                  : 'opacity-0 ml-0 absolute left-full ml-3 bg-neutral-800 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-50 group-hover:opacity-100'
              )}
            >
              {item.label}
            </span>
          </NavLink>
        )}
      </li>
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-neutral-200 flex flex-col z-40 transition-all duration-300 ease-in-out',
        collapsed && !isHovering ? 'w-20' : 'w-64'
      )}
      onMouseEnter={() => collapsed && setIsHovering(true)}
      onMouseLeave={() => collapsed && setIsHovering(false)}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div
            className={cn(
              'flex flex-col transition-all duration-300 whitespace-nowrap',
              showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            )}
          >
            <span className="text-sm font-bold text-neutral-700">采购管理</span>
            <span className="text-xs text-neutral-400">协同平台</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {filteredMenuItems.map((item, index) => renderMenuItem(item, index))}
        </ul>
      </nav>

      <div className="p-3 border-t border-neutral-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 group"
        >
          {showExpanded ? (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">收起菜单</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>
    </aside>
  );
}
