const isPlainObj = require('is-plain-obj')
const isNonEmptyString = require('../../util/is-non-empty-string')

/**
 * @param {object} body : JSON-parsed request body
 *  - layout:
 *    - type
 *    - direction
 *    - first, second:
 *      - boxType
 *      - figure
 *  - settings:
 *    - backgroundColor
 * @param {object} opts : component options
 * @param {function} sendToRenderer
 * - errorCode
 * - result
 */
function parse (body, opts, sendToRenderer) {
  const result = {}

  const errorOut = (code) => {
    result.msg = 'invalid body'
    sendToRenderer(code, result)
  }

  result.fid = isNonEmptyString(body.fid) ? body.fid : null

  const layout = body.layout
  result.panels = []

  const parseFromType = (cont) => {
    switch (cont.type) {
      case 'split':
        parseFromType(cont.first)
        parseFromType(cont.second)
        break
      case 'box':
        parseFromBoxType(cont)
        break
    }
  }

  const parseFromBoxType = (cont) => {
    let figure

    switch (cont.boxType) {
      case 'plot':
        figure = {
          data: cont.figure.data || [],
          layout: cont.figure.layout || {}
        }
        break

      case 'text':
        figure = {
          data: [],
          layout: {}
        }

        figure.annotations = [{
          text: cont.text.substr(50)
        }]
        break

      default:
        figure = {
          data: [],
          layout: {}
        }
        break
    }

    result.panels.push(figure)
  }

  if (isPlainObj(layout)) {
    parseFromType(layout)
  } else {
    return errorOut(400)
  }

  const settings = body.settings

  if (isPlainObj(settings) && isNonEmptyString(settings.backgroundColor)) {
    result.backgroundColor = settings.backgroundColor
  } else {
    result.backgroundColor = '#fff'
  }

  result.width = body.width || 800
  result.height = body.height || 600

  sendToRenderer(null, result)
}

module.exports = parse
