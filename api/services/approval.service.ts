import prisma from '../utils/prisma.js';
import type { ApprovalFlow, ApprovalNode, ApprovalFlowType, ApprovalStatus, PaginatedResponse, UserRole } from '@shared/types';

interface ApprovalFlowCreateData {
  type: ApprovalFlowType;
  relatedId: string;
  requireDirectorLevel?: boolean;
}

interface ApprovalQueryParams {
  type?: ApprovalFlowType;
  status?: ApprovalStatus;
  relatedId?: string;
  page?: number;
  pageSize?: number;
}

interface ApproveData {
  flowId: string;
  approverId: string;
  comment?: string;
}

interface RejectData {
  flowId: string;
  approverId: string;
  comment: string;
}

const APPROVAL_LEVELS: Record<ApprovalFlowType, { role: UserRole; level: number }[]> = {
  split_change: [
    { role: 'finance', level: 0 },
    { role: 'business_manager', level: 1 },
  ],
  over_budget: [
    { role: 'finance', level: 0 },
    { role: 'finance_director', level: 1 },
  ],
  special_reconciliation: [
    { role: 'finance', level: 0 },
    { role: 'business_manager', level: 1 },
    { role: 'finance_director', level: 2 },
  ],
};

const DIRECTOR_LEVELS: Record<ApprovalFlowType, { role: UserRole; level: number }[]> = {
  split_change: [
    { role: 'finance', level: 0 },
    { role: 'business_manager', level: 1 },
    { role: 'finance_director', level: 2 },
  ],
  over_budget: [
    { role: 'finance', level: 0 },
    { role: 'finance_director', level: 1 },
  ],
  special_reconciliation: [
    { role: 'finance', level: 0 },
    { role: 'business_manager', level: 1 },
    { role: 'finance_director', level: 2 },
  ],
};

