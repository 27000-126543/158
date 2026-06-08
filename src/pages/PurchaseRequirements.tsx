import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Form,
  Modal,
  Tag,
  Space,
  Popconfirm,
  message,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  Plus,
  Download,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Send,
  Filter,
} from 'lucide-react';
import type { TablePaginationConfig, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { usePurchasesStore } from '../store/usePurchasesStore';
import type { PurchaseRequirement } from '@shared/types';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  formatUnit,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';
import {
  CATEGORIES,
  PURCHASE_STATUS,
  UNITS,
  DATE_FORMAT,
} from '../utils/constants';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search: SearchInput } = Input;

interface FilterFormValues {
  keyword?: string;
  category?: string;
  status?: string;
  requesterId?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}

interface RequirementFormValues {
  title: string;
  category: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  budget: number;
  expectedDate: dayjs.Dayjs;
  description?: string;
}

export default function PurchaseRequirements() {
  const navigate = useNavigate();
  const {
    requirements,
    total,
    page,
    pageSize,
    loading,
    filters,
    fetchRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    submitForApproval,
    exportRequirements,
    setFilters,
    resetFilters,
  } = usePurchasesStore();

  const [filterForm] = Form.useForm<FilterFormValues>();
  const [modalForm] = Form.useForm<RequirementFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseRequirement | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);

  useEffect(() => {
    loadData();
  }, [page, pageSize, filters, sortField, sortOrder]);

  const loadData = () => {
    const params = {
      ...filters,
      sortBy: sortField || undefined,
      sortOrder: sortOrder || undefined,
    };
    fetchRequirements(params);
  };

  const handleSearch = (values: FilterFormValues) => {
    const newFilters = {
      keyword: values.keyword,
      category: values.category,
      status: values.status,
      requesterId: values.requesterId,
      startDate: values.dateRange?.[0]?.format(DATE_FORMAT),
      endDate: values.dateRange?.[1]?.format(DATE_FORMAT),
    };
    setFilters(newFilters);
  };

  const handleReset = () => {
    filterForm.resetFields();
    resetFilters();
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, any>,
    sorter: SorterResult<PurchaseRequirement> | SorterResult<PurchaseRequirement>[]
  ) => {
    const sorterResult = Array.isArray(sorter) ? sorter[0] : sorter;
    if (sorterResult.field && sorterResult.order) {
      setSortField(sorterResult.field as string);
      setSortOrder(sorterResult.order);
    } else {
      setSortField(null);
      setSortOrder(null);
    }

    setFilters({
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const openCreateModal = () => {
    setEditingItem(null);
    modalForm.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (item: PurchaseRequirement) => {
    setEditingItem(item);
    modalForm.setFieldsValue({
      title: item.title,
      category: item.category,
      itemName: item.itemName,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      budget: item.budget,
      expectedDate: dayjs(item.expectedDate),
      description: item.description,
    });
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await modalForm.validateFields();
      const data = {
        ...values,
        expectedDate: values.expectedDate.toDate(),
        requesterId: 'user_001',
      };

      if (editingItem) {
        await updateRequirement(editingItem.id, data);
        message.success('更新成功');
      } else {
        await createRequirement(data);
        message.success('创建成功');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequirement(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const handleSubmitApproval = async (id: string) => {
    try {
      await submitForApproval(id);
      message.success('提交审批成功');
      loadData();
    } catch (error) {
      console.error('提交审批失败:', error);
      message.error('提交审批失败');
    }
  };

  const handleExport = async () => {
    try {
      await exportRequirements();
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  const handleViewDetail = (id: string) => {
    navigate(`/purchase-requirements/${id}`);
  };

  const columns: TableProps<PurchaseRequirement>['columns'] = [
    {
      title: '需求编号',
      dataIndex: 'requirementNo',
      key: 'requirementNo',
      width: 160,
      sorter: true,
      render: (text) => <span className="font-mono text-primary-600">{text}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      minWidth: 200,
      ellipsis: true,
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: '品类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (value) => {
        const category = CATEGORIES.find(c => c.value === value);
        return category?.label || value;
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      sorter: true,
      render: (_, record) => formatQuantity(record.quantity, record.unit),
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      sorter: true,
      render: (value) => <span className="font-semibold text-success-600">{formatCurrency(value)}</span>,
    },
    {
      title: '期望到货日期',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 140,
      sorter: true,
      render: (value) => formatDate(value),
    },
    {
      title: '申请人',
      dataIndex: 'requesterId',
      key: 'requesterId',
      width: 120,
      render: () => '张采购',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value) => {
        const statusConfig = PURCHASE_STATUS.find(s => s.value === value);
        return (
          <Tag color={getStatusColor(value, PURCHASE_STATUS)}>
            {getStatusLabel(value, PURCHASE_STATUS)}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          {record.status === 'draft' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => openEditModal(record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => handleSubmitApproval(record.id)}
              >
                提交审批
              </Button>
              <Popconfirm
                title="确定删除该需求？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">采购需求</h1>
          <p className="text-sm text-neutral-500 mt-1">管理和跟踪采购需求申请</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            新增需求
          </Button>
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            批量导出
          </Button>
        </div>
      </div>

      <div className="card mb-4">
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={handleSearch}
          className="filter-form"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="需求编号" name="keyword">
                <SearchInput
                  placeholder="请输入需求编号/标题/物品名称"
                  allowClear
                  prefix={<Search className="w-4 h-4 text-neutral-400" />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="品类" name="category">
                <Select placeholder="请选择品类" allowClear>
                  {CATEGORIES.map(cat => (
                    <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="状态" name="status">
                <Select placeholder="请选择状态" allowClear>
                  {PURCHASE_STATUS.map(status => (
                    <Option key={status.value} value={status.value}>{status.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label="申请人" name="requesterId">
                <Select placeholder="请选择申请人" allowClear>
                  <Option value="user_001">张采购</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={12}>
              <Form.Item label="日期范围" name="dateRange">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <div className="flex justify-end gap-2">
            <Button
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleReset}
            >
              重置
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Filter className="w-4 h-4" />}
            >
              查询
            </Button>
          </div>
        </Form>
      </div>

      <div className="card">
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={requirements}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </div>

      <Modal
        title={editingItem ? '编辑采购需求' : '新增采购需求'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        width={720}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={modalForm}
          layout="vertical"
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="标题"
                name="title"
                rules={[{ required: true, message: '请输入需求标题' }]}
              >
                <Input placeholder="请输入需求标题" maxLength={100} showCount />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="品类"
                name="category"
                rules={[{ required: true, message: '请选择品类' }]}
              >
                <Select placeholder="请选择品类">
                  {CATEGORIES.map(cat => (
                    <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="物品名称"
                name="itemName"
                rules={[{ required: true, message: '请输入物品名称' }]}
              >
                <Input placeholder="请输入物品名称" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="规格"
                name="specification"
                rules={[{ required: true, message: '请输入规格' }]}
              >
                <Input placeholder="请输入规格描述" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="数量"
                name="quantity"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber min={1} placeholder="请输入数量" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="单位"
                name="unit"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="请选择单位">
                  {UNITS.map(unit => (
                    <Option key={unit.value} value={unit.value}>{unit.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="预算 (元)"
                name="budget"
                rules={[{ required: true, message: '请输入预算' }]}
              >
                <InputNumber
                  min={0 as number}
                  placeholder="请输入预算金额"
                  style={{ width: '100%' }}
                  prefix="¥"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="期望到货日期"
                name="expectedDate"
                rules={[{ required: true, message: '请选择期望到货日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="description">
                <Input.TextArea
                  rows={3}
                  placeholder="请输入备注信息"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
