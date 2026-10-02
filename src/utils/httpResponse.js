const sendResult = (res, resultado, okStatus = 200) =>
  resultado.match({
    ok: (value) => res.status(okStatus).json(value),
    fail: ({ message, status }) => res.status(status).json({ error: message }),
  });

module.exports = { sendResult };
