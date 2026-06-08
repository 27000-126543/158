import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Typography,
  Tag,
  message,
  Popconfirm,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { User, UserRole } from '@shared/types';
import { useSystemStore } from '../store/useSystemStore';
import { useAuthStore } from '../store/useAuthStore';
import { USER_ROLES } from '../utils/constants';
import { formatDateTime, getStatusLabel, getStatusColor } from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

interface UserFormData {
  username: string;
  realName: string;
  role: UserRole;
  email: string;
  phone: string;
  password?: string;
}

export default function SystemUsers() {
  const { user } = useAuthStore();
  const {
    users,
    usersTotal,
    usersPage,
    usersPageSize,
    userFilters,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    setUserFilters,
    resetUserFilters,
  } = useSystemStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [form] = Form.useForm<UserFormData>();
  const [passwordForm] = Form.useForm<{ newPassword: string; confirmPassword: string }>();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isAdmin]);

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      realName: user.realName,
      role: user.role,
      email: user.email,
      phone: user.phone,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        await updateUser(editingUser.id, values);
        message.success('用户更新成功');
      } else {
        if (!values.password) {
          message.error('请输入密码');
          return;
        }
        await createUser({ ...values, password: values.password });
        message.success('用户创建成功');
      }

      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      // Validation error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success('用户删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleResetPassword = (userId: string) => {
    setResetUserId(userId);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleSubmitPassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }

      if (resetUserId) {
        await resetUserPassword(resetUserId, values.newPassword);
        message.success('密码重置成功');
        setPasswordModalVisible(false);
      }
    } catch (error) {
      // Validation error
    }
  };

  const handleToggleStatus = async (user: User, enabled: boolean) => {
    try {
      message.success(enabled ? '用户已启用' : '用户已停用');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handlePageChange = (page: number, pageSize: number) => {
    fetchUsers({ ...userFilters, page, pageSize });
  };

  const handleSearch = (value: string) => {
    setUserFilters({ keyword: value });
    fetchUsers({ keyword: value });
  };

  const handleRoleFilter = (role: string) => {
    setUserFilters({ role: role || undefined });
    fetchUsers({ role: role || undefined });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <CloseCircleOutlined className="text-6xl text-red-400 mb-4" />
          <Title level={4}>无权限访问</Title>
          <Text type="secondary">该页面仅系统管理员可访问</Text>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string) => (
        <Space>
          <UserOutlined />
          <span className="font-medium">{username}</span>
        </Space>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'realName',
      key: 'realName',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: UserRole) => {
        const roleInfo = USER_ROLES.find((r) => r.value === role);
        const colorMap: Record<UserRole, string> = {
          finance: 'blue',
          business_manager: 'green',
          finance_director: 'purple',
          admin: 'red',
        };
        return <Tag color={colorMap[role]}>{roleInfo?.label || role}</Tag>;
      },
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => formatDateTime(date),
    },
    {
      title: '状态',
      dataIndex: 'id',
      key: 'status',
      width: 100,
      render: (_: string, record: User) => (
        <Switch
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
          defaultChecked
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<KeyOutlined />}
            size="small"
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定删除该用户？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderUserModal = () => (
    <Modal
      title={
        <Space>
          {editingUser ? <EditOutlined /> : <PlusOutlined />}
          <span>{editingUser ? '编辑用户' : '新增用户'}</span>
        </Space>
      }
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={() => setModalVisible(false)}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名长度为3-20个字符' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          name="realName"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input placeholder="请输入真实姓名" />
        </Form.Item>

        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色">
            {USER_ROLES.map((role) => (
              <Option key={role.value} value={role.value}>
                {role.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱地址" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        {!editingUser && (
          <Form.Item
            name="password"
            label="初始密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 20, message: '密码长度为6-20个字符' },
            ]}
          >
            <Password prefix={<LockOutlined />} placeholder="请输入初始密码" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );

  const renderPasswordModal = () => (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>重置密码</span>
        </Space>
      }
      open={passwordModalVisible}
      onOk={handleSubmitPassword}
      onCancel={() => setPasswordModalVisible(false)}
      okText="确认重置"
      cancelText="取消"
      confirmLoading={loading}
      width={400}
    >
      <Form form={passwordForm} layout="vertical">
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, max: 20, message: '密码长度为6-20个字符' },
          ]}
        >
          <Password prefix={<LockOutlined />} placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          rules={[
            { required: true, message: '请再次输入密码' },
            { min: 6, max: 20, message: '密码长度为6-20个字符' },
          ]}
        >
          <Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div className="p-6">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <Title level={4} className="!mb-0">
              用户管理
            </Title>
            <Text type="secondary">管理系统用户和权限</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchUsers()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
              新增用户
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="mb-4 shadow-sm">
        <Space>
          <Input.Search
            placeholder="搜索用户名、姓名、邮箱"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
          <Select
            placeholder="按角色筛选"
            allowClear
            style={{ width: 150 }}
            onChange={handleRoleFilter}
          >
            {USER_ROLES.map((role) => (
              <Option key={role.value} value={role.value}>
                {role.label}
              </Option>
            ))}
          </Select>
          <Button onClick={() => { resetUserFilters(); fetchUsers(); }}>
            重置筛选
          </Button>
        </Space>
      </Card>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: usersPage,
            pageSize: usersPageSize,
            total: usersTotal,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个用户`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      {renderUserModal()}
      {renderPasswordModal()}
    </div>
  );
}
