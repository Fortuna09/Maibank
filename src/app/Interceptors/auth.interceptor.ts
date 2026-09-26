import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../Services/auth.service';

/**
 * Se qualquer chamada de dados voltar 401, a sessão acabou (expirou, senha trocada,
 * "sair de todos os dispositivos"): limpa o estado e manda para o login.
 * As rotas de /api/auth tratam o 401 na própria tela (ex.: senha errada).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/api/auth/')) {
        auth.handleUnauthorized();
      }
      return throwError(() => error);
    })
  );
};
