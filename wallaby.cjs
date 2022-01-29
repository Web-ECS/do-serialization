module.exports = function (wallaby) {
  return {
    files: [
      'package.json',
      'src/**/*.js',
    ],

    tests: [
      'test/**/*.test.js'
    ],
    env: {
      type: 'node'
    },
    workers: { restart: true }
  };
};