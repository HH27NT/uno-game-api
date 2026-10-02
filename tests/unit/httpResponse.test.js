// prueba el ayudante sendResult que usan los controllers
const { sendResult } = require('../../src/utils/httpResponse');
const Result = require('../../src/utils/result');

const fakeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('sendResult', () => {
  test('manda el status pedido y el value en json cuando el result esta ok', () => {
    const res = fakeRes();
    sendResult(res, Result.ok({ a: 1 }), 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ a: 1 });
  });

  test('usa 200 como status por default', () => {
    const res = fakeRes();
    sendResult(res, Result.ok('x'));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('manda el status y mensaje del error si el result fallo', () => {
    const res = fakeRes();
    sendResult(res, Result.fail('no existe', 404));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'no existe' });
  });
});
