import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { getAuth } from '@clerk/express'; // to retrieve auth data from the request
import type { ClerkClient } from '@clerk/backend'; // ClerkClient type for typing (optional)
import { Reflector } from '@nestjs/core';
import { IsPublic } from '@/src/shared/constant';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject('ClerkClient') private clerkClient: ClerkClient, // inject our Clerk client
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IsPublic, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const auth = getAuth(req);
    const userId = auth.userId; // Clerk populates userId if token is valid

    if (!userId) {
      // No valid session token present
      return false;
    }

    try {
      const user = await this.clerkClient.users.getUser(userId);
      req.user = user; // attach user info to request for controllers
    } catch (error) {
      return false;
    }

    return true; // allow the request to proceed
  }
}
