const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const sinon = require('sinon')

const paths = {}
const urls = {}
const mocks = {}

paths.root = path.join(__dirname, '..')
paths.build = path.join(paths.root, 'build')
paths.bin = path.join(paths.root, 'bin')
paths.batik = process.env.BATIK_RASTERIZER_PATH || path.join(paths.build, 'batik-1.7', 'batik-rasterizer.jar')
paths.readme = path.join(paths.root, 'README.md')
paths.pkg = path.join(paths.root, 'package.json')
paths.glob = path.join(paths.root, 'src', 'util', '*')

urls.dummy = 'http://dummy.url'
urls.plotlyGraphMock = 'https://raw.githubusercontent.com/plotly/plotly.js/master/test/image/mocks/20.json'

try {
  mocks.svg = fs.readFileSync(path.join(paths.build, 'test-mock.svg'), 'utf-8')
  mocks.pdf = fs.readFileSync(path.join(paths.build, 'test-mock.pdf'))
} catch (e) {}

function createMockWindow (opts = {}) {
  const win = new EventEmitter()
  const webContents = new EventEmitter()

  webContents.printToPDF = sinon.stub()

  Object.assign(win, opts, {
    webContents: webContents,
    loadURL: () => { webContents.emit('did-finish-load') },
    close: sinon.stub()
  })

  return win
}

function stubProp (obj, key, newVal) {
  const oldVal = obj[key]
  obj[key] = newVal
  return () => { obj[key] = oldVal }
}

module.exports = {
  paths: paths,
  urls: urls,
  mocks: mocks,
  createMockWindow: createMockWindow,
  stubProp: stubProp
}
