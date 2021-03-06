import Koa from 'koa';
import next from 'next';
import bodyParser from 'koa-bodyparser';
import cors from 'kcors';
import helmet from 'koa-helmet';
import logger from 'koa-logger';
import getPort from 'get-port';

import * as log from './helpers/log';
import config from '../config/config.global';
// import requestId from './middleware/requestId';
import requestId from 'koa-requestid';
import responseHandler from './middleware/responseHandler';
import router from './routes';
import conf from '../config/next.config.js';

const env:string = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
const dev:boolean = process.env.NODE_ENV !== 'production';

const nextApp = next({
  dev,
  conf,
  dir:'./src'
});

const handle = nextApp.getRequestHandler();
router.ssrCache(nextApp)
router.nextRoute(handle);
const app = new Koa();

!dev ? app.use(logger()) : '';
app.use(bodyParser());
app.use(requestId());
app.use(helmet());
app.use(cors({
  exposeHeaders: ['X-Request-Id']
}));
app.use(responseHandler());

if (!module.parent) {
  nextApp.prepare()
    .then(() => {
      app.use(router.routes());
      app.use(router.allowedMethods());
      (async () => {
          let port = await getPort({port: [config[env].port, 3000, 3001, 3002]})
          app.listen(port, config[env].host, () => {
            log.info(`API server listening on ${config[env].host}:${port}, in ${env}`);
          });
      })();
    });
} else {
  // test
  app.use(router.routes());
  app.use(router.allowedMethods());
}
app.on('error', err => log.error(`Unhandled exception occured. message: ${err.message}`));

export default app;
