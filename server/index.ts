import 'module-alias/register';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import passport from 'passport';
import bodyParser from 'body-parser';
import session from 'express-session';
import nextjs from 'server/lib/next';
import PagesRouter from 'server/routers/pages';
import GraphqlRouter from 'server/routers/graphql';
import auth from 'server/routers/auth';

dotenv.config();

import { db } from './lib/db';

const SequelizeStore = require('connect-session-sequelize')(session.Store);

if (!process.env.SESSION_SECRET) {
  throw new Error('expected secret');
}

const sessionSecret: string = process.env.SESSION_SECRET;

const store = new SequelizeStore({
  db,
});

const app: express.Application = express();

nextjs.nextApp.prepare().then(async () => {
  await db.authenticate();
  console.log('connected to db'); // tslint:disable-line no-console

  const port = process.env.PORT || 8000;

  app.use(
    morgan(':method :url :status', {
      skip: (req: express.Request) => req.url.startsWith('/_next/'),
    }),
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: sessionSecret,
      store,
    }),
  );
  app.use(express.static('public'));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err) {
        req.logout();
        return res.redirect('/');
      }

      next();
    },
  );

  app.use(auth());
  app.use(PagesRouter);
  app.use(GraphqlRouter);

  store.sync();

  app.get('*', (req, res) => {
    nextjs.handle(req, res);
  });

  app.listen(port, () => {
    console.log(`\n\nstarted on port ${port}\n\n`); // tslint:disable-line no-console
  });
});
