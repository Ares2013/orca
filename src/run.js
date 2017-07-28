const {app, BrowserWindow} = require('electron')
const {ipcMain} = require('electron')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid/v4')
const parallelLimit = require('run-parallel-limit')

const createIndex = require('./util/create-index')
const createTimer = require('./util/create-timer')
const coerceComponent = require('./util/coerce-component')

const PARALLEL_LIMIT_DFLT = 4
const STATUS_MSG = {
  422: 'json parse error',
  500: 'incomplete task(s)'
}

/** Create
 *
 * @param {object} opts
 *   - input
 *   - component
 *   - ...
 *   - debug
 *
 *
 * @return {object} app
 */
function createApp (_opts) {
  const opts = coerceOptions(_opts)

  let win = null

  app.commandLine.appendSwitch('ignore-gpu-blacklist')

  app.on('ready', () => {
    win = new BrowserWindow(opts._browserWindowOpts)

    if (opts.debug) {
      win.openDevTools()
    }

    win.on('closed', () => {
      win = null
    })

    process.on('exit', () => {
      if (win) {
        win.close()
      }
    })

    createIndex(opts, (pathToIndex) => {
      win.loadURL(`file://${pathToIndex}`)
    })

    win.webContents.once('did-finish-load', () => {
      run(app, win, opts)
    })
  })

  return app
}

function coerceOptions (opts) {
  const fullOpts = {}

  fullOpts.debug = !!opts.debug
  fullOpts._browserWindowOpts = {}

  const comp = Array.isArray(opts.component) ? opts.component[0] : opts.component
  const fullComp = coerceComponent(comp)

  if (fullComp) {
    fullOpts.component = fullComp
  } else {
    throw new Error('no valid component registered')
  }

  const input = Array.isArray(opts.input) ? opts.input : [opts.input]
  const fullInput = []

  input.forEach((item) => {
    const matches = glob.sync(item)

    if (matches.length === 0) {
      fullInput.push(item)
    } else {
      fullInput.push(...matches)
    }
  })

  fullOpts.input = fullInput

  return fullOpts
}

function run (app, win, opts) {
  const comp = opts.component
  let pending = opts.input.length

  const emitError = (code, info) => {
    info = info || {}
    info.msg = info.msg || STATUS_MSG[code] || ''

    app.emit('export-error', Object.assign(
      {code: code},
      info
    ))
  }

  const tasks = opts.input.map((item) => (done) => {
    const timer = createTimer()
    const id = uuid()

    // initialize 'full' info object
    //   which accumulates parse, render, convert results
    //   and is emitted on 'export-error' and 'after-export'
    const fullInfo = {
      item: item,
      itemName: path.parse(item).name
    }

    const errorOut = (code) => {
      emitError(code, fullInfo)
      done()
    }

    // setup parse callback
    const sendToRenderer = (errorCode, parseInfo) => {
      Object.assign(fullInfo, parseInfo)

      if (errorCode) {
        return errorOut(errorCode)
      }

      win.webContents.send(comp.name, id, fullInfo, opts)
    }

    // setup convert callback
    const reply = (errorCode, convertInfo) => {
      Object.assign(fullInfo, convertInfo)

      if (errorCode) {
        return errorOut(errorCode)
      }

      fullInfo.pending = --pending
      fullInfo.processingTime = timer.end()

      app.emit('after-export', fullInfo)
      done()
    }

    // parse -> send to renderer!
    getBody(item, (err, _body) => {
      let body

      if (err) {
        return errorOut(422)
      }

      try {
        body = JSON.parse(_body)
      } catch (e) {
        return errorOut(422)
      }

      comp.parse(body, opts, sendToRenderer)
    })

    // convert on render message -> emit 'after-export'
    ipcMain.once(id, (event, errorCode, renderInfo) => {
      Object.assign(fullInfo, renderInfo)

      if (errorCode) {
        return errorOut(errorCode)
      }

      comp.convert(fullInfo, opts, reply)
    })
  })

  parallelLimit(tasks, PARALLEL_LIMIT_DFLT, (err) => {
    if (err || pending !== 0) {
      emitError(500)
    }

    app.emit('done')
    win.close()
  })
}

function getBody (item, cb) {
  // handle read file, wget from url or string logic

  fs.readFile(item, 'utf-8', cb)
}

module.exports = createApp
