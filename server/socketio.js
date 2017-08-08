import jwt from 'jsonwebtoken'
import http from 'http'
import socketio from 'socket.io'
import graphql from './graphql'
import config from '../config'
import { ERROR, NO_AUTH } from '../client/store/types'

const verifyToken = token => {
  if (!token) {
    return false
  }
  try {
    const user = jwt.verify(token, config.jwtSecret)
    if (user.exp * 1000 < Date.now()) {
      return false
    }
  } catch (e) {
    return false
  }
  return true
}

export default function socketIO (app) {
  const server = http.Server(app)
  const io = socketio(server, {
    path: '/graphql',
    transports: [
      'websocket',
      'polling'
    ]
  })

  io.on('connection', socket => {
    // console.log(socket.id)
    const { token } = socket.handshake.query
    if (!verifyToken(token)) {
      socket.emit('vuex', {
        type: NO_AUTH,
        data: null,
      })
      return socket.disconnect()
    }
    socket.on('join', room => {
      socket.join(room)
    })
    socket.on('leave', room => {
      socket.leave(room)
    })
    socket.on('query', (...args) => {
      const [query] = args
      let callback = args[args.length - 1]
      callback = typeof callback === 'function' ? callback : false
      graphql(query).then(data => {
        if (callback) {
          callback(data)
        } else {
          // 'vuex' event for vuex on client to commit the data
          socket.emit('vuex', data)
        }
        // if has rooms, broadcast to every room
        if (data.room) {
          socket.to(data.room).emit('vuex', data)
        }
      }).catch(error => {
        socket.emit('vuex', {
          type: ERROR,
          error
        })
      })
    })
  })
  return server
}
