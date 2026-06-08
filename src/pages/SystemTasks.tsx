import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Modal,
  Typography,
  Tag,
  message,
  Switch,
  Divider,
  Empty,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { TaskInfo } from '@shared/types';
import { useSystemStore } from '../store/useSystemStore';
import { formatDateTime } from '../utils/format';

const { Title, Text, Paragraph } = Typography;

export default function SystemTasks() {
  const { tasks, loading, fetchTasks, runTask, toggleTask, fetchTaskLogs, taskLogs } =
    useSystemStore();

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskLogs, setCurrentTaskLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRunTask = async (taskId: string) => {
    try {
      const result = await runTask(taskId);
      message.success(result.message);
      setTimeout(() => fetchTasks(), 2000);
    } catch (error) {
      message.error('执行任务失败');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await toggleTask(taskId);
      message.success('任务状态已更新');
    } catch (error) {
      message.error('切换任务状态失败');
    }
  };

  const handleViewLogs = async (taskId: string) => {
    setCurrentTaskId(taskId);
    try {
      const logs = await fetchTaskLogs(taskId);
      setCurrentTaskLogs(logs);
      setLogModalVisible(true);
    } catch (error) {
      message.error('获取任务日志失败');
    }
  };

  const getStatusConfig = (status: TaskInfo['status'], lastStatus?: TaskInfo['lastStatus']) => {
    const configs = {
      running: {
        color: 'green',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: '运行中',
        icon: <PlayCircleOutlined />,
        pulse: true,
      },
      idle: {
        color: 'default',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: '空闲',
        icon: <PauseCircleOutlined />,
        pulse: false,
      },
      error: {
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: '错误',
        icon: <CloseCircleOutlined />,
        pulse: false,
      },
    };

    const config = configs[status];
    if (status === 'idle' && lastStatus === 'failed') {
      return { ...config, color: 'red', label: '上次失败' };
    }
    return config;
  };

  const getLastStatusBadge = (lastStatus?: TaskInfo['lastStatus']) => {
    if (!lastStatus) return null;
    return lastStatus === 'success' ? (
      <Tag icon={<CheckCircleOutlined />} color="success">
        上次成功
      </Tag>
    ) : (
      <Tag icon={<CloseCircleOutlined />} color="error">
        上次失败
      </Tag>
    );
  };

  const renderTaskCard = (task: TaskInfo) => {
    const statusConfig = getStatusConfig(task.status, task.lastStatus);
    const isRunning = task.status === 'running';

    return (
      <Col xs={24} md={12} lg={8} key={task.id}>
        <Card
          className={`h-full shadow-sm hover:shadow-md transition-all duration-300 ${statusConfig.bgColor} border-2 ${statusConfig.borderColor}`}
          bodyStyle={{ padding: '24px' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <Title level={5} className="!mb-2 !text-gray-800">
                {task.name}
              </Title>
              <div className="flex items-center gap-2">
                {statusConfig.pulse ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                ) : (
                  <span
                    className={`w-3 h-3 rounded-full ${
                      task.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  ></span>
                )}
                <Tag color={statusConfig.color} className="!mb-0">
                  {statusConfig.label}
                </Tag>
                {getLastStatusBadge(task.lastStatus)}
              </div>
            </div>
            <Switch
              checked={task.status !== 'idle'}
              onChange={() => handleToggleTask(task.id)}
              loading={loading}
            />
          </div>

          <div className="mb-3">
            <Text type="secondary" className="text-xs">
              Cron 表达式
            </Text>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-blue-600">
                {task.cronExpression}
              </code>
            </div>
          </div>

          <Paragraph className="text-sm text-gray-600 mb-4 line-clamp-2">
            {task.description}
          </Paragraph>

          <Divider className="my-3" />

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <Text type="secondary" className="flex items-center gap-1">
                <ClockCircleOutlined />
                上次运行
              </Text>
              <Text className="font-medium">
                {task.lastRunAt ? formatDateTime(task.lastRunAt) : '-'}
              </Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary" className="flex items-center gap-1">
                <ClockCircleOutlined />
                下次运行
              </Text>
              <Text className="font-medium">
                {task.nextRunAt ? formatDateTime(task.nextRunAt) : '-'}
              </Text>
            </div>
          </div>

          <Divider className="my-3" />

          <Space className="w-full" direction="vertical">
            <Button
              block
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRunTask(task.id)}
              loading={loading || isRunning}
              disabled={isRunning}
            >
              立即执行
            </Button>
            <Button
              block
              icon={<FileTextOutlined />}
              onClick={() => handleViewLogs(task.id)}
            >
              查看日志
            </Button>
          </Space>
        </Card>
      </Col>
    );
  };

  const renderLogModal = () => {
    const task = tasks.find((t) => t.id === currentTaskId);
    const storedLogs = taskLogs.find((tl) => tl.taskId === currentTaskId)?.logs || currentTaskLogs;

    return (
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>任务执行日志 - {task?.name}</span>
          </Space>
        }
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={800}
      >
        {storedLogs.length > 0 ? (
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
            {storedLogs.map((log, index) => {
              let colorClass = 'text-gray-300';
              if (log.includes('ERROR')) colorClass = 'text-red-400';
              else if (log.includes('WARN')) colorClass = 'text-yellow-400';
              else if (log.includes('INFO')) colorClass = 'text-green-400';
              else if (log.includes('DEBUG')) colorClass = 'text-blue-400';

              return (
                <div key={index} className={`font-mono text-xs mb-1 ${colorClass}`}>
                  {log}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无日志记录" />
        )}
      </Modal>
    );
  };

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="!mb-0">
              定时任务管理
            </Title>
            <Text type="secondary">管理系统定时任务的执行和状态</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchTasks()}>
              刷新
            </Button>
            <Button icon={<SettingOutlined />}>任务配置</Button>
          </Space>
        </div>
      </Card>

      <div className="mb-4 flex gap-4">
        <Card size="small" className="flex-1 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
            </span>
            <div>
              <Text type="secondary" className="text-xs">
                运行中
              </Text>
              <div className="font-bold text-lg">
                {tasks.filter((t) => t.status === 'running').length}
              </div>
            </div>
          </div>
        </Card>
        <Card size="small" className="flex-1 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-gray-400"></span>
            <div>
              <Text type="secondary" className="text-xs">
                空闲
              </Text>
              <div className="font-bold text-lg">
                {tasks.filter((t) => t.status === 'idle').length}
              </div>
            </div>
          </div>
        </Card>
        <Card size="small" className="flex-1 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-red-500"></span>
            <div>
              <Text type="secondary" className="text-xs">
                错误
              </Text>
              <div className="font-bold text-lg">
                {tasks.filter((t) => t.status === 'error').length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Row gutter={[24, 24]}>{tasks.map(renderTaskCard)}</Row>

      {renderLogModal()}
    </div>
  );
}
