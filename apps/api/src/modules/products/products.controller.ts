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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  // CPQ
  @Get('pricebooks')
  @ApiOperation({ summary: 'List price books' })
  getPriceBooks(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getPriceBooks(tenantId);
  }

  @Post('pricebooks')
  @Roles('admin')
  @ApiOperation({ summary: 'Create price book' })
  createPriceBook(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.productsService.createPriceBook(tenantId, userId, dto);
  }

  @Get('bundles')
  @ApiOperation({ summary: 'List bundles' })
  getBundles(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getBundles(tenantId);
  }

  @Post('bundles')
  @Roles('admin')
  @ApiOperation({ summary: 'Create bundle' })
  createBundle(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.productsService.createBundle(tenantId, userId, dto);
  }

  @Get('discounts')
  @ApiOperation({ summary: 'List discount rules' })
  getDiscounts(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getDiscounts(tenantId);
  }

  @Post('discounts')
  @Roles('admin')
  @ApiOperation({ summary: 'Create discount rule' })
  createDiscount(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.productsService.createDiscount(tenantId, userId, dto);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate CPQ price simulation' })
  calculatePrice(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.productsService.calculatePrice(tenantId, dto);
  }

  @Get('cpq-stats')
  @ApiOperation({ summary: 'Product catalog statistics' })
  getCPQStats(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getCPQStats(tenantId);
  }
}
