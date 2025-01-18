import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Reflector } from '@nestjs/core';
import { IsPublic } from '@/src/shared/constant';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isPublicRoute: boolean = this.reflector.getAllAndOverride<boolean>(
      IsPublic,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) {
      return true;
    }

    const sessionToken =
      request.headers.session ?? request?.headers?.authorization?.split(' ')[1];

    if (!sessionToken) {
      return false;
    }

    try {
      const session = await clerkClient.verifyToken(sessionToken);
      request.user = await clerkClient.users.getUser(session.sub);
    } catch (error) {
      return false;
    }

    return true;
  }
}
