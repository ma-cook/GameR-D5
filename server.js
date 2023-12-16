import fs from 'fs'
import express from 'express'
import Router from 'express-promise-router'
import { createServer } from 'vite'
import viteConfig from './vite.config.js'
import { Server } from 'socket.io'

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
router.get('/', async (req, res, next) => {
  let html = fs.readFileSync('./public/index.html', 'utf-8')
  html = await vite.transformIndexHtml(req.url, html)
  res.send(html)
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
const server = app.listen(process.env.PORT || 4444, () => {
  console.log(`Listening on port http://localhost:4444...`)
})

const ioServer = new Server(server)

let clients = {}
let gameState = {}

// Socket app msgs
ioServer.on('connection', (client) => {
  console.log(`User ${client.id} connected, there are currently ${ioServer.engine.clientsCount} users connected`)

  //Add a new client indexed by his id
  gameState[client.id] = {
    id: client.id,
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    torsoPosition: [0, 1, 0],
    torsoRotation: [0, 0, 0]
  }

  ioServer.sockets.emit('gameState', gameState) // Emit the 'gameState' event with the clients object

  client.on('move', (playerData) => {
    const { id, position, rotation, torsoPosition, torsoRotation, time } = playerData
    // Store the new position, rotation, torsoPosition, torsoRotation and time
    if (!playerPositions[id]) {
      playerPositions[id] = []
    }
    playerPositions[id].push({ position, rotation, torsoPosition, torsoRotation, time }) // Store the data together

    // Only keep the last few positions
    if (playerPositions[id].length > 10) {
      playerPositions[id].shift()
    }
  })

  setInterval(() => {
    for (const id in playerPositions) {
      const positions = playerPositions[id].map((p) => p.position) // Extract the positions
      const rotations = playerPositions[id].map((p) => p.rotation) // Extract the rotations
      const torsoPositions = playerPositions[id].map((p) => p.torsoPosition) // Extract the torsoPositions
      const torsoRotations = playerPositions[id].map((p) => p.torsoRotation) // Extract the torsoRotations

      // Calculate interpolated position, rotation, torsoPosition, and torsoRotation
      const interpolatedPosition = interpolate(positions)
      const interpolatedRotation = interpolate(rotations)
      const interpolatedTorsoPosition = interpolate(torsoPositions)
      const interpolatedTorsoRotation = interpolate(torsoRotations)
      if (gameState[id]) {
        gameState[id].position = interpolatedPosition
        gameState[id].rotation = interpolatedRotation
        gameState[id].torsoPosition = interpolatedTorsoPosition
        gameState[id].torsoRotation = interpolatedTorsoRotation
        gameState[id].time = playerPositions[id][playerPositions[id].length - 1].time
      }
    }

    ioServer.sockets.emit('gameState', gameState) // Emit to all connected clients
  }, 1000 / 60)

  client.on('laser', (laserData) => {
    ioServer.sockets.emit('laser', laserData)
  })

  client.on('disconnect', () => {
    console.log(`User ${client.id} disconnected, there are currently ${ioServer.engine.clientsCount} users connected`)

    //Delete this client from the object
    delete gameState[client.id]

    ioServer.sockets.emit('move', clients)
  })
})

function interpolate(positions) {
  if (positions.length < 2) {
    // If there are not enough positions to interpolate, return the last position or a default position
    return positions[0] || [0, 0, 0]
  }

  const lastPosition = positions[positions.length - 1]
  const secondLastPosition = positions[positions.length - 2]

  return [(lastPosition[0] + secondLastPosition[0]) / 2, (lastPosition[1] + secondLastPosition[1]) / 2, (lastPosition[2] + secondLastPosition[2]) / 2]
}
