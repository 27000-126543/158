/**
 * @deprecated 此页面属于旧的收入分成与结算管理系统，当前项目为采购管理系统
 * 此页面已不再使用，保留仅作历史参考
 */
import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Form,
  Row,
  Col,
  Card,
  Modal,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ExportOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSettlementsStore } from '@/store/useSettlementsStore';
import { useNavigate } from 'react-router-dom';
import type { Settlement } from '@shared/types';
import {
  BUSINESS_LINES,
  SETTLEMENT_STATUS,
  DATE_FORMAT,
} from '@/utils/constants';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/utils/format';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

export default function SettlementList() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [generateMonth, setGenerateMonth] = useState<string>(dayjs().format('YYYY-MM'));

  const {
    settlements,
    total,
    page,
    pageSize,
    loading,
    filters,
    fetchSettlements,
    generateSettlements,
    exportSettlement,
    setFilters,
    resetFilters,
  } = useSettlementsStore();

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const handleSearch = (values: any) => {
    const params: any = {};
    if (values.businessLine) params.businessLine = values.businessLine;
    if (values.status) params.status = values.status;
    if (values.overBudget !== undefined) params.overBudget = values.overBudget;
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format(DATE_FORMAT);
      params.endDate = values.dateRange[1].format(DATE_FORMAT);
    }
    setFilters(params);
    fetchSettlements(params);
  };

  const handleReset = () => {
    form.resetFields();
    resetFilters();
    fetchSettlements();
  };

  const handleTableChange = (pagination: any) => {
    fetchSettlements({
      ...filters,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const handleGenerateSettlement = async () => {
    try {
      await generateSettlements(generateMonth);
      message.success('结算单生成成功');
      setGenerateModalVisible(false);
      fetchSettlements();
    } catch (error) {
      message.error('生成失败');
    }
  };

  const handleViewDetail = (id: string) => {
    navigate(`/settlements/${id}`);
  };

  const handleExport = async (id: string) => {
    try {
      const blob = await exportSettlement(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<Settlement> = [
    {
      title: '结算单号',
      dataIndex: 'settlementNo',
      key: 'settlementNo',
      width: 180,
      render: (text) => (
        <Space>
          <FileTextOutlined className="text-blue-500" />
          <span className="font-mono">{text}</span>
        </Space>
      ),
    },
    {
      title: '业务线',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 140,
      render: (value) => getStatusLabel(value, BUSINESS_LINES as any),
    },
    {
      title: '结算日期',
      dataIndex: 'settlementDate',
      key: 'settlementDate',
      width: 140,
      render: (date) => formatDate(date),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      align: 'right',
      render: (amount) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: '预算阈值',
      dataIndex: 'budgetThreshold',
      key: 'budgetThreshold',
      width: 140,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: '是否超预算',
      dataIndex: 'overBudget',
      key: 'overBudget',
      width: 120,
      align: 'center',
      render: (overBudget) =>
        overBudget ? (
          <Tag color="red" className="font-medium">
            是
          </Tag>
        ) : (
          <Tag color="green" className="font-medium">
            否
          </Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status, SETTLEMENT_STATUS)} className="font-medium">
          {getStatusLabel(status, SETTLEMENT_STATUS)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ExportOutlined />}
            onClick={() => handleExport(record.id)}
          >
            导出
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">
            结算单列表
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchSettlements()}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGenerateModalVisible(true)}
            >
              生成结算单
            </Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
          className="mb-4"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="businessLine" label="业务线">
                <Select placeholder="请选择业务线" allowClear>
                  {BUSINESS_LINES.map((line) => (
                    <Option key={line.value} value={line.value}>
                      {line.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="dateRange" label="日期范围">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear>
                  {SETTLEMENT_STATUS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="overBudget" label="是否超预算">
                <Select placeholder="请选择" allowClear>
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} className="text-right">
              <Space>
                <Button onClick={handleReset} icon={<ClearOutlined />}>
                  重置
                </Button>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  查询
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        <Table
          columns={columns}
          dataSource={settlements}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          rowClassName={(record) =>
            record.overBudget ? 'bg-red-50 hover:!bg-red-100' : ''
          }
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="生成结算单"
        open={generateModalVisible}
        onOk={handleGenerateSettlement}
        onCancel={() => setGenerateModalVisible(false)}
        okText="生成"
        cancelText="取消"
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            选择要生成结算单的月份，系统将自动汇总该月份的所有收入并生成分拆结算单。
          </p>
          <DatePicker
            picker="month"
            style={{ width: '100%' }}
            value={dayjs(generateMonth)}
            onChange={(date) => date && setGenerateMonth(date.format('YYYY-MM'))}
          />
        </div>
      </Modal>
    </div>
  );
}
