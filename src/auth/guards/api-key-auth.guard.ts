import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        const validApiKey = this.configService.get<string>('api.betaTestCronApiKey');

        if (!apiKey || apiKey !== validApiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        return true;
    }
}