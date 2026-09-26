import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';

/** Área logada: sem sessão, vai para o login e volta para onde estava depois. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSession();
  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/entrar'], { queryParams: state.url && state.url !== '/' ? { volta: state.url } : {} });
};

/** Login, cadastro e "esqueci a senha": quem já está logado vai direto para o início. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSession();
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
