import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Tag,
  Progress,
  Statistic,
  message,
  Empty,
  Spin,
  Divider,
  Badge,
  Alert,
  Modal,
  List,
} from 'antd';
import {
  SearchOutlined,
  BulbOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  HistoryOutlined,
  EyeOutlined,
  PlusOutlined,
  SendOutlined,
  SwapOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useRecommendStore } from '../store/useRecommendStore';
import { useSuppliersStore } from '../store/useSuppliersStore';
import type { PurchaseRequirement } from '@shared/types';
import type { RecommendResult } from '../api/recommend';
import {
  CATEGORIES,
  PERFORMANCE_LEVELS,
} from '../utils/constants';
import {
  formatCurrency,
  formatPercent,
  getStatusLabel,
  getStatusColor,
} from '../utils/format';

const { Search } = Input;

export default function SmartRecommend() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [viewingResult, setViewingResult] = useState<RecommendResult | null>(null);

  const {
    recommendations,
    requirements,
    selectedRequirement,
    comparisonList,
    loading,
    sortBy,
    sortOrder,
    fetchRequirements,
    setSelectedRequirement,
    setSort,
    toggleComparison,
    clearComparison,
    createInquiry,
  } = useRecommendStore();

  const { fetchDetail, currentSupplier } = useSuppliersStore();

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const filteredRequirements = requirements.filter((req) => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      req.requirementNo.toLowerCase().includes(keyword) ||
      req.title.toLowerCase().includes(keyword) ||
      req.itemName.toLowerCase().includes(keyword)
    );
  });

  const handleSelectRequirement = async (requirement: PurchaseRequirement) => {
    setSelectedRequirement(requirement);
  };

  const handleViewDetail = async (result: RecommendResult) => {
    setViewingResult(result);
    await fetchDetail(result.supplier.id);
    setDetailModalVisible(true);
  };

  const handleSendInquiry = async () => {
    if (!selectedRequirement || comparisonList.length === 0) {
      message.warning('请先选择供应商');
      return;
    }
    try {
      await createInquiry(selectedRequirement.id, comparisonList);
      message.success(`已向 ${comparisonList.length} 家供应商发起询价`);
      setInquiryModalVisible(false);
      clearComparison();
    } catch (error) {
      message.error('发起询价失败');
    }
  };

  const getMatchScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#1890ff';
    if (score >= 70) return '#faad14';
    return '#f5222d';
  };

  const getComparisonChartOption = () => {
    if (comparisonList.length === 0) return {};

    const selectedResults = recommendations.filter((r) =>
      comparisonList.includes(r.supplier.id)
    );

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: selectedResults.map((r) => r.supplier.shortName),
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['匹配度', '价格优势', '交货速度', '质量水平', '满意度'],
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#86909C', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
      },
      series: selectedResults.map((result, index) => {
        const colors = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F'];
        const priceScore = Math.max(0, 100 - ((result.priceRange.min - (selectedRequirement?.budget || 0) / (selectedRequirement?.quantity || 1)) / ((selectedRequirement?.budget || 0) / (selectedRequirement?.quantity || 1))) * 100);
        return {
          name: result.supplier.shortName,
          type: 'bar',
          data: [
            result.matchScore,
            Math.min(100, Math.max(0, priceScore)),
            Math.max(0, 100 - (result.deliveryCycle - 3) * 5),
            result.qualityPassRate * 100,
            result.satisfactionScore * 20,
          ],
          itemStyle: {
            color: colors[index % colors.length],
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '20%',
        };
      }),
    };
  };

  const renderRequirementCard = (req: PurchaseRequirement) => {
    const isSelected = selectedRequirement?.id === req.id;
    const categoryLabel = getStatusLabel(req.category, CATEGORIES as any);

    return (
      <Card
        key={req.id}
        size="small"
        className={`cursor-pointer transition-all duration-200 mb-3 ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'hover:border-blue-300 hover:shadow-sm'
        }`}
        onClick={() => handleSelectRequirement(req)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{req.title}</div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {req.requirementNo}
            </div>
          </div>
          {isSelected && (
            <CheckCircleOutlined className="text-blue-500 text-lg ml-2" />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Tag color="blue">
            {categoryLabel}
          </Tag>
          <Tag>
            {req.itemName}
          </Tag>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>数量: {req.quantity}{req.unit}</span>
          <span>预算: {formatCurrency(req.budget)}</span>
        </div>
      </Card>
    );
  };

  const renderRecommendationCard = (result: RecommendResult, index: number) => {
    const { supplier, matchScore, priceRange, deliveryCycle, historicalOrders, qualityPassRate, satisfactionScore, recommendReason } = result;
    const isInComparison = comparisonList.includes(supplier.id);
    const avgPrice = (priceRange.min + priceRange.max) / 2;
    const budgetUnit = selectedRequirement ? selectedRequirement.budget / selectedRequirement.quantity : 0;
    const priceDiff = budgetUnit > 0 ? ((avgPrice - budgetUnit) / budgetUnit) * 100 : 0;

    return (
      <Col xs={24} lg={12} xl={8} key={supplier.id}>
        <Card
          className="h-full shadow-sm hover:shadow-lg transition-all duration-300"
          bodyStyle={{ padding: '20px' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge.Ribbon
                  text={index === 0 ? '最佳匹配' : `TOP${index + 1}`}
                  color={index === 0 ? '#52c41a' : '#165DFF'}
                  placement="start"
                >
                  <div></div>
                </Badge.Ribbon>
                <h3 className="font-bold text-base m-0">{supplier.name}</h3>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {supplier.shortName} · {getStatusLabel(supplier.category, CATEGORIES as any)}
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color: getMatchScoreColor(matchScore) }}
              >
                {matchScore}
              </div>
              <div className="text-xs text-gray-500">匹配度</div>
            </div>
          </div>

          <Progress
            percent={matchScore}
            strokeColor={getMatchScoreColor(matchScore)}
            showInfo={false}
            size="small"
            className="mb-4"
          />

          <Row gutter={[8, 8]} className="mb-4">
            <Col span={12}>
              <Card size="small" className="text-center h-full">
                <DollarOutlined className="text-green-500 text-lg" />
                <div className="text-sm font-medium mt-1">
                  {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
                </div>
                <div className="text-xs text-gray-500">报价区间</div>
                {priceDiff !== 0 && (
                  <div className={`text-xs mt-1 ${priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {priceDiff > 0 ? <RiseOutlined /> : <FallOutlined />}
                    {Math.abs(priceDiff).toFixed(1)}%
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="text-center h-full">
                <ClockCircleOutlined className="text-blue-500 text-lg" />
                <div className="text-sm font-medium mt-1">
                  {deliveryCycle}天
                </div>
                <div className="text-xs text-gray-500">交货周期</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="text-center h-full">
                <CheckCircleOutlined className="text-purple-500 text-lg" />
                <div className="text-sm font-medium mt-1">
                  {formatPercent(qualityPassRate)}
                </div>
                <div className="text-xs text-gray-500">质量合格率</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="text-center h-full">
                <StarOutlined className="text-orange-500 text-lg" />
                <div className="text-sm font-medium mt-1">
                  {satisfactionScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">满意度评分</div>
              </Card>
            </Col>
          </Row>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <HistoryOutlined />
              历史合作数据
            </div>
            <div className="flex justify-between text-sm">
              <span>
                <ShoppingCartOutlined className="mr-1" />
                {historicalOrders}单
              </span>
              <span className="font-medium text-blue-600">
                {formatCurrency(result.historicalAmount)}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <BulbOutlined className="text-yellow-500" />
              推荐理由
            </div>
            <div className="space-y-1">
              {recommendReason.map((reason, i) => (
                <div key={i} className="text-xs flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span className="text-gray-600">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider className="my-3" />

          <Space className="w-full" direction="vertical" size="small">
            <Space className="w-full justify-between">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(result)}
              >
                查看详情
              </Button>
              <Button
                size="small"
                type={isInComparison ? 'primary' : 'default'}
                icon={<SwapOutlined />}
                onClick={() => toggleComparison(supplier.id)}
              >
                {isInComparison ? '已加入对比' : '加入对比'}
              </Button>
            </Space>
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              block
              onClick={() => {
                if (!comparisonList.includes(supplier.id)) {
                  toggleComparison(supplier.id);
                }
                setInquiryModalVisible(true);
              }}
            >
              发起询价
            </Button>
          </Space>
        </Card>
      </Col>
    );
  };

  const renderSortButton = (
    key: 'match' | 'price' | 'delivery' | 'quality',
    label: string,
    icon: React.ReactNode
  ) => {
    const isActive = sortBy === key;
    return (
      <Button
        type={isActive ? 'primary' : 'default'}
        icon={icon}
        onClick={() => setSort(key)}
        className="flex items-center gap-1"
      >
        {label}
        {isActive && (
          sortOrder === 'desc' ? <ArrowUpOutlined /> : <ArrowDownOutlined />
        )}
      </Button>
    );
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ThunderboltOutlined className="text-yellow-500" />
            智能推荐
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            AI智能匹配优质供应商，提升采购效率
          </p>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8} xl={6}>
          <Card
            className="sticky top-4 shadow-sm"
            title={
              <div className="flex items-center gap-2">
                <SearchOutlined className="text-blue-600" />
                <span>选择采购需求</span>
              </div>
            }
            extra={
              <Tag color="blue">{filteredRequirements.length}条</Tag>
            }
          >
            <Search
              placeholder="搜索需求编号、名称"
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="mb-4"
            />

            <div className="max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
              {filteredRequirements.length > 0 ? (
                filteredRequirements.map(renderRequirementCard)
              ) : (
                <Empty description="暂无匹配的采购需求" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16} xl={18}>
          {selectedRequirement ? (
            <>
              <Card className="mb-4 shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1">
                    <Alert
                      message={
                        <div className="flex items-center gap-2">
                          <BulbOutlined className="text-yellow-500" />
                          <span>已为您智能匹配 {recommendations.length} 家优质供应商</span>
                        </div>
                      }
                      description={
                        <div className="mt-2">
                          <div className="font-medium">{selectedRequirement.title}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {selectedRequirement.requirementNo} · {getStatusLabel(selectedRequirement.category, CATEGORIES as any)} ·{' '}
                            {selectedRequirement.quantity}{selectedRequirement.unit} · 预算 {formatCurrency(selectedRequirement.budget)}
                          </div>
                        </div>
                      }
                      type="info"
                      showIcon={false}
                    />
                  </div>
                  {comparisonList.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag color="blue" className="text-base py-1 px-3">
                        已选择 {comparisonList.length} 家
                      </Tag>
                      <Button onClick={clearComparison} size="small">
                        清空
                      </Button>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => setInquiryModalVisible(true)}
                      >
                        批量发起询价
                      </Button>
                    </div>
                  )}
                </div>

                <Divider className="my-4" />

                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="text-gray-600">
                    共 <span className="font-bold text-blue-600">{recommendations.length}</span> 个推荐结果
                  </div>
                  <Space wrap>
                    <span className="text-sm text-gray-500">排序方式：</span>
                    {renderSortButton('match', '匹配度', <StarOutlined />)}
                    {renderSortButton('price', '价格', <DollarOutlined />)}
                    {renderSortButton('delivery', '交货期', <ClockCircleOutlined />)}
                    {renderSortButton('quality', '质量', <CheckCircleOutlined />)}
                  </Space>
                </div>
              </Card>

              {comparisonList.length >= 2 && (
                <Card className="mb-4 shadow-sm" title="对比分析">
                  <ReactECharts
                    option={getComparisonChartOption()}
                    style={{ height: 350 }}
                    opts={{ renderer: 'canvas' }}
                  />
                </Card>
              )}

              <Spin spinning={loading} tip="正在智能匹配供应商...">
                <Row gutter={[16, 16]}>
                  {recommendations.length > 0 ? (
                    recommendations.map(renderRecommendationCard)
                  ) : (
                    <Col span={24}>
                      <Empty description="暂无匹配的供应商" />
                    </Col>
                  )}
                </Row>
              </Spin>
            </>
          ) : (
            <Card className="shadow-sm min-h-[500px] flex items-center justify-center">
              <Empty
                image={
                  <div className="text-8xl mb-4">
                    <BulbOutlined className="text-blue-300" />
                  </div>
                }
                description={
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-600 mb-2">
                      请从左侧选择一个采购需求
                    </div>
                    <div className="text-sm text-gray-400">
                      系统将根据需求智能匹配最合适的供应商
                    </div>
                  </div>
                }
              />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <SendOutlined className="text-blue-600" />
            <span>发起询价</span>
          </div>
        }
        open={inquiryModalVisible}
        onOk={handleSendInquiry}
        onCancel={() => setInquiryModalVisible(false)}
        okText="确认发起"
        cancelText="取消"
        confirmLoading={loading}
        width={600}
      >
        {selectedRequirement && (
          <>
            <Alert
              message="询价信息确认"
              description={
                <div>
                  <div className="font-medium">{selectedRequirement.title}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedRequirement.requirementNo} · {selectedRequirement.quantity}{selectedRequirement.unit}
                  </div>
                </div>
              }
              type="info"
              showIcon
              className="mb-4"
            />

            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-1">
                <InfoCircleOutlined className="text-blue-500" />
                已选择 {comparisonList.length} 家供应商：
              </div>
              <List
                size="small"
                dataSource={recommendations.filter((r) => comparisonList.includes(r.supplier.id))}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={getStatusColor(item.supplier.performanceLevel, PERFORMANCE_LEVELS as any)}>
                        {getStatusLabel(item.supplier.performanceLevel, PERFORMANCE_LEVELS as any)}
                      </Tag>,
                      <span className="text-green-600 font-medium">
                        匹配度 {item.matchScore}
                      </span>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.supplier.name}
                      description={`${item.supplier.contactName} · ${item.supplier.contactPhone}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-blue-600" />
            <span>供应商详情 - {viewingResult?.supplier.name}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setViewingResult(null);
        }}
        footer={null}
        width={800}
      >
        {currentSupplier && viewingResult && (
          <div>
            <Row gutter={[16, 16]} className="mb-4">
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic
                    title="匹配度评分"
                    value={viewingResult.matchScore}
                    valueStyle={{ color: getMatchScoreColor(viewingResult.matchScore) }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic
                    title="报价区间"
                    value={`${formatCurrency(viewingResult.priceRange.min)} - ${formatCurrency(viewingResult.priceRange.max)}`}
                    valueStyle={{ color: '#00B42A' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" className="text-center">
                  <Statistic
                    title="预计交货期"
                    value={viewingResult.deliveryCycle}
                    suffix="天"
                    valueStyle={{ color: '#165DFF' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="推荐理由" className="mb-4">
              <Row gutter={[8, 8]}>
                {viewingResult.recommendReason.map((reason, i) => (
                  <Col span={12} key={i}>
                    <Tag color="blue" className="w-full text-center py-1">
                      {reason}
                    </Tag>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card size="small" title="供应商信息">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">供应商编号</span>
                  <span className="font-mono">{currentSupplier.supplierNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">供应商名称</span>
                  <span>{currentSupplier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">联系人</span>
                  <span>{currentSupplier.contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">联系电话</span>
                  <span>{currentSupplier.contactPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">邮箱</span>
                  <span>{currentSupplier.contactEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">地址</span>
                  <span>{currentSupplier.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">信用评分</span>
                  <span className="font-bold" style={{ color: getMatchScoreColor(currentSupplier.creditRating) }}>
                    {currentSupplier.creditRating}分
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">绩效等级</span>
                  <Tag color={getStatusColor(currentSupplier.performanceLevel, PERFORMANCE_LEVELS as any)}>
                    {getStatusLabel(currentSupplier.performanceLevel, PERFORMANCE_LEVELS as any)}
                  </Tag>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">历史合作</span>
                  <span>{currentSupplier.totalOrders}单 · {formatCurrency(currentSupplier.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">按时交货率</span>
                  <span>{formatPercent(currentSupplier.onTimeDeliveryRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">质量合格率</span>
                  <span>{formatPercent(currentSupplier.qualityPassRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">客户满意度</span>
                  <span>{currentSupplier.satisfactionScore.toFixed(1)}/5.0</span>
                </div>
              </div>
            </Card>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => {
                  if (!comparisonList.includes(currentSupplier.id)) {
                    toggleComparison(currentSupplier.id);
                  }
                  setDetailModalVisible(false);
                }}
                icon={<PlusOutlined />}
              >
                加入对比
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => {
                  if (!comparisonList.includes(currentSupplier.id)) {
                    toggleComparison(currentSupplier.id);
                  }
                  setDetailModalVisible(false);
                  setInquiryModalVisible(true);
                }}
              >
                发起询价
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
