import client from "./client";
import type { ApiListResponse, ApiResponse, Pagination } from "../types/api";
import type {
  BannerListItem,
  CategoryListItem,
  HomeSection,
  ProductDetail,
  ProductListItem,
} from "../types/models";

interface ProductListParams {
  page?: number;
  search?: string;
  category?: string;
  ordering?: string;
  min_price?: string;
  max_price?: string;
  is_featured?: boolean;
}

export async function getProducts(
  params?: ProductListParams,
): Promise<{ products: ProductListItem[]; pagination: Pagination }> {
  const { data } = await client.get<ApiListResponse<ProductListItem>>(
    "/products/",
    { params },
  );
  return {
    products: data.data,
    pagination: data.pagination!,
  };
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  const { data } = await client.get<ApiResponse<ProductDetail>>(
    `/products/${slug}/`,
  );
  return data.data;
}

export async function getCategories(): Promise<CategoryListItem[]> {
  const { data } = await client.get<ApiListResponse<CategoryListItem>>(
    "/categories/",
  );
  return data.data;
}

export async function getBanners(
  placement?: string,
): Promise<BannerListItem[]> {
  const { data } = await client.get<ApiListResponse<BannerListItem>>(
    "/banners/",
    { params: placement ? { placement } : undefined },
  );
  return data.data;
}

export async function getHome(): Promise<HomeSection[]> {
  const { data } = await client.get<ApiListResponse<HomeSection>>("/home/");
  return data.data;
}
