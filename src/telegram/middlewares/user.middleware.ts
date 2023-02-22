import { UserManager } from '../../database/managers/user.manager';

export const userMiddleware = (users: UserManager) => {
  return async (ctx, next) => {
    if (ctx.from) {
      ctx.user = await users.getFrom(ctx.from);
    }

    return next()
      .then()
      .catch((err) => {
        console.log(err);
        throw err;
      });
  };
};
