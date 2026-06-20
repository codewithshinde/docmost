import { Global, Module } from '@nestjs/common';
import { IntegrationSettingsService } from './integration-settings.service';
import { IntegrationController } from './integration.controller';

@Global()
@Module({
  controllers: [IntegrationController],
  providers: [IntegrationSettingsService],
  exports: [IntegrationSettingsService],
})
export class IntegrationModule {}
