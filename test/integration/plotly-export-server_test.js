const tap = require('tap')
const Application = require('spectron').Application
const electronPath = require('electron')

const path = require('path')
const request = require('request')

const PORT = 9109
const SERVER_URL = `http://localhost:${PORT}`
const ROOT_PATH = path.join(__dirname, '..', '..')

// TODO
// - how to test events??
//   + https://github.com/electron/spectron#clientgetmainprocesslogs
//   + mock server / runner app to log to file?
// - maybe just firing `plotly-export-server` in a child process would be enough?
//   + I don't see any spectron feature that could be useful to use
//     (they are mostly useful to inspect the app's window)

const app = new Application({
  path: electronPath,
  args: [
    path.join(ROOT_PATH, 'bin', 'plotly-export-server'),
    '--port', PORT,
    '--plotly', path.join(ROOT_PATH, '..', 'plotly.js', 'build', 'plotly.js')
  ]
})

tap.tearDown(() => {
  if (app && app.isRunning()) {
    console.log('teardown, app is still running')
    app.stop()
  }
})

tap.test('should launch', t => {
  app.start().then(() => {
    app.client.getWindowCount().then(cnt => {
      t.equal(cnt, 3)
      t.end()
    })
  })
})

tap.test('should reply pong to ping POST', t => {
  request.post(SERVER_URL + '/ping', (err, res, body) => {
    if (err) t.fail(err)

    t.equal(res.statusCode, 200)
    t.equal(body, 'pong')
    t.end()
  })
})

tap.test('should work for *plotly-graph* component', t => {
  request({
    method: 'POST',
    url: SERVER_URL + '/',
    body: JSON.stringify({
      figure: {
        data: [{y: [1, 2, 1]}]
      }
    })
  }, (err, res, body) => {
    if (err) t.fail(err)

    t.equal(res.statusCode, 200)
    t.end()
  })
})

tap.test('should work for *plotly-thumbnail* component', t => {
  request({
    method: 'POST',
    url: SERVER_URL + '/thumbnail',
    body: JSON.stringify({
      figure: {
        data: [{y: [1, 2, 1]}]
      }
    })
  }, (err, res, body) => {
    if (err) t.fail(err)

    t.equal(res.statusCode, 200)
    t.end()
  })
})

tap.test('should work for *plotly-dashboard* component', {timeout: 1e4}, t => {
  request({
    method: 'POST',
    url: SERVER_URL + '/dashboard',
    body: JSON.stringify({
      fid: 'some-fid',
      url: 'https://plot.ly/dashboard/jackp:17872/embed',
      format: 'pdf'
    })
  }, (err, res, body) => {
    if (err) t.fail(err)

    t.equal(res.statusCode, 200)
    t.end()
  })
})

tap.test('should teardown', t => {
  app.stop().then(t.end)
})
