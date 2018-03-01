import App from '../src/app';
import {Bucket, Cache, Fetcher, Store} from '../src/middleware';
import ChangeAdaptor from '../src/changeAdaptor';
import Endpoint from '../src/endpoint/localstorage';
import {fromJS} from 'immutable';

const schema = {
  posts: {
    type: "array",
    items: {
      type: "object",
      items: {
        title: {
          type: "string"
        },
        content: {
          type: "string"
        }
      }
    }
  }
};
const endpoint = new Endpoint({schema});
const changeAdaptor = new ChangeAdaptor({});
const bucket = new Bucket();
const cache = new Cache();
const store = new Store();
const endpointMiddleware = new Fetcher();

describe('app', () => {
  it('should be return context finally', () => {
    const app = new App();
    app.use({handleChange: function(ctx, next) {
      ctx.body = {test: 'good'};
      return next();
    }});
    app.handleChange({
      request: {
        type: 'hi'
      }
    }).then(ctx => {
      expect(ctx.body).toEqual({test: 'good'});
    });
  });

  it('middleware next worked', () => {
    const app = new App();
    const newData = {test: 'new'};
    const oldData = {test: 'old'};
    app.use({handleChange: function(ctx, next) {
      ctx.body = oldData;
      return next();
    }});
    app.use({handleChange: function(ctx, next) {
      expect(ctx.body).toEqual(oldData);
      ctx.body = newData;
      return next();
    }});
    app.handleChange({})
      .then(ctx => {
        expect(ctx.body).toEqual(newData);
      });
  });

  it('middleware can get next().then', () => {
    const app = new App();
    const newData = {test: 'new'};
    const oldData = {test: 'old'};
    app.use({handleChange: function(ctx, next) {
      ctx.body = oldData;
      return next().then(data => {
        ctx.body = data;
      });
    }});
    app.use({handleChange: function(ctx) {
      expect(ctx.body).toEqual(oldData);
      return Promise.resolve(newData);
    }});
    app.handleChange({})
      .then(ctx => {
        expect(ctx.body).toEqual(newData);
      });
  });

  it('with middleware', () => {
    const fetchRequest = {
      type: 'fetch',
      key: 'posts',
      dataType: 'array'
    };
    const deployRequest = {
      type: 'deploy'
    };
    const writeRequest = {
      type: 'write',
      key: 'posts',
      dataType: 'array',
      action: changeAdaptor.createAction({
        id: 'posts/0',
        type: 'create',
        dataType: 'collection',
        value: fromJS({title: 'new posts', content: 'new content'}),
        endpoint
      })
    };
    const app = new App()
      .use(store)
      .use(bucket)
      .use(cache)
      .use(endpointMiddleware);
    return app.handleChange({request: fetchRequest})
      .then(ctx => {
        expect(ctx.body.getValue()).toEqual(0);
        return app.handleChange({request: writeRequest});
      })
      .then(() => {
        expect(bucket._mergeActions().length).toEqual(1);
        return app.handleChange({request: deployRequest});
      })
      .then(ctx => {
        expect(ctx.body.getValue()[0][0]).toMatchObject({
          title: 'new posts', content: 'new content'
        });
      });
  });
});
