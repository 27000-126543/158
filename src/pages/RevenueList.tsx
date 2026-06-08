/**
 * @deprecated 此页面属于旧的收入分成与结算管理系统，当前项目为采购管理系统
 * 此页面已不再使用，保留仅作历史参考
 */
import { useEffect, useState } from 'react';
import {
  Table,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Card,
  Row,
  Col,
  message,
  Checkbox,
  Modal,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useRevenueStore } from '../store/useRevenueStore';
import type { RevenueRecord } from '@shared/types';
import {
  BUSINESS_LINES,
  CHANNELS,
  RECONCILIATION_STATUS,
} from '../utils/constants';
import { formatCurrency, formatDateTime, getStatusLabel, getStatusColor } from '../utils/format';
import { useNavigate } from 'react-router-dom';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function RevenueList() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportAll, setExportAll] = useState(true);

  const {
    records,
    total,
    page,
    pageSize,
    loading,
    filters,
    fetchRecords,
    exportRecords,
    setFilters,
    resetFilters,
    setCurrentRecord,
  } = useRevenueStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = (values: any) => {
    const dateRange: [Dayjs, Dayjs] | undefined = values.dateRange;
    setFilters({
      ...values,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      page: 1,
    });
    fetchRecords();
  };

  const handleReset = () => {
    form.resetFields();
    resetFilters();
    fetchRecords();
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setFilters({ page, pageSize });
    fetchRecords();
  };

  const handleViewDetail = (record: RevenueRecord) => {
    setCurrentRecord(record);
    navigate(`/revenue/${record.id}`);
  };

  const handleExport = async () => {
    try {
      const params = exportAll
        ? filters
        : { ...filters, ids: selectedRowKeys as string[] };
      const blob = await exportRecords(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `收入流水_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
      setExportModalVisible(false);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<RevenueRecord> = [
    {
      title: '交易号',
      dataIndex: 'transactionNo',
      key: 'transactionNo',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <span className="font-mono text-blue-600">{text}</span>
      ),
    },
    {
      title: '业务线',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 120,
      render: (value: string) =>
        getStatusLabel(value, BUSINESS_LINES as any),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
      render: (value: string) => getStatusLabel(value, CHANNELS as any),
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      width: 140,
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number, record) =>
        formatCurrency(amount, record.currency),
    },
    {
      title: '交易时间',
      dataIndex: 'transactionTime',
      key: 'transactionTime',
      width: 180,
      render: (date: Date) => formatDateTime(date),
    },
    {
      title: '对账状态',
      dataIndex: 'reconciliationStatus',
      key: 'reconciliationStatus',
      width: 120,
      render: (status: string) => {
        const color = getStatusColor(status, RECONCILIATION_STATUS as any);
        const label = getStatusLabel(status, RECONCILIATION_STATUS as any);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
          className="m-0"
        >
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Form.Item name="businessLine" label="业务线" className="mb-0">
                <Select placeholder="请选择业务线" allowClear>
                  {BUSINESS_LINES.map((line) => (
                    <Option key={line.value} value={line.value}>
                      {line.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="channel" label="渠道" className="mb-0">
                <Select placeholder="请选择渠道" allowClear>
                  {CHANNELS.map((channel) => (
                    <Option key={channel.value} value={channel.value}>
                      {channel.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="keyword" label="客户" className="mb-0">
                <Select
                  placeholder="请搜索客户名称"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  <Option value="阿里巴巴">阿里巴巴</Option>
                  <Option value="腾讯科技">腾讯科技</Option>
                  <Option value="字节跳动">字节跳动</Option>
                  <Option value="美团">美团</Option>
                  <Option value="京东">京东</Option>
                  <Option value="百度">百度</Option>
                  <Option value="华为">华为</Option>
                  <Option value="小米">小米</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="对账状态" className="mb-0">
                <Select placeholder="请选择状态" allowClear>
                  {RECONCILIATION_STATUS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} align="middle" className="mt-4">
            <Col span={12}>
              <Form.Item name="dateRange" label="交易日期" className="mb-0">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12} className="text-right">
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  htmlType="submit"
                >
                  查询
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-600">
            共 <span className="font-bold text-blue-600">{total}</span> 条记录
          </div>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
              disabled={selectedRowKeys.length === 0 && !exportAll}
            >
              批量导出
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
          rowClassName={(record, index) =>
            index % 2 === 1 ? 'bg-gray-50 hover:bg-blue-50' : 'hover:bg-blue-50'
          }
        />
      </Card>

      <Modal
        title="导出收入流水"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
        okText="确认导出"
        cancelText="取消"
      >
        <div className="space-y-4">
          <Checkbox
            checked={exportAll}
            onChange={(e) => setExportAll(e.target.checked)}
          >
            导出全部筛选结果
          </Checkbox>
          {!exportAll && (
            <div className="pl-6 text-gray-500">
              已选择 <span className="text-blue-600 font-bold">{selectedRowKeys.length}</span> 条记录
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <FileExcelOutlined className="text-green-500" />
            <span>将导出为 Excel 文件格式</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
