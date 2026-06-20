import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  ListTemplatesDto,
  TemplateIdDto,
  UpdateTemplateDto,
  UseTemplateDto,
} from './dto/template.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/')
  async getTemplates(
    @Body() dto: ListTemplatesDto,
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.getTemplates(user, workspace, dto, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getTemplateById(
    @Body() dto: TemplateIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.getTemplateById(
      dto.templateId,
      user,
      workspace,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.createTemplate(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateTemplate(
    @Body() dto: UpdateTemplateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.updateTemplate(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteTemplate(
    @Body() dto: TemplateIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.deleteTemplate(
      dto.templateId,
      user,
      workspace,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('use')
  async useTemplate(
    @Body() dto: UseTemplateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.useTemplate(dto, user, workspace);
  }
}
