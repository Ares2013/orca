const cst = require('./constants')
const isPlainObj = require('is-plain-obj')
const isPositiveNumeric = require('../../util/is-positive-numeric')
const isNonEmptyString = require('../../util/is-non-empty-string')

/** plotly-graph parse
 *
 * @param {object} body : JSON-parsed request body
 *  - figure
 *  - format
 *  - scale
 *  - width
 *  - height
 *  - encoded
 *  - fid (figure id)
 * 0r:
 *  - data
 *  - layout
 * @param {object} _opts : component options
 *  - format
 *  - scale
 *  - width
 *  - height
 * @param {function} sendToRenderer
 *  - errorCode
 *  - result
 */
function parse (body, _opts, sendToRenderer) {
  const result = {}

  const errorOut = (code, extra) => {
    result.msg = `${cst.statusMsg[code]} (${extra})`
    sendToRenderer(code, result)
  }

  let figure
  let opts

  // to support both 'serve' requests (figure/format/../)
  // and 'run' body (data/layout) structures
  if (body.figure) {
    figure = body.figure
    opts = body
  } else {
    figure = body
    opts = _opts
  }

  result.scale = isPositiveNumeric(opts.scale) ? Number(opts.scale) : cst.dflt.scale
  result.fid = isNonEmptyString(opts.fid) ? opts.fid : null
  result.encoded = !!opts.encoded

  if (isNonEmptyString(opts.format)) {
    if (cst.contentFormat[opts.format]) {
      result.format = opts.format
    } else {
      return errorOut(400, 'wrong format')
    }
  } else {
    result.format = cst.dflt.format
  }

  if (!isPlainObj(figure)) {
    return errorOut(400, 'non-object figure')
  }

  if (!figure.data && !figure.layout) {
    return errorOut(400, 'no \'data\' and no \'layout\' in figure')
  }

  result.figure = {}

  if ('data' in figure) {
    if (Array.isArray(figure.data)) {
      result.figure.data = figure.data
    } else {
      return errorOut(400, 'non-array figure data')
    }
  } else {
    result.figure.data = []
  }

  if ('layout' in figure) {
    if (isPlainObj(figure.layout)) {
      result.figure.layout = figure.layout
    } else {
      return errorOut(400, 'non-object figure layout')
    }
  } else {
    result.figure.layout = {}
  }

  result.width = parseDim(result, opts, 'width')
  result.height = parseDim(result, opts, 'height')

  if (willFigureHang(result)) {
    return errorOut(400, 'figure data is likely to make exporter hang, rejecting request')
  }

  sendToRenderer(null, result)
}

function parseDim (result, opts, dim) {
  const layout = result.figure.layout

  if (isPositiveNumeric(opts[dim])) {
    return Number(opts[dim])
  } else if (isPositiveNumeric(layout[dim]) && !layout.autosize) {
    return Number(layout[dim])
  } else {
    return cst.dflt[dim]
  }
}

function willFigureHang (result) {
  const data = result.figure.data

  // cap the number of traces
  if (data.length > 200) {
    return true
  }

  let maxPtBudget = 0

  for (let i = 0; i < data.length; i++) {
    const trace = data[i] || {}
    const type = trace.type || 'scatter'
    const len = estimateDataLength(trace)

    // cap the number of points using a budget
    maxPtBudget += len / maxPtsPerTraceType(type)
    if (maxPtBudget > 1) return true

    // other special cases

    // box with boxpoints: 'all'
    if (
      type === 'box' &&
      trace.boxpoints === 'all' &&
      len > 5e4
    ) {
      return true
    }

    // violin with points: 'all'
    if (
      type === 'violin' &&
      trace.points === 'all' &&
      len > 5e4
    ) {
      return true
    }

    // mesh3d will `alphahull` and 1000+ pts
    if (
      type === 'mesh3d' &&
      'alphahull' in trace && Number(trace.alphahull) >= 0 &&
      len > 1000
    ) {
      return true
    }
  }
}

// Consider the array of maximum length as a proxy to determine
// the number of points to be drawn. In general, this estimate
// can be (much) smaller than the true number of points plotted
// when it does not match the length of the other coordinate arrays.
function findMaxArrayLength (cont) {
  const arrays = Object.keys(cont)
    .filter(k => Array.isArray(cont[k]))
    .map(k => cont[k])

  const lengths = arrays.map(arr => {
    const innerArrays = arr.filter(Array.isArray)

    if (innerArrays.length) {
      return innerArrays
        .map(a => a.length)
        .reduce((a, v) => a + v)
    } else {
      return arr.length
    }
  })

  return arrays.length ? Math.max(...lengths) : 0
}

function estimateDataLength (trace) {
  // special case for e.g. parcoords and splom traces
  if (Array.isArray(trace.dimensions)) {
    return trace.dimensions
      .map(findMaxArrayLength)
      .reduce((a, v) => a + v)
  }

  return findMaxArrayLength(trace)
}

function maxPtsPerTraceType (type) {
  switch (type) {
    case 'scattergl':
    case 'splom':
    case 'pointcloud':
      return 1e7

    case 'scatterpolargl':
    case 'heatmap':
    case 'heatmapgl':
      return 1e6

    case 'scatter3d':
    case 'surface':
    case 'mesh3d':
      return 5e5

    case 'parcoords':
      return 5e5
    case 'scattermapbox':
      return 5e5

    case 'histogram':
    case 'histogram2d':
    case 'histogram2dcontour':
    case 'box':
    case 'violin':
      return 1e6

    default:
      return 5e4
  }
}

module.exports = parse
