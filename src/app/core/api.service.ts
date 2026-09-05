import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

export const API_BASE = '/cafeteria';
export const ADMIN_BASE = `${API_BASE}/admin`;
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  errors?: Record<string, string>;
}
export interface Entity {
  id: number;
  [key: string]: any;
}
export interface Option {
  id: number;
  name: string;
}
export interface UploadResult {
  filename: string;
  original_filename: string;
  path: string;
  url: string;
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'Cannot reach the server. Check that the backend is running on port 8000.';
    if (error.status === 429) return 'Too many requests. Please wait a minute, then try again.';
    return error.error?.message || `The request failed (${error.status}). Please try again.`;
  }
  return 'Something went wrong. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  get<T>(path: string, values: Record<string, string | number | boolean> = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values))
      if (value !== '' && value != null) params = params.set(key, value);
    return this.http.get<ApiResponse<T>>(`${ADMIN_BASE}/${path}`, { params });
  }
  create(path: string, body: unknown) {
    return this.http.post<ApiResponse<Entity>>(`${ADMIN_BASE}/${path}`, body);
  }
  update(path: string, body: unknown) {
    return this.http.put<ApiResponse<Entity>>(`${ADMIN_BASE}/${path}`, body);
  }
  delete(path: string) {
    return this.http.delete<ApiResponse<null>>(`${ADMIN_BASE}/${path}`);
  }
  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ApiResponse<UploadResult>>(`${ADMIN_BASE}/uploads`, body);
  }
  health() {
    return this.http.get<ApiResponse<{ status: string }>>(`${API_BASE}/health`);
  }
}
