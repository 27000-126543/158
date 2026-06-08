import { Card } from 'antd';

export default function AdminDashboard() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">管理员看板</h1>
          <p className="text-sm text-neutral-500 mt-1">系统管理全局数据概览</p>
        </div>
      </div>
      <Card>
        <p className="text-neutral-500 text-center py-20">管理员看板功能开发中...</p>
      </Card>
    </div>
  );
}
