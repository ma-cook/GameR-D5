import fs from 'fs'
import express from 'express'
import Router from 'express-promise-router'
import { createServer } from 'vite'
import viteConfig from './vite.config.js'
import geckos from '@geckos.io/server'
import http from 'http'

// Create router
const router = Router()
const playerPositions = {}
// Create vite front end dev server
const vite = await createServer({
  configFile: false,
  server: {
    middlewareMode: 'html'
  },
  ...viteConfig
})

// Main route serves the index HTML
router.get('/', (req, res, next) => {
  fs.readFile('./public/index.html', 'utf-8', (err, html) => {
    if (err) {
      console.error(err)
      return
    }
    vite.transformIndexHtml(req.url, html).then((transformedHtml) => {
      res.send(transformedHtml)
    })
  })
})

// Use vite middleware so it rebuilds frontend
router.use(vite.middlewares)

// Everything else that's not index 404s
router.use('*', (req, res) => {
  res.status(404).send({ message: 'Not Found' })
})

// Create express app and listen on port 4444
const app = express()
app.use(router)
const server = http.createServer(app)
const io = geckos()

io.addServer(server)

let clients = {}
let gameState = {}

// Socket app msgs
io.onConnection((channel) => {
  console.log(`User ${channel.id} connected`)

  //Add a new client indexed by his id
  gameState[channel.id] = {
    id: channel.id,
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    torsoRotation: [0, 0, 0]
  }

  io.emit('gameState', gameState) // Emit the 'gameState' event with the clients object

  channel.on('move', (playerData) => {
    const { id, position, rotation, torsoRotation, time } = playerData
    // Store the new position, rotation,  torsoRotation and time
    if (!playerPositions[id]) {
      playerPositions[id] = []
    }
    playerPositions[id].push({ position, rotation, torsoRotation, time }) // Store the data together

    // Only keep the last few positions
    if (playerPositions[id].length > 6) {
      playerPositions[id].shift()
    }
  })

  setInterval(() => {
    for (const id in playerPositions) {
      const positions = playerPositions[id].map((p) => p.position) // Extract the positions
      const rotations = playerPositions[id].map((p) => p.rotation) // Extract the rotations

      const torsoRotations = playerPositions[id].map((p) => p.torsoRotation) // Extract the torsoRotations

      // Calculate interpolated position, rotation, torsoPosition, and torsoRotation
      const interpolatedPosition = interpolate(positions)
      const interpolatedRotation = interpolate(rotations)

      const interpolatedTorsoRotation = interpolate(torsoRotations)
      if (gameState[id]) {
        gameState[id].position = interpolatedPosition
        gameState[id].rotation = interpolatedRotation

        gameState[id].torsoRotation = interpolatedTorsoRotation
        gameState[id].time = playerPositions[id][playerPositions[id].length - 1].time
      }
    }

    io.emit('gameState', gameState) // Emit to all connected clients
  }, 100 / 100)

  channel.on('laser', (laserData) => {
    io.emit('laser', laserData)
  })

  channel.onDisconnect(() => {
    console.log(`User ${channel.id} disconnected`)

    //Delete this client from the object
    delete gameState[channel.id]

    io.emit('move', clients)
  })
})

server.listen(process.env.PORT || 4444, () => {
  console.log(`Listening on port http://localhost:4444...`)
})

function interpolate(positions) {
  const len = positions.length

  if (len < 30) {
    // If there are not enough positions to interpolate, return the last position or a default position
    return positions[len - 1]
  }

  const lastPosition = positions[len - 1]
  const secondLastPosition = positions[len - 2]

  return [(lastPosition[0] + secondLastPosition[0]) / 2, (lastPosition[1] + secondLastPosition[1]) / 2, (lastPosition[2] + secondLastPosition[2]) / 2]
}
