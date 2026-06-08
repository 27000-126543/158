import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import Login from "@/pages/Login";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import PurchaseRequirements from "@/pages/PurchaseRequirements";
import SupplierLibrary from "@/pages/SupplierLibrary";
import SmartRecommend from "@/pages/SmartRecommend";
import InquiryQuotation from "@/pages/InquiryQuotation";
import PriceComparison from "@/pages/PriceComparison";
import PurchaseOrders from "@/pages/PurchaseOrders";
import LogisticsReceipt from "@/pages/LogisticsReceipt";
import PaymentApproval from "@/pages/PaymentApproval";
import SupplierPerformance from "@/pages/SupplierPerformance";
import AdminDashboard from "@/pages/AdminDashboard";
import MonthlyReports from "@/pages/MonthlyReports";
import SystemLogs from "@/pages/SystemLogs";
import SystemTasks from "@/pages/SystemTasks";
import SystemUsers from "@/pages/SystemUsers";
import SystemAlerts from "@/pages/SystemAlerts";

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#165DFF",
          colorSuccess: "#00B42A",
          colorWarning: "#FF7D00",
          colorError: "#F53F3F",
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/purchase-requirements" element={<PurchaseRequirements />} />
              <Route path="/supplier-library" element={<SupplierLibrary />} />
              <Route path="/smart-recommend" element={<SmartRecommend />} />
              <Route path="/inquiry-quotation" element={<InquiryQuotation />} />
              <Route path="/price-comparison" element={<PriceComparison />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/logistics-receipt" element={<LogisticsReceipt />} />
              <Route path="/payment-approval" element={<PaymentApproval />} />
              <Route path="/supplier-performance" element={<SupplierPerformance />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/monthly-reports" element={<MonthlyReports />} />
              <Route path="/system/logs" element={<SystemLogs />} />
              <Route path="/system/tasks" element={<SystemTasks />} />
              <Route path="/system/users" element={<SystemUsers />} />
              <Route path="/system/alerts" element={<SystemAlerts />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}
