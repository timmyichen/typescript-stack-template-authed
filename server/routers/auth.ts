import express from 'express';
import bluebird from 'bluebird';
import asyncRouter from 'express-router-async';
import passport from 'passport';
import passportLocal from 'passport-local';
import camelize from 'camelize';
import validator from 'validator';
import { Users } from 'server/models';
const bcrypt = bluebird.promisifyAll(require('bcrypt-nodejs'));

function init() {
  const LocalStrategy = passportLocal.Strategy;

  passport.use(
    'local-login',
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      let promise: Promise<Users>;
      if (validator.isEmail(email)) {
        promise = Users.findOne({
          where: {
            email: email.toLowerCase(),
          },
        });
      } else {
        promise = Users.findOne({
          where: {
            username: email.toLowerCase(),
          },
        });
      }

      promise
        .then((user: any) => {
          if (!user) {
            return done(null, false, { message: 'Login failed' });
          }

          bcrypt
            .compareAsync(password, user.password)
            .then((isValid: boolean) => {
              if (!isValid) {
                return done(null, false, { message: 'Login failed' });
              }

              return done(null, user);
            })
            .catch((e: any) => {
              done(e);
            });
        })
        .catch((e: any) => {
          done(e);
        });
    }),
  );

  passport.use(
    'local-signup',
    new LocalStrategy(
      {
        usernameField: 'email',
        passReqToCallback: true,
      },
      async (
        req: express.Request,
        email: string,
        password: string,
        done: any,
      ) => {
        const { username } = req.body;

        if (!email || !password || !username) {
          return done(null, false, { message: 'missing required field' });
        }

        bcrypt
          .genSaltAsync(10)
          .then((salt: string) => {
            return bcrypt.hashAsync(password, salt, null);
          })
          .then((hash: string) => {
            return Users.create({
              username: username.toLowerCase(),
              email: email.toLowerCase(),
              password: hash,
            });
          })
          .then((user: any) => {
            return done(null, user);
          })
          .catch((e: any) => {
            if (e.name === 'SequelizeUniqueConstraintError') {
              return done(null, false, {
                message: 'A user with that email or username exists.',
              });
            } else if (e.name === 'SequelizeValidationError') {
              return done(null, false, {
                message: 'Validation failed',
              });
            }

            done(e);
          });
      },
    ),
  );

  passport.serializeUser<any, any>((user, cb) => {
    cb(undefined, user.id);
  });

  passport.deserializeUser((id: number, done) => {
    Users.findOne({ where: { id } })
      .then((user: any) => {
        const withoutPw = { ...user.get({ simple: true }) };
        if (withoutPw.password) {
          delete withoutPw.password;
        }
        done(null, withoutPw);
      })
      .catch((err: Error) => {
        return done(err);
      });
  });

  const router = asyncRouter();

  router.post(
    '/login',
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      passport.authenticate(
        'local-login',
        {
          session: true,
          failWithError: true,
        },
        (err, user, info) => {
          if (err) {
            // this should never happen
            throw new Error(err.message);
          }

          if (!user) {
            return res.status(400).json({ success: false, ...info });
          }

          req.login(user, err => {
            if (err) {
              return res.status(500).send('Unknown error in auth');
            }

            return res.json({ success: true });
          });
        },
      )(req, res, next);
    },
  );

  router.post(
    '/signup',
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      passport.authenticate(
        'local-signup',
        {
          session: true,
          failWithError: true,
        },
        (err, user, info) => {
          if (err) {
            // this should never happen
            throw new Error(err.message);
          }

          if (!user) {
            return res.status(400).json({ success: false, ...info });
          }

          req.login(user, err => {
            if (err) {
              return res.status(500).send('Unknown error in auth');
            }

            return res.json({ success: true });
          });
        },
      )(req, res, next);
    },
  );

  router.get('/logout', (req: express.Request, res: express.Response) => {
    req.logout();
    res.redirect('/');
  });

  router.get(
    '/data/user_info',
    (req: express.Request, res: express.Response) => {
      res.json(camelize(req.user || { error: 'not logged in' }));
    },
  );

  return router;
}

export default init;
