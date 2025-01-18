import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from '@/src/user/user.service';
import { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { User } from '@/src/comon/decorators/user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async shouldFetchDocument(@User() user: ClerkUser) {
    try {
      const shouldFetchDocument = await this.userService.fetchUser(user);

      return {
        statusCode: HttpStatus.OK,
        message: 'User fetched successfully',
        data: shouldFetchDocument,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'An error occurred while fetching the user',
        },
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
