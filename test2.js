var fs = require ('fs')
  , JSONStream = require('JSONStream')
  , es = require('event-stream')
  , pending = 10
  , passed = true

  function randomObj () {
    return (
      Math.random () < 0.4
      ? {hello: 'eonuhckmqjk',
          whatever: 236515,
          lies: true,
          nothing: [null],
          stuff: [Math.random(),Math.random(),Math.random()]
        } 
      : ['AOREC', 'reoubaor', {ouec: 62642}, [[[], {}, 53]]]
    )
  }

  var expected =  {}
    , stringify = JSONStream.stringifyObject()
    
  es.connect(
    stringify,
    es.writeArray(function (err, lines) {
      console.log(lines);
    })
  )

    var key = Math.random().toString(16).slice(2)
    expected[key] = randomObj()
    stringify.write([ key, expected[key] ])

  process.nextTick(function () {
    stringify.end()
  })
