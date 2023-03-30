import { Body, Controller, Get, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CreateUserDto } from "./dto/createUser.dto";
import { LoginUserDto } from "./dto/loginUser.dto";
import { UserResponseInterface } from "./types/userResponse.interface";
import { UserService } from "./user.service";
import { ExpressRequest } from "./types/expressRequest.interface";
import { User } from "./decorators/user.decorator";
import { UserEntity } from "./user.entity";
import { AuthGuard } from "./guards/auth.guard";
import { UpdateUserDto } from "./dto/updateUser.dto";

@Controller('users')
export class UserController {

    constructor(private readonly userService: UserService){}
    
    @Post('/')
    @UsePipes(new ValidationPipe)
    async createUser(@Body('user') createUserDto: CreateUserDto): Promise<UserResponseInterface>{
        const user = await this.userService.createUser(createUserDto);
        return this.userService.buildUserResponse(user);
    }

    @Post('/login')
    @UsePipes(new ValidationPipe)
    async login(@Body('user') loginUserDto: LoginUserDto): Promise<UserResponseInterface>{
        const user = await this.userService.loginUser(loginUserDto);
        return this.userService.buildUserResponse(user);
    }

    @Get('user')
    @UseGuards(AuthGuard)
    async currentUser(@User() user: UserEntity):Promise<UserResponseInterface> {
        return this.userService.buildUserResponse(user)
    }

    @Put('user')
    @UseGuards(AuthGuard)
    async updateCurrentUser(@User('id') currentUserId: number, @Body('user') updateUserDto: UpdateUserDto): Promise<UserResponseInterface> {
        const user = await this.userService.updateUser(
        currentUserId,
        updateUserDto,
        );
        return this.userService.buildUserResponse(user);
  }

}