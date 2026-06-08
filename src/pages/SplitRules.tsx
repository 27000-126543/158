import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Alert,
  Timeline,
  Typography,
  Divider,
  Progress,
  Statistic,
} from 'antd';
import {
  EditOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import type { SplitRule, SplitRuleHistory } from '@shared/types';
import { useSplitRulesStore } from '../store/useSplitRulesStore';
import {
  BUSINESS_LINES,
  RULE_STATUS,
} from '../utils/constants';
import {
  formatPercent,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';
import { mockUsers } from '../utils/mock';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PARTNER_LABELS: { [key: string]: string } = {
  company: '公司',
  platform: '平台方',
  service: '服务商',
  teacher: '教师',
  rnd: '研发团队',
};

const PARTNER_COLORS: { [key: string]: string } = {
  company: '#1890ff',
  platform: '#52c41a',
  service: '#fa8c16',
  teacher: '#722ed1',
  rnd: '#eb2f96',
};

export default function SplitRules() {
  const {
    rules,
    ruleHistory,
    loading,
    fetchRules,
    fetchHistory,
    updateRule,
    submitForApproval,
  } = useSplitRulesStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<SplitRule | null>(null);
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [formRatios, setFormRatios] = useState<{ [key: string]: number }>({});
  const [needsDirectorApproval, setNeedsDirectorApproval] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [pendingApprovalRule, setPendingApprovalRule] = useState<SplitRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleEditRule = (rule: SplitRule) => {
    setEditingRule(rule);
    const initialRatios = { ...rule.ratios };
    setFormRatios(initialRatios);
    form.setFieldsValue({
      ratios: initialRatios,
      changeReason: '',
      effectiveDate: null,
    });
    setNeedsDirectorApproval(false);
    setEditModalVisible(true);
  };

  const handleViewHistory = async (ruleId: string) => {
    setViewingRuleId(ruleId);
    await fetchHistory(ruleId);
    setHistoryModalVisible(true);
  };

  const handleRatioChange = (key: string, value: number | null) => {
    const newRatios = { ...formRatios, [key]: value ?? 0 };
    setFormRatios(newRatios);

    if (editingRule) {
      const oldRatio = editingRule.ratios[key] || 0;
      const newRatio = value ?? 0;
      const changePercent = Math.abs((newRatio - oldRatio) / oldRatio) * 100;
      if (changePercent > 10) {
        setNeedsDirectorApproval(true);
      } else {
        const hasAnyLargeChange = Object.entries(newRatios).some(([k, v]) => {
          const old = editingRule.ratios[k] || 0;
          if (old === 0) return v > 0.1;
          return Math.abs((v - old) / old) * 100 > 10;
        });
        setNeedsDirectorApproval(hasAnyLargeChange);
      }
    }
  };

  const validateTotalRatio = (): boolean => {
    const total = Object.values(formRatios).reduce((sum, ratio) => sum + ratio, 0);
    return Math.abs(total - 1) < 0.0001;
  };

  const handleSubmitEdit = async () => {
    if (!editingRule) return;

    if (!validateTotalRatio()) {
      message.error('分成比例总和必须等于100%');
      return;
    }

    try {
      const values = await form.validateFields();
      const effectiveDate = values.effectiveDate?.toDate() || new Date();

      if (needsDirectorApproval) {
        setPendingApprovalRule(editingRule);
        setApprovalModalVisible(true);
        return;
      }

      await updateRule(editingRule.id, {
        ratios: formRatios,
        effectiveDate,
      });
      message.success('分成规则更新成功');
      setEditModalVisible(false);
      fetchRules();
    } catch (error) {
      // Validation error
    }
  };

  const handleSubmitApproval = async () => {
    if (!pendingApprovalRule) return;

    try {
      await submitForApproval(pendingApprovalRule.id);
      message.success('已提交总监审批');
      setApprovalModalVisible(false);
      setEditModalVisible(false);
      setPendingApprovalRule(null);
      fetchRules();
    } catch (error) {
      message.error('提交审批失败');
    }
  };

  const getTotalRatio = () => {
    return Object.values(formRatios).reduce((sum, ratio) => sum + ratio, 0);
  };

  const renderRatioChart = (ratios: { [key: string]: number }) => {
    const entries = Object.entries(ratios);
    return (
      <div className="space-y-3">
        {entries.map(([key, ratio]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PARTNER_COLORS[key] || '#1890ff' }}
                />
                {PARTNER_LABELS[key] || key}
              </span>
              <span className="font-medium">{formatPercent(ratio)}</span>
            </div>
            <Progress
              percent={ratio * 100}
              showInfo={false}
              strokeColor={PARTNER_COLORS[key] || '#1890ff'}
              size="small"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderRuleCard = (rule: SplitRule) => {
    const businessLineLabel = getStatusLabel(rule.businessLine, BUSINESS_LINES as any);
    const statusColor = getStatusColor(rule.status, RULE_STATUS as any);
    const statusLabel = getStatusLabel(rule.status, RULE_STATUS as any);
    const createdBy = mockUsers.find((u) => u.id === rule.createdBy);

    const statusIcon =
      rule.status === 'active' ? (
        <CheckCircleOutlined className="text-green-500" />
      ) : rule.status === 'pending_approval' ? (
        <ClockCircleOutlined className="text-orange-500" />
      ) : rule.status === 'inactive' ? (
        <ExclamationCircleOutlined className="text-gray-500" />
      ) : (
        <EditOutlined className="text-gray-500" />
      );

    return (
      <Col xs={24} md={12} lg={8} key={rule.id}>
        <Card
          className="h-full shadow-sm hover:shadow-md transition-shadow duration-300"
          bodyStyle={{ padding: '24px' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <Title level={5} className="!mb-1">
                {businessLineLabel}
              </Title>
              <Tag color={statusColor} icon={statusIcon}>
                {statusLabel}
              </Tag>
            </div>
            <div className="text-right">
              <Text type="secondary" className="text-xs">
                版本 v{rule.version}
              </Text>
            </div>
          </div>

          <Divider className="my-3" />

          <div className="mb-4">{renderRatioChart(rule.ratios)}</div>

          <Divider className="my-3" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <Text type="secondary">生效时间</Text>
              <Text>{formatDate(rule.effectiveDate)}</Text>
            </div>
            {rule.expiryDate && (
              <div className="flex justify-between">
                <Text type="secondary">失效时间</Text>
                <Text>{formatDate(rule.expiryDate)}</Text>
              </div>
            )}
            <div className="flex justify-between">
              <Text type="secondary">创建人</Text>
              <Text>{createdBy?.realName || '未知'}</Text>
            </div>
          </div>

          <Divider className="my-4" />

          <Space className="w-full" direction="vertical">
            <Button
              block
              icon={<EditOutlined />}
              onClick={() => handleEditRule(rule)}
              disabled={rule.status !== 'active' && rule.status !== 'draft'}
            >
              调整比例
            </Button>
            <Button
              block
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(rule.id)}
            >
              变更历史
            </Button>
            {rule.status === 'draft' && (
              <Button
                block
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSubmitApproval()}
              >
                提交审批
              </Button>
            )}
          </Space>
        </Card>
      </Col>
    );
  };

  const renderEditModal = () => (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>调整分成比例 - {editingRule && getStatusLabel(editingRule.businessLine, BUSINESS_LINES as any)}</span>
        </Space>
      }
      open={editModalVisible}
      onOk={handleSubmitEdit}
      onCancel={() => setEditModalVisible(false)}
      okText={needsDirectorApproval ? '提交审批' : '确认修改'}
      cancelText="取消"
      width={600}
      confirmLoading={loading}
    >
      {needsDirectorApproval && (
        <Alert
          message="需要总监审批"
          description="检测到分成比例变更幅度超过10%，需要财务总监审批后才能生效"
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      <Alert
        message={`当前总和: ${formatPercent(getTotalRatio())}`}
        description={
          validateTotalRatio()
            ? '比例总和正确'
            : `比例总和必须等于100%，还差 ${formatPercent(1 - getTotalRatio())}`
        }
        type={validateTotalRatio() ? 'success' : 'error'}
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical">
        <Divider orientation="left">分成比例设置</Divider>
        {editingRule &&
          Object.entries(editingRule.ratios).map(([key, oldRatio]) => {
            const newRatio = formRatios[key] || 0;
            const diff = newRatio - oldRatio;
            const diffPercent = oldRatio > 0 ? (diff / oldRatio) * 100 : diff * 100;
            const hasLargeChange = Math.abs(diffPercent) > 10;

            return (
              <div key={key} className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PARTNER_COLORS[key] || '#1890ff' }}
                    />
                    {PARTNER_LABELS[key] || key}
                  </span>
                  <Space>
                    <Text type="secondary" className="text-sm">
                      原值: {formatPercent(oldRatio)}
                    </Text>
                    {diff !== 0 && (
                      <Tag
                        color={diff > 0 ? 'green' : 'red'}
                        icon={diff > 0 ? <RiseOutlined /> : <FallOutlined />}
                      >
                        {diff > 0 ? '+' : ''}
                        {formatPercent(diff)}
                        {hasLargeChange && <span className="ml-1">(超10%)</span>}
                      </Tag>
                    )}
                  </Space>
                </div>
                <Form.Item
                  name={['ratios', key]}
                  className="mb-0"
                  rules={[{ required: true, message: '请输入分成比例' }]}
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.01}
                    precision={4}
                    style={{ width: '100%' }}
                    formatter={(value) => `${(value ?? 0) * 100}%`}
                    parser={(value) => parseFloat(value?.replace('%', '') || '0') / 100}
                    onChange={(value) => handleRatioChange(key, value ?? 0)}
                    status={hasLargeChange ? 'warning' : undefined}
                  />
                </Form.Item>
                {hasLargeChange && (
                  <Text type="warning" className="text-xs mt-1">
                    * 变更幅度超过10%，需要总监审批
                  </Text>
                )}
              </div>
            );
          })}

        <Divider orientation="left">变更信息</Divider>
        <Form.Item
          name="changeReason"
          label="变更原因"
          rules={[{ required: true, message: '请输入变更原因' }]}
        >
          <TextArea rows={3} placeholder="请详细说明变更原因" showCount maxLength={500} />
        </Form.Item>

        <Form.Item name="effectiveDate" label="生效日期">
          <Input style={{ width: '100%' }} placeholder="默认为当前日期" />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>变更历史</span>
        </Space>
      }
      open={historyModalVisible}
      onCancel={() => setHistoryModalVisible(false)}
      footer={null}
      width={700}
    >
      {ruleHistory.length > 0 ? (
        <Timeline
          mode="left"
          items={ruleHistory.map((history: SplitRuleHistory, index: number) => {
            const changedBy = mockUsers.find((u) => u.id === history.changedBy);
            return {
              color: index === 0 ? 'blue' : 'gray',
              label: formatDateTime(history.createdAt),
              children: (
                <Card size="small" className="shadow-sm mb-2">
                  <div className="mb-2">
                    <Space>
                      <UserOutlined />
                      <span className="font-medium">{changedBy?.realName || '未知'}</span>
                    </Space>
                    <Tag color="blue" className="ml-2">
                      {history.changeReason}
                    </Tag>
                  </div>

                  <Divider className="my-2" />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary" className="text-sm">
                        调整前
                      </Text>
                      <div className="space-y-1 mt-1">
                        {Object.entries(history.oldRatios).map(([key, ratio]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span>{PARTNER_LABELS[key] || key}:</span>
                            <span className="font-medium">{formatPercent(ratio as number)}</span>
                          </div>
                        ))}
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" className="text-sm">
                        调整后
                      </Text>
                      <div className="space-y-1 mt-1">
                        {Object.entries(history.newRatios).map(([key, ratio]) => {
                          const ratioNum = ratio as number;
                          const oldRatio = (history.oldRatios[key] as number) || 0;
                          const diff = ratioNum - oldRatio;
                          return (
                            <div key={key} className="flex justify-between text-sm">
                              <span>{PARTNER_LABELS[key] || key}:</span>
                              <span className="font-medium">
                                {formatPercent(ratioNum)}
                                {diff !== 0 && (
                                  <Tag
                                    color={diff > 0 ? 'green' : 'red'}
                                    className="ml-1"
                                    style={{ fontSize: '10px', padding: '0 4px' }}
                                  >
                                    {diff > 0 ? '+' : ''}
                                    {formatPercent(diff)}
                                  </Tag>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  </Row>
                </Card>
              ),
            };
          })}
        />
      ) : (
        <div className="text-center py-8">
          <HistoryOutlined className="text-6xl text-gray-300 mb-4" />
          <Paragraph type="secondary">暂无变更历史</Paragraph>
        </div>
      )}
    </Modal>
  );

  const renderApprovalModal = () => (
    <Modal
      title={
        <Space>
          <SendOutlined />
          <span>提交总监审批</span>
        </Space>
      }
      open={approvalModalVisible}
      onOk={handleSubmitApproval}
      onCancel={() => {
        setApprovalModalVisible(false);
        setPendingApprovalRule(null);
      }}
      okText="确认提交"
      cancelText="取消"
      confirmLoading={loading}
    >
      <Alert
        message="重要提示"
        description={
          <div>
            <Paragraph className="mb-2">
              由于分成比例变更幅度超过10%，根据公司规定，需要财务总监审批后才能生效。
            </Paragraph>
            <Paragraph className="mb-0">
              审批流程：业务经理 → 财务人员 → 财务总监
            </Paragraph>
          </div>
        }
        type="warning"
        showIcon
        className="mb-4"
      />

      {pendingApprovalRule && (
        <Card size="small">
          <Statistic
            title="业务线"
            value={getStatusLabel(pendingApprovalRule.businessLine, BUSINESS_LINES as any)}
            className="mb-2"
          />
          <div className="text-sm text-gray-500">
            审批通过后，新的分成比例将自动生效
          </div>
        </Card>
      )}
    </Modal>
  );

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="!mb-0">
              分成规则管理
            </Title>
            <Text type="secondary">管理各业务线的分成比例和规则</Text>
          </div>
          <Space>
            <Button onClick={() => fetchRules()}>刷新</Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[24, 24]}>{rules.map(renderRuleCard)}</Row>

      {renderEditModal()}
      {renderHistoryModal()}
      {renderApprovalModal()}
    </div>
  );
}
