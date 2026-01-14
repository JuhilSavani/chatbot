import passport from "passport";
import { Strategy, ExtractJwt } from 'passport-jwt';
import { User } from "../models/user.models.js";

const jwtOptions = {
  jwtFromRequest: (req) => req?.cookies?.authJwt || null,
  secretOrKey: process.env.SUPABASE_JWT_SECRET,
};

export const configPassport = () => {
  passport.use(
    new Strategy(jwtOptions, async (jwtPayload, callback) => {
      try {
        const user = await User.findByPk(jwtPayload.sub, {
          attributes: ["id", "username", "email", "roles", "createdAt"],
        });
        if (user) {
          return callback(null, user);
        } else {
          return callback(null, false);
        }
      } catch (error) {
        console.error("[Passport Config] Error during JWT user lookup:", error);
        return callback(error, false);
      }
    })
  );
};

export const authenticateJWT = passport.authenticate('jwt', { session: false });