const approvalService = {
  async createFlow(data: ApprovalFlowCreateData): Promise<ApprovalFlow> {
    const levels = data.requireDirectorLevel ? DIRECTOR_LEVELS[data.type] : APPROVAL_LEVELS[data.type];

    const flow = await prisma.approvalFlow.create({
      data: {
        type: data.type,
        relatedId: data.relatedId,
        currentNode: 0,
        nodes: {
          create: levels.map(level => ({
            level: level.level,
            approverRole: level.role,
          })),
        },
      },
      include: {
        nodes: true,
      },
    });

    return {
      ...flow,
      nodes: flow.nodes.map(n => ({ ...n })),
    };
  },

  async getFlowById(id: string): Promise<ApprovalFlow | null> {
    const flow = await prisma.approvalFlow.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
    });
    if (!flow) return null;
    return {
      ...flow,
      nodes: flow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    };
  },

  async getFlowsByRelatedId(relatedId: string): Promise<ApprovalFlow[]> {
    const flows = await prisma.approvalFlow.findMany({
      where: { relatedId },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return flows.map(flow => ({
      ...flow,
      nodes: flow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    }));
  },

  async listFlows(params: ApprovalQueryParams): Promise<PaginatedResponse<ApprovalFlow>> {
    const { type, status, relatedId, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (relatedId) where.relatedId = relatedId;

    const [total, flows] = await Promise.all([
      prisma.approvalFlow.count({ where }),
      prisma.approvalFlow.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          nodes: {
            include: {
              approver: true,
            },
          },
        },
      }),
    ]);

    const items: ApprovalFlow[] = flows.map(flow => ({
      ...flow,
      nodes: flow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getPendingFlowsByRole(role: UserRole): Promise<ApprovalFlow[]> {
    const flows = await prisma.approvalFlow.findMany({
      where: {
        status: 'pending',
        nodes: {
          some: {
            approverRole: role,
            status: 'pending',
          },
        },
      },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return flows
      .map(flow => ({
        ...flow,
        nodes: flow.nodes.map(n => ({
          ...n,
          approver: n.approver ? { ...n.approver } : undefined,
        })),
      }))
      .filter(flow => {
        const currentNode = flow.nodes.find(n => n.level === flow.currentNode);
        return currentNode?.approverRole === role && currentNode.status === 'pending';
      });
  },

  async approve(data: ApproveData): Promise<ApprovalFlow> {
    const flow = await prisma.approvalFlow.findUnique({
      where: { id: data.flowId },
      include: {
        nodes: true,
      },
    });

    if (!flow) {
      throw new Error('审批流不存在');
    }

    if (flow.status !== 'pending') {
      throw new Error(`审批流状态为 ${flow.status}，无法审批`);
    }

    const currentNode = flow.nodes.find(n => n.level === flow.currentNode);
    if (!currentNode) {
      throw new Error('找不到当前审批节点');
    }

    if (currentNode.status !== 'pending') {
      throw new Error('当前节点已处理');
    }

    const approver = await prisma.user.findUnique({
      where: { id: data.approverId },
    });

    if (!approver) {
      throw new Error('审批人不存在');
    }

    if (approver.role !== currentNode.approverRole) {
      throw new Error(`审批人角色 ${approver.role} 无权审批该节点，需要 ${currentNode.approverRole}`);
    }

    const isLastNode = flow.currentNode === flow.nodes.length - 1;

    await prisma.approvalNode.update({
      where: { id: currentNode.id },
      data: {
        approverId: data.approverId,
        status: 'approved',
        comment: data.comment,
        approvedAt: new Date(),
      },
    });

    let newStatus: ApprovalStatus = 'pending';
    let newCurrentNode = flow.currentNode;

    if (isLastNode) {
      newStatus = 'approved';
    } else {
      newCurrentNode = flow.currentNode + 1;
    }

    const updatedFlow = await prisma.approvalFlow.update({
      where: { id: data.flowId },
      data: {
        status: newStatus,
        currentNode: newCurrentNode,
      },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (newStatus === 'approved') {
      if (flow.type === 'split_change') {
        await prisma.splitRule.update({
          where: { id: flow.relatedId },
          data: { status: 'active' },
        });
      } else if (flow.type === 'over_budget') {
        await prisma.settlement.update({
          where: { id: flow.relatedId },
          data: { status: 'approved' },
        });
      }
    }

    return {
      ...updatedFlow,
      nodes: updatedFlow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    };
  },

  async reject(data: RejectData): Promise<ApprovalFlow> {
    const flow = await prisma.approvalFlow.findUnique({
      where: { id: data.flowId },
      include: {
        nodes: true,
      },
    });

    if (!flow) {
      throw new Error('审批流不存在');
    }

    if (flow.status !== 'pending') {
      throw new Error(`审批流状态为 ${flow.status}，无法驳回`);
    }

    const currentNode = flow.nodes.find(n => n.level === flow.currentNode);
    if (!currentNode) {
      throw new Error('找不到当前审批节点');
    }

    if (currentNode.status !== 'pending') {
      throw new Error('当前节点已处理');
    }

    const approver = await prisma.user.findUnique({
      where: { id: data.approverId },
    });

    if (!approver) {
      throw new Error('审批人不存在');
    }

    if (approver.role !== currentNode.approverRole) {
      throw new Error(`审批人角色 ${approver.role} 无权审批该节点，需要 ${currentNode.approverRole}`);
    }

    await prisma.approvalNode.update({
      where: { id: currentNode.id },
      data: {
        approverId: data.approverId,
        status: 'rejected',
        comment: data.comment,
        approvedAt: new Date(),
      },
    });

    const updatedFlow = await prisma.approvalFlow.update({
      where: { id: data.flowId },
      data: {
        status: 'rejected',
      },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (flow.type === 'split_change') {
      await prisma.splitRule.update({
        where: { id: flow.relatedId },
        data: { status: 'inactive' },
      });
    } else if (flow.type === 'over_budget') {
      await prisma.settlement.update({
        where: { id: flow.relatedId },
        data: { status: 'rejected' },
      });
    }

    return {
      ...updatedFlow,
      nodes: updatedFlow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    };
  },

  async cancelFlow(id: string): Promise<ApprovalFlow> {
    const flow = await prisma.approvalFlow.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
    });
    return {
      ...flow,
      nodes: flow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    };
  },

  async updateNode(id: string, data: Partial<ApprovalNode>): Promise<ApprovalNode> {
    const node = await prisma.approvalNode.update({
      where: { id },
      data,
      include: {
        approver: true,
      },
    });
    return {
      ...node,
      approver: node.approver ? { ...node.approver } : undefined,
    };
  },

  async deleteNode(id: string): Promise<ApprovalNode> {
    const node = await prisma.approvalNode.delete({
      where: { id },
      include: {
        approver: true,
      },
    });
    return {
      ...node,
      approver: node.approver ? { ...node.approver } : undefined,
    };
  },

  async deleteFlow(id: string): Promise<ApprovalFlow> {
    const flow = await prisma.approvalFlow.delete({
      where: { id },
      include: {
        nodes: {
          include: {
            approver: true,
          },
        },
      },
    });
    return {
      ...flow,
      nodes: flow.nodes.map(n => ({
        ...n,
        approver: n.approver ? { ...n.approver } : undefined,
      })),
    };
  },

  async getApprovalStats(startDate: Date, endDate: Date): Promise<{ type: ApprovalFlowType; total: number; approved: number; rejected: number; pending: number; avgTime: number }[]> {
    const flows = await prisma.approvalFlow.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        nodes: true,
      },
    });

    const stats: { [key: string]: { total: number; approved: number; rejected: number; pending: number; totalTime: number; completedCount: number } } = {};

    for (const flow of flows) {
      if (!stats[flow.type]) {
        stats[flow.type] = { total: 0, approved: 0, rejected: 0, pending: 0, totalTime: 0, completedCount: 0 };
      }
      stats[flow.type].total++;

      if (flow.status === 'approved') {
        stats[flow.type].approved++;
        const lastApprovedNode = flow.nodes.filter(n => n.status === 'approved').pop();
        if (lastApprovedNode?.approvedAt) {
          const timeDiff = lastApprovedNode.approvedAt.getTime() - flow.createdAt.getTime();
          stats[flow.type].totalTime += timeDiff;
          stats[flow.type].completedCount++;
        }
      } else if (flow.status === 'rejected') {
        stats[flow.type].rejected++;
        const rejectedNode = flow.nodes.find(n => n.status === 'rejected');
        if (rejectedNode?.approvedAt) {
          const timeDiff = rejectedNode.approvedAt.getTime() - flow.createdAt.getTime();
          stats[flow.type].totalTime += timeDiff;
          stats[flow.type].completedCount++;
        }
      } else {
        stats[flow.type].pending++;
      }
    }

    return Object.entries(stats).map(([type, data]) => ({
      type: type as ApprovalFlowType,
      total: data.total,
      approved: data.approved,
      rejected: data.rejected,
      pending: data.pending,
      avgTime: data.completedCount > 0 ? Math.round(data.totalTime / data.completedCount / 1000) : 0,
    }));
  },

  async createMockFlows(): Promise<ApprovalFlow[]> {
    const flows: ApprovalFlow[] = [];
    const types: ApprovalFlowType[] = ['split_change', 'over_budget', 'special_reconciliation'];

    const mockUsers = await prisma.user.findMany({ take: 5 });
    if (mockUsers.length === 0) {
      await prisma.user.createMany({
        data: [
          { username: 'finance1', realName: '财务专员', role: 'finance', email: 'finance1@example.com', phone: '13800138001', password: 'password123' },
          { username: 'bm1', realName: '业务经理', role: 'business_manager', email: 'bm1@example.com', phone: '13800138002', password: 'password123' },
          { username: 'fd1', realName: '财务总监', role: 'finance_director', email: 'fd1@example.com', phone: '13800138003', password: 'password123' },
          { username: 'admin', realName: '管理员', role: 'admin', email: 'admin@example.com', phone: '13800138004', password: 'password123' },
        ],
      });
    }

    for (const type of types) {
      for (let i = 0; i < 3; i++) {
        const flow = await this.createFlow({
          type,
          relatedId: `mock-${type}-${Date.now()}-${i}`,
          requireDirectorLevel: Math.random() > 0.5,
        });
        flows.push(flow);
      }
    }

    return flows;
  },
};

export default approvalService;
