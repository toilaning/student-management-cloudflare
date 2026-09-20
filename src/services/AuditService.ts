import { IRepository } from '@/repositories/IRepository';
import { AuditLog, AuditAction } from '@/types/audit';

export class AuditService {
  constructor(private repo: IRepository) {}

  public async logAction(params: {
    userId: string;
    userName: string;
    userRole: string;
    action: AuditAction;
    targetResource: string;
    targetId: string;
    details: string;
    oldValue?: string;
    newValue?: string;
  }): Promise<AuditLog> {
    return this.repo.addAuditLog({
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      targetResource: params.targetResource,
      targetId: params.targetId,
      details: params.details,
      oldValue: params.oldValue,
      newValue: params.newValue,
    });
  }

  public async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    const logs = await this.repo.getAllAuditLogs();
    return logs.slice(0, limit);
  }
}
