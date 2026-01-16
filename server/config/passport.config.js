import passport from "passport";
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { User } from "../models/user.models.js";

const jwtOptions = {
  jwtFromRequest: (req) => req?.cookies?.authJwt || null,
  secretOrKeyProvider: passportJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    // https://supabase.com/docs/guides/auth/jwts#verifying-a-jwt-from-supabase
    jwksUri: `${process.env.SUPABASE_PROJECT_URL}/auth/v1/.well-known/jwks.json`
  }),
  algorithms: ['ES256'], 
  issuer: `${process.env.SUPABASE_PROJECT_URL}/auth/v1`, 
  audience: 'authenticated'
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

export const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    
    if (!user) {
      // 'info' contains the reason for failure
      console.error("❌ Auth Failed:", info?.message);
      return res.status(401).json({ 
        message: "Unauthorized", 
        reason: info?.message 
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};