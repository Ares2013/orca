const tap = require('tap')

const _module = require('../../src/component/plotly-graph')
const { paths } = require('../common')
// TODO
// + figure out best way to test `render` in isolation (maybe jsdom?)
// + maybe using https://github.com/electron/spectron#webcontents ??

tap.test('inject:', t => {
  const fn = _module.inject

  t.test('should fill in defaults', t => {
    const out = fn()

    t.same(out, ['<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>'])
    t.end()
  })

  t.test('should add mathjax script if given with config options', t => {
    const out = fn({mathjax: 'http://dummy.url'})

    t.same(out, [
      '<script src="http://dummy.url?config=TeX-AMS-MML_SVG"></script>',
      '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>'
    ])
    t.end()
  })

  t.test('should add topojson script if given', t => {
    const out = fn({topojson: 'http://dummy.url'})

    t.same(out, [
      '<script src="http://dummy.url"></script>',
      '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>'
    ])
    t.end()
  })

  t.test('should accept plotly.js version to be specify via semver', t => {
    const _fn = (arg, src) => {
      t.same(fn({plotlyJS: arg}), [`<script src="https://cdn.plot.ly/plotly-${src}.min.js"></script>`])
    }

    _fn('v1.20.0', '1.20.0')
    _fn('1.25.0', '1.25.0')
    _fn('latest', 'latest')
    t.end()
  })

  t.test('should accept plotly.js version to be specify via url', t => {
    const out = fn({plotlyJS: 'http://dummy.url'})

    t.same(out, ['<script src="http://dummy.url"></script>'])
    t.end()
  })

  t.test('should accept path to plotly.js bundle', t => {
    const out = fn({plotlyJS: paths.readme})

    t.match(out[0], /README.md/)
    t.end()
  })

  t.test('should throw when given plotly.js argument is invalid', t => {
    t.throws(() => fn({plotlyJS: 'not gonna work'}))
    t.end()
  })

  t.test('should throw when given mathjax argument is invalid', t => {
    t.throws(() => fn({mathjax: 'not gonna work'}))
    t.end()
  })

  t.test('should throw when given topojson argument is invalid', t => {
    t.throws(() => fn({topojson: 'not gonna work'}))
    t.end()
  })

  t.end()
})

