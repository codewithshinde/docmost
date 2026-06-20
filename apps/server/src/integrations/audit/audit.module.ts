import { Global, Module } from '@nestjs/common';
import { AUDIT_SERVICE, AuditService } from './audit.service';

@Global()
@Module({
  providers: [
    {
      provide: AUDIT_SERVICE,
      useClass: AuditService,
    },
  ],
  exports: [AUDIT_SERVICE],
})
export class AuditModule {}
