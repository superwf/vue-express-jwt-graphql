import jsonwebtoken from 'jsonwebtoken'
import jwt from 'express-jwt'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import config from '../config'

/* @param Object express instance
 * */
export default function jwtApp (app) {
  app.use(bodyParser.json())
  app.use(cookieParser())
  app.post(
    '/login',
    function (req, res) {
      const { user, password } = req.body
      const token = jsonwebtoken.sign({ user }, config.dev.secret, {
        expiresIn: '1d'
      })
      res.json({
        user,
        token
      })
    }
  )
  app.use(
    '/dashboard',
    jwt({
      secret: config.dev.secret
    }),
    function (req, res) {
      res.json(req.user)
    }
  )
  app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      res.status(401).send('no auth')
    } else {
      next()
    }
  })
}