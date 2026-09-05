import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ADMIN_BASE } from './api.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (
    !request.url.startsWith(`${ADMIN_BASE}/`) ||
    /\/auth\/(login|refresh-token)$/.test(request.url)
  )
    return next(request);
  const sentToken = auth.session()?.access_token;
  const authorized = sentToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${sentToken}` } })
    : request;
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        /\/auth\/(logout|revoke-token)$/.test(request.url) ||
        !auth.session()?.refresh_token
      )
        return throwError(() => error);
      // Concurrent failures share one refresh; a late failure reuses the already rotated token.
      if (auth.session()?.access_token !== sentToken)
        return next(
          request.clone({
            setHeaders: {
              Authorization: `Bearer ${auth.session()!.access_token}`,
            },
          }),
        );
      return auth.refresh().pipe(
        catchError((refreshError) => {
          auth.clear();
          return throwError(() => refreshError);
        }),
        switchMap((response) =>
          auth.authenticated()
            ? next(
                request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${response.data.access_token}`,
                  },
                }),
              )
            : throwError(() => error),
        ),
      );
    }),
  );
};