tap.test('parse:', t => {
  const fn = _module.parse

  t.test('should fill in defaults', t => {
    const body = {
      figure: {
        data: [{y: [1, 2, 1]}]
      }
    }

    fn(body, {}, (errorCode, result) => {
      t.equal(errorCode, null, 'code')
      t.same(result, {
        figure: {
          data: [{y: [1, 2, 1]}],
          layout: {}
        },
        format: 'png',
        scale: 1,
        width: 700,
        height: 500,
        encoded: false,
        fid: null
      }, 'result')

      t.end()
    })
  })

  t.test('parsing *format*', t => {
    const shouldPass = ['png', 'webp', 'svg', 'jpeg']
    const shouldFail = ['not gonna work', 'too one too', 'jpg', 'JPEG']
    const shouldDflt = ['', null, undefined, [], {}]

    const _fn = (d, cb) => {
      const body = {
        format: d,
        figure: {data: [{y: [1, 2, 1]}]}
      }
      fn(body, {}, cb)
    }

    shouldPass.forEach(d => {
      t.test(`should accept ${d}`, t => {
        _fn(d, (errorCode, result) => {
          t.equal(errorCode, null, 'code')
          t.equal(result.format, d, 'format')
          t.end()
        })
      })
    })

    shouldFail.forEach(d => {
      t.test(`should error for ${d}`, t => {
        _fn(d, (errorCode, result) => {
          t.equal(errorCode, 400, 'code')
          t.equal(result.msg, 'invalid or malformed request syntax (wrong format)', 'msg')
          t.end()
        })
      })
    })

    shouldDflt.forEach(d => {
      t.test(`should fallback to default for ${d}`, t => {
        _fn(d, (errorCode, result) => {
          t.equal(errorCode, null, 'code')
          t.equal(result.format, 'png', 'format')
          t.end()
        })
      })
    })

    t.end()
  })

  t.test('parsing *figure*', t => {
    const shouldFail = [
      {}, [], 123, '', {nodata: [], nolayout: {}}
    ]

    shouldFail.forEach(d => {
      t.test(`should error for ${JSON.stringify(d)}`, t => {
        fn({figure: d}, {}, (errorCode, result) => {
          t.equal(errorCode, 400)
          t.end()
        })
      })
    })

    t.end()
  })

  t.test('parsing *data*', t => {
    t.test('should default to empty array if not set', t => {
      const body = {
        figure: {layout: {}}
      }
      fn(body, {}, (errorCode, result) => {
        t.equal(errorCode, null, 'code')
        t.same(result.figure.data, [], 'result')
        t.end()
      })
    })

    const shouldFail = [{}, null, 2130, false, 0]

    shouldFail.forEach(d => {
      t.test(`should error for ${JSON.stringify(d)}`, t => {
        const body = {
          figure: {data: d, layout: {}}
        }
        fn(body, {}, (errorCode, result) => {
          t.equal(errorCode, 400, 'code')
          t.equal(result.msg, 'invalid or malformed request syntax (non-array figure data)', 'msg')
          t.end()
        })
      })
    })

    t.end()
  })

  t.test('parsing *layout*', t => {
    t.test('should default to empty object if not set', t => {
      const body = {
        figure: {data: []}
      }
      fn(body, {}, (errorCode, result) => {
        t.equal(errorCode, null, 'code')
        t.same(result.figure.layout, {}, 'result')
        t.end()
      })
    })

    const shouldFail = [[], null, 2130, false, 0]

    shouldFail.forEach(d => {
      t.test(`should error for ${JSON.stringify(d)}`, t => {
        const body = {
          figure: {data: [], layout: d}
        }
        fn(body, {}, (errorCode, result) => {
          t.equal(errorCode, 400, 'code')
          t.equal(result.msg, 'invalid or malformed request syntax (non-object figure layout)', 'msg')
          t.end()
        })
      })
    })

    t.end()
  })

  t.test('parsing *width* and *height*', t => {
    const keys = ['width', 'height']
    const shouldPass = [200, 130, '40']
    const shouldFail = [undefined, '', -12, null, false]

    keys.forEach(k => {
      const dflt = {width: 700, height: 500}[k]

      shouldPass.forEach(d => {
        t.test(`should accept ${d}`, t => {
          const body = {figure: {data: []}}
          body[k] = d

          fn(body, {}, (errorCode, result) => {
            t.equal(errorCode, null, 'code')
            t.equal(result[k], Number(d), 'result')
            t.end()
          })
        })
      })

      shouldFail.forEach(d => {
        t.test(`should fallback to layout ${k} for ${d}`, t => {
          const body = {figure: {data: [], layout: {}}}
          body[k] = d
          body.figure.layout[k] = 1000

          fn(body, {}, (errorCode, result) => {
            t.equal(errorCode, null, 'code')
            t.equal(result[k], 1000, 'result')
            t.end()
          })
        })

        t.test(`should fallback to dflt for ${d} with invalid layout ${k}`, t => {
          const body = {figure: {data: [], layout: {}}}
          body[k] = d
          body.figure.layout[k] = d

          fn(body, {}, (errorCode, result) => {
            t.equal(errorCode, null, 'code')
            t.equal(result[k], dflt, 'result')
            t.end()
          })
        })
      })
    })

    t.end()
  })

  t.test('should work with component options too', t => {
    const body = {
      data: [{y: [1, 2, 1]}],
      layout: {height: 200}
    }

    const opts = {
      format: 'svg',
      scale: 2,
      fid: 'my-graph',
      width: 1000
    }

    fn(body, opts, (errorCode, result) => {
      t.equal(errorCode, null, 'code')
      t.same(result, {
        figure: {
          data: [{y: [1, 2, 1]}],
          layout: {height: 200}
        },
        format: 'svg',
        scale: 2,
        width: 1000,
        height: 200,
        encoded: false,
        fid: 'my-graph'
      }, 'result')
      t.end()
    })
  })

  t.end()
})

tap.test('convert:', t => {
  const fn = _module.convert

  t.test('should convert image data to buffer', t => {
    const formats = ['png', 'webp', 'jpeg']

    formats.forEach(f => {
      t.test(`for format ${f}`, t => {
        fn({imgData: 'asdfDFDASFsafadsf', format: f}, {}, (errorCode, result) => {
          t.equal(errorCode, null)
          t.equal(result.head['Content-Type'], `image/${f}`)
          t.type(result.body, Buffer)
          t.type(result.bodyLength, 'number')
          t.end()
        })
      })
    })

    t.end()
  })

  t.test('should pass svg image data', t => {
    fn({imgData: '<svg></svg>', format: 'svg'}, {}, (errorCode, result) => {
      t.equal(errorCode, null)
      t.equal(result.head['Content-Type'], 'image/svg+xml')
      t.equal(result.body, '<svg></svg>')
      t.equal(result.bodyLength, 11)
      t.end()
    })
  })

  t.end()
})
