import MiniApp from '../../src/utils/miniApp';
import generateAction from '../../src/utils/generateAction';
import {fromJS} from 'immutable';
const key = 'posts';
const componentId = 'posts';
const context = {
  response: {
    body: fromJS([])
  },
  request: {
    type: 'fetch',
    key,
    componentId
  }
};
const fetchFn = jest.fn();
const fetch = (...args) => {
  fetchFn(...args);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(context);
    }, 400);
  });
};
const requestFn = jest.fn();
const request = (...args) => {
  requestFn(...args);
  return Promise.resolve();
};

const app = new MiniApp({
  fetch,
  request
});

describe('minapp', () => {
  it('fetch should call fetch', () => {
    const args = [key, componentId, {}];
    return app.fetch(...args).then(ctx => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(fetchFn).toBeCalledWith(...args);
      expect(ctx).toEqual(context);
    });
  });

  it('subscribe data', () => {
    return app.subscribe(key, componentId, 'value', value => {
      expect(value.toJS()).toEqual([]);
    }).then(sub => {
      sub.unsubscribe();
    });
  });

  it('request change data', () => {
    const createAction = generateAction('posts', 'create', fromJS({_id: '1', test: 123}), fromJS([]));
    app.request(createAction);
    return app.subscribe(key, componentId, 'value', value => {
      expect(value.toJS()[0]).toMatchObject({test: 123});
    });
  });

  it('deploy should request', () => {
    return app.deploy().then(() => {
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });
});
