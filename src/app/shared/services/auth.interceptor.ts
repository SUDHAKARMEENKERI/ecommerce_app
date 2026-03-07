import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authHeader = authService.getAuthHeaderValue();
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api/');

  const authorizedRequest = req.clone({
    withCredentials: isApiRequest,
    setHeaders: authHeader
      ? {
          Authorization: authHeader
        }
      : {}
  });

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        authService.clearAuthSession();
        router.navigate(['/vendor/login']);
      }

      return throwError(() => error);
    })
  );
};