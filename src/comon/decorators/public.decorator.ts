import { SetMetadata } from '@nestjs/common';
import { IsPublic } from '@/src/shared/constant';

export const Public = () => SetMetadata(IsPublic, true);
