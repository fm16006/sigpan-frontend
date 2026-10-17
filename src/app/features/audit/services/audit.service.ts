import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { AuditLogQuery } from '../../../core/models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClient);

  logsUrl(query: AuditLogQuery): string {
    return this.api.url(API_ENDPOINTS.logs.root, { ...query });
  }

  eventsUrl(): string {
    return this.api.url(API_ENDPOINTS.eventos.root);
  }
}
