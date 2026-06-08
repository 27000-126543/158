/**
 * @deprecated 此页面属于旧的收入分成与结算管理系统，当前项目为采购管理系统
 * 此页面已不再使用，保留仅作历史参考
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Timeline,
  Row,
  Col,
  Statistic,
  Divider,
  Typography,
  Spin,
  message,
  Breadcrumb,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  BankOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useSettlementsStore } from '@/store/useSettlementsStore';
import type {
  Settlement,
  PaymentInstruction,
  RevenueRecord,
  SplitDetail,
  ApprovalNode,
} from '@shared/types';
import {
  BUSINESS_LINES,
  SETTLEMENT_STATUS,
  APPROVAL_STATUS,
  CHANNELS,
} from '@/utils/constants';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  formatBankCard,
} from '@/utils/format';
import type { ColumnsType } from 'antd/es/table';
import {
  mockRevenueRecords,
  generatePaymentInstructions,
  generateSplitDetails,
  generateApprovalNodes,
} from '@/utils/mock';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text } = Typography;

export default function SettlementDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    currentSettlement,
    paymentInstructions,
    loading,
    fetchDetail,
    fetchPaymentInstructions,
    approveSettlement,
    rejectSettlement,
    paySettlement,
  } = useSettlementsStore();

  const [revenueList, setRevenueList] = useState<RevenueRecord[]>([]);
  const [splitDetails, setSplitDetails] = useState<SplitDetail[]>([]);
  const [approvalNodes, setApprovalNodes] = useState<ApprovalNode[]>([]);
  const [paymentInstructionsList, setPaymentInstructionsList] = useState<PaymentInstruction[]>([]);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (settlementId: string) => {
    try {
      await fetchDetail(settlementId);

      const revenues = mockRevenueRecords.slice(0, 10).map((r) => ({
        ...r,
        settlementId,
      }));
      setRevenueList(revenues);

      const totalAmount = revenues.reduce((sum, r) => sum + r.amount, 0);
      const instructions = generatePaymentInstructions(settlementId, totalAmount);
      setPaymentInstructionsList(instructions);

      const revenueIds = revenues.map(r => r.id);
      const splits = generateSplitDetails(settlementId, revenueIds, totalAmount);
      setSplitDetails(splits);

      const nodes = generateApprovalNodes(uuidv4());
      setApprovalNodes(nodes);
    } catch (error) {
      message.error('加载数据失败');
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveSettlement(id);
      message.success('审批通过');
      loadData(id);
    } catch (error) {
      message.error('审批失败');
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      await rejectSettlement(id, '数据不符，请核实');
      message.success('已驳回');
      loadData(id);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handlePay = async () => {
    if (!id) return;
    try {
      await paySettlement(id);
      message.success('已标记为已支付');
      loadData(id);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'rejected':
        return <CloseCircleOutlined className="text-red-500" />;
      default:
        return <ClockCircleOutlined className="text-orange-500" />;
    }
  };

  const getApprovalColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  const revenueColumns: ColumnsType<RevenueRecord> = [
    {
      title: '交易流水号',
      dataIndex: 'transactionNo',
      key: 'transactionNo',
      width: 200,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '业务线',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 120,
      render: (value) => getStatusLabel(value, BUSINESS_LINES as any),
    },
    {
      title: '支付渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
      render: (value) => getStatusLabel(value, CHANNELS as any),
    },
    {
      title: '客户名称',
      dataIndex: 'customer',
      key: 'customer',
      width: 150,
    },
    {
      title: '交易金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (amount) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: '交易时间',
      dataIndex: 'transactionTime',
      key: 'transactionTime',
      width: 180,
      render: (date) => formatDateTime(date),
    },
    {
      title: '对账状态',
      dataIndex: 'reconciliationStatus',
      key: 'reconciliationStatus',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status, SETTLEMENT_STATUS)}>
          {getStatusLabel(status, SETTLEMENT_STATUS)}
        </Tag>
      ),
    },
  ];

  const splitColumns: ColumnsType<SplitDetail> = [
    {
      title: '分拆方',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 150,
      render: (value) => {
        const labels: { [key: string]: string } = {
          company: '公司',
          platform: '平台',
          service: '服务商',
          teacher: '讲师',
          rnd: '研发',
        };
        return labels[value] || value;
      },
    },
    {
      title: '分拆比例',
      dataIndex: 'ratio',
      key: 'ratio',
      width: 120,
      align: 'center',
      render: (ratio) => `${(ratio * 100).toFixed(1)}%`,
    },
    {
      title: '分拆金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
  ];

  const paymentColumns: ColumnsType<PaymentInstruction> = [
    {
      title: '支付指令号',
      dataIndex: 'instructionNo',
      key: 'instructionNo',
      width: 200,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '收款方',
      dataIndex: 'payeeName',
      key: 'payeeName',
      width: 180,
    },
    {
      title: '收款银行',
      dataIndex: 'payeeBank',
      key: 'payeeBank',
      width: 150,
    },
    {
      title: '收款账号',
      dataIndex: 'payeeAccount',
      key: 'payeeAccount',
      width: 180,
      render: (text) => formatBankCard(text),
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (amount) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => {
        const colors: { [key: string]: string } = {
          pending: 'orange',
          sent: 'blue',
          paid: 'green',
          failed: 'red',
        };
        const labels: { [key: string]: string } = {
          pending: '待发送',
          sent: '已发送',
          paid: '已支付',
          failed: '支付失败',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 180,
      render: (date) => (date ? formatDateTime(date) : '-'),
    },
  ];

  if (loading && !currentSettlement) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  if (!currentSettlement) {
    return (
      <div className="p-6">
        <Empty description="结算单不存在" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item onClick={() => navigate('/settlements')}>
          结算单列表
        </Breadcrumb.Item>
        <Breadcrumb.Item>结算单详情</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/settlements')}
              />
              <Title level={4} className="!mb-0">
                <FileTextOutlined className="text-blue-500 mr-2" />
                结算单详情
              </Title>
              <Tag
                color={getStatusColor(currentSettlement.status, SETTLEMENT_STATUS)}
                className="text-base px-4 py-1"
              >
                {getStatusLabel(currentSettlement.status, SETTLEMENT_STATUS)}
              </Tag>
              {currentSettlement.overBudget && (
                <Tag color="red" className="text-base px-4 py-1">
                  超预算
                </Tag>
              )}
            </div>
            <Text type="secondary" className="font-mono">
              {currentSettlement.settlementNo}
            </Text>
          </div>
          <Space>
            {currentSettlement.status === 'pending_approval' && (
              <>
                <Button onClick={handleReject} danger>
                  驳回
                </Button>
                <Button type="primary" onClick={handleApprove}>
                  通过
                </Button>
              </>
            )}
            {currentSettlement.status === 'approved' && (
              <Button type="primary" onClick={handlePay}>
                标记支付
              </Button>
            )}
          </Space>
        </div>

        <Row gutter={16} className="mb-4">
          <Col xs={24} sm={8}>
            <Card size="small" className="bg-blue-50">
              <Statistic
                title="结算总金额"
                value={currentSettlement.totalAmount}
                precision={2}
                prefix={<DollarOutlined />}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" className="bg-green-50">
              <Statistic
                title="预算阈值"
                value={currentSettlement.budgetThreshold}
                precision={2}
                prefix={<BankOutlined />}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              className={currentSettlement.overBudget ? 'bg-red-50' : 'bg-gray-50'}
            >
              <Statistic
                title="超预算金额"
                value={
                  currentSettlement.overBudget
                    ? currentSettlement.totalAmount - currentSettlement.budgetThreshold
                    : 0
                }
                precision={2}
                prefix={<UserOutlined />}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{
                  color: currentSettlement.overBudget ? '#ff4d4f' : '#8c8c8c',
                }}
              />
            </Card>
          </Col>
        </Row>

        <Descriptions bordered size="small" column={2} className="mb-6">
          <Descriptions.Item label="业务线">
            {getStatusLabel(currentSettlement.businessLine, BUSINESS_LINES as any)}
          </Descriptions.Item>
          <Descriptions.Item label="结算日期">
            {formatDate(currentSettlement.settlementDate)}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDateTime(currentSettlement.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="是否超预算">
            {currentSettlement.overBudget ? (
              <Tag color="red">是</Tag>
            ) : (
              <Tag color="green">否</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <span>
            <FileTextOutlined className="text-blue-500 mr-2" />
            收入明细
          </span>
        }
        className="mb-4 shadow-sm"
      >
        <Table
          columns={revenueColumns}
          dataSource={revenueList}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <DollarOutlined className="text-green-500 mr-2" />
                拆分明细
              </span>
            }
            className="mb-4 shadow-sm"
          >
            <Table
              columns={splitColumns}
              dataSource={splitDetails}
              rowKey="id"
              size="small"
              pagination={false}
              summary={(pageData) => {
                let total = 0;
                pageData.forEach((item) => {
                  total += item.amount;
                });
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span className="font-semibold">合计</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="font-bold">{formatCurrency(total)}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <ClockCircleOutlined className="text-purple-500 mr-2" />
                审批流程
              </span>
            }
            className="mb-4 shadow-sm"
          >
            <Timeline
              items={approvalNodes.map((node) => ({
                color: getApprovalColor(node.status),
                dot: getApprovalIcon(node.status),
                children: (
                  <div className="pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {node.approverRole === 'business_manager' && '业务经理'}
                        {node.approverRole === 'finance' && '财务人员'}
                        {node.approverRole === 'finance_director' && '财务总监'}
                      </span>
                      <Tag color={getStatusColor(node.status, APPROVAL_STATUS)}>
                        {getStatusLabel(node.status, APPROVAL_STATUS)}
                      </Tag>
                    </div>
                    {node.comment && (
                      <p className="text-gray-600 text-sm mb-1">意见：{node.comment}</p>
                    )}
                    {node.approvedAt && (
                      <p className="text-gray-400 text-xs">
                        {formatDateTime(node.approvedAt)}
                      </p>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <BankOutlined className="text-orange-500 mr-2" />
            付款指令信息
          </span>
        }
        className="shadow-sm"
      >
        {paymentInstructionsList.length > 0 ? (
          <Table
            columns={paymentColumns}
            dataSource={paymentInstructionsList}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 1100 }}
          />
        ) : (
          <Empty description="暂无付款指令" />
        )}
      </Card>
    </div>
  );
}
