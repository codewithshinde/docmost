import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PagePermissionService } from './page-permission.service';
import {
  AddPagePermissionDto,
  GetPagePermissionsDto,
  RemovePagePermissionDto,
  UpdatePagePermissionRoleDto,
} from './dto/page-permission.dto';
import { PageIdDto } from '../dto/page.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagePermissionController {
  constructor(
    private readonly pagePermissionService: PagePermissionService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('restrict')
  async restrictPage(
    @Body() dto: PageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.restrictPage(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('remove-restriction')
  async unrestrictPage(
    @Body() dto: PageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.unrestrictPage(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('add-permission')
  async addPagePermission(
    @Body() dto: AddPagePermissionDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.addPagePermission(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('remove-permission')
  async removePagePermission(
    @Body() dto: RemovePagePermissionDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.removePagePermission(
      dto,
      user,
      workspace,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-permission')
  async updatePagePermissionRole(
    @Body() dto: UpdatePagePermissionRoleDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.updatePagePermissionRole(
      dto,
      user,
      workspace,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('permissions')
  async getPagePermissions(
    @Body() dto: GetPagePermissionsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.getPagePermissions(
      dto,
      user,
      workspace,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('permission-info')
  async getPageRestrictionInfo(
    @Body() dto: PageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pagePermissionService.getPageRestrictionInfo(
      dto,
      user,
      workspace,
    );
  }
}
