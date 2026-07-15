import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  findAll(@CurrentUser('tenantId') t: string, @Query('categoryId') c?: string) {
    return this.productsService.findAll(t, c);
  }

  @Get('products/stats')
  getStats(@CurrentUser('tenantId') t: string) {
    return this.productsService.getStats(t);
  }

  @Get('products/:id')
  findById(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.productsService.findById(id, t);
  }

  @Post('products')
  @Roles('admin')
  create(@Body() d: any, @CurrentUser('tenantId') t: string) {
    return this.productsService.create(t, d);
  }

  @Patch('products/:id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() d: any, @CurrentUser('tenantId') t: string) {
    return this.productsService.update(id, t, d);
  }

  @Delete('products/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.productsService.remove(id, t);
  }

  @Get('categories')
  getCategories(@CurrentUser('tenantId') t: string) {
    return this.productsService.getCategories(t);
  }

  @Post('categories')
  @Roles('admin')
  createCategory(@Body() d: any, @CurrentUser('tenantId') t: string) {
    return this.productsService.createCategory(t, d);
  }

  @Patch('categories/:id')
  @Roles('admin')
  updateCategory(@Param('id') id: string, @Body() d: any) {
    return this.productsService.updateCategory(id, d);
  }

  @Delete('categories/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string) {
    return this.productsService.deleteCategory(id);
  }
}
