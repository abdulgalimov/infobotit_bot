import { UserService } from '../../database/services/user.service';

export const userMiddleware = (userService: UserService) => {
  return async (ctx, next) => {
    if (ctx.from) {
      ctx.user = await userService.getFrom(ctx.from);
    }

    return next()
      .then()
      .catch((err) => {
        console.log(err);
        throw err;
      });
  };
};
