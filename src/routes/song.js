const express = require('express')
const request = require('request')

// require('request-debug')(request);

const LKV = require('../utils/lkv')

const {httpHeader, AuthKey, playlistUrl, access_token, lyricUrl, nextSongUrl, likeSongUrl, deleteSongUrl, recentPlayedUrl} = require('../config/config')

const app = express()

app.get('/list', function (req, res) {
  let {token} = req.query
  let Authorization = 'Bearer ' + token;
  request.get(playlistUrl, {
    json: true,
    headers: Object.assign({}, httpHeader, {
    Authorization}),
    qs: {
      alt: 'json',
      apikey: AuthKey.apikey,
      app_name: 'radio_iphone',
      channel: 1,
      client: 's:mobile|y:iOS 10.2|f:115|d:' + AuthKey.udid + '|e:iPhone7,1|m:appstore',
      douban_udid: AuthKey.douban_udid,
      formats: 'aac',
      kbps: 128,
      pt: 0.0,
      type: 's',
      udid: AuthKey.udid,
      version: 100
    }
  }).on('error', err => {
    res.status(500).end(err)
  }).on('data', data => {
    try {
      data = JSON.parse(data)
    } catch (err) {}
    res.json(data)
  })
})

app.get('/next', function (req, res) {
  let Authorization
  // access_token && (Authorization = 'Bearer ' + access_token)

  // if (!(req.query && req.query.sid)) {
  //   sid = parseInt(Math.random() * 1000000 + 1000000)
  // } else {
  //   sid = req.query.sid
  // }

  const sid = req.query.sid || '',
        channelId = req.query.channelId || 1,
        bid = LKV.getSync('songBid') || '';

  request.get(nextSongUrl, {
    json: true,
    headers: Object.assign({}, httpHeader, {
      Cookie: `bid=${bid};`
    }),
    qs: {
      'channel': channelId,
      'kbps': 128,
      'client': 's:mainsite|y:3.0',
      'app_name': 'radio_website',
      'version': 100,
      'type': 'n',
      'sid': sid,
      'pt': '',
      'pb': 128,
      'apikey': ''
    }
  }).on('error', err => {
    res.status(500).end(err)
  }).on('response', response => {
    const cookies = response.headers['set-cookie'] || [];
    const bid = getCookieByKey(cookies, 'bid');
    if (bid) {
      LKV.set('songBid', bid);
    }
  }).on('data', data => {
    try {
      data = JSON.parse(data)
      // res.cookie('name', 'tobi', { domain: '.example.com', path: '/admin', secure: true })
    } catch (err) {}

    res.json(data)
  })
})

app.get('/like', function (req, res) {
  let { username } = req.query
  let isLike = req.query.isLike === 'true' ? 'r' : 'u'
  let Authorization = 'Bearer ' + req.query.token
  LKV.get(`${username}_sensitive_info`).then(obj => {
    request.get(likeSongUrl, {
      json: true,
      headers: Object.assign({}, httpHeader, {
      Authorization}, { cookie: `bid=${obj.bid}; flag="ok"; ac=${obj.ac}; dbcl2=${obj.dbcl2}; ck=${obj.ck}` }),
      qs: {
        channel: -10,
        kbps: 192,
        client: 's:mainsite|y:3.0',
        app_name: 'radio_website',
        version: 100,
        type: isLike,
        sid: req.query.sid,
        pt: 949.3770000000001,
        pb: 128,
        apikey: ''
      }
    }).on('data', (data) => {
      data = JSON.parse(data)
      res.json(data)
    })
  })
})

app.get('/delete', function (req, res) {
  LKV.get('username').then(username => {
    LKV.get(username).then(obj => {
      return obj
    }).then((obj) => {
      let Authorization
      access_token && (Authorization = 'Bearer ' + access_token)
      request.get(deleteSongUrl, {
        json: true,
        headers: Object.assign({}, httpHeader, {
        Authorization}, { cookie: `bid=${obj.bid}; flag="ok"; ac=${obj.ac}; dbcl2=${obj.dbcl2}; ck=${obj.ck}` }),
        qs: {
          channel: -10,
          kbps: 192,
          client: 's:mainsite|y:3.0',
          app_name: 'radio_website',
          version: 100,
          type: 'b',
          sid: req.query.sid,
          pt: 949.3770000000001,
          pb: 128,
          apikey: ''
        }
      }).on('data', (data) => {
        data = JSON.parse(data)
        res.json(data)
      })
    })
  })
})

app.get('/recent_played', function (req, res) {
  LKV.get('username').then(username => {
    LKV.get(username).then(obj => {
      return obj
    }).then((obj) => {
      let Authorization
      access_token && (Authorization = 'Bearer ' + access_token)
      request.get(recentPlayedUrl, {
        json: true,
        headers: Object.assign({}, httpHeader, {
        Authorization}, { cookie: `bid=${obj.bid}; flag="ok"; ac=${obj.ac}; dbcl2=${obj.dbcl2}; ck=${obj.ck}` }),
        qs: {
          start: 0,
          limit: 100
        }
      }).on('data', (data) => {
        data = JSON.parse(data)
        res.json(data)
      })
    })
  })
})

app.get('/lyric', function (req, res) {
  if (!req.query || !req.query.sid || !req.query.ssid) {
    res.send({
      code: 0,
      msg: 'Parameters cannot be empty!'
    })
  } else {
    request.get(lyricUrl, {
      json: true,
      headers: httpHeader,
      qs: {
        sid: req.query.sid,
        ssid: req.query.ssid
      }
    }).on('data', (data) => {
      // data = JSON.parse(data)
      // res.json(data)
      data = JSON.parse(data)
      let result = {}

      if (data.lyric == '暂无歌词') {
        result.type = null
      } else {
        let lyricSplit = data.lyric.split('\r\n'),
          lyricList = [],
          timeList = [],
          time = 0,
          timeSplit = []
        lyricSplit.forEach(it => {
          it.replace(/(\[(.+?)\])?(.*)/, (str, $1, $2, $3) => {
            if ($2) {
              timeSplit = $2.split(':')
              time = Number(timeSplit[0] * 60 + Number(timeSplit[1])).toFixed(2)
              timeList.push(Number(time))
              lyricList.push({
                'time': $1,
                'content': $3
              })
            } else {
              lyricList.push({
                'time': null,
                'content': $3
              })
            }
          })
        })
        if (lyricList[0].time) {
          result.type = 'normal'
        } else {
          result.type = 'noTime'
        }
        result.lyricList = lyricList
        result.name = data.name
        result.sid = data.sid
        result.timeList = timeList
      }
      res.json(result)
    })
  }
})

function getCookieByKey (array, key) {
  let obj = {}
  let newArray = []
  array.forEach(it => {
    let newItem = it.split(';')
    newArray = newArray.concat(newItem)
  })
  newArray.forEach(it => {
    let newItem = it.trim().split('=')
    obj[newItem[0]] = newItem[1]
  })
  return obj[key]
}

module.exports = app
