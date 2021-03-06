const express = require('express');
const PORT = require('./src/config/config').PORT;
const {user, test, song} = require('./src/routes');

const run = function() {
  const server = express();

  server.use('/user', user);
  server.use('/test', test);
  server.use('/song', song);

  server.listen(PORT, () => {
    console.log(`The server has been set up at 0.0.0.0:${PORT}`);
  });
};

module.exports = run;

if (require.main === module) {
  run();
}
