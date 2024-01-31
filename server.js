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
const range = 100

io.addServer(server)

let clients = {}
let gameState = {}
let gameStatesHistory = []
let lasers = {}

// Socket app msgs
io.onConnection((channel) => {
  console.log(`User ${channel.id} connected`)

  //Add a new client indexed by his id
  gameState[channel.id] = {
    id: channel.id,
    position: [Math.random() * range - range / 2, 1, 0],
    rotation: [0, 0, 0],
    torsoRotation: [0, 0, 0]
  }

  io.emit('gameState', gameState) // Emit the 'gameState' event with the clients object
  let lastMoveTime = 0
  channel.on('move', (playerData) => {
    const now = Date.now()
    if (now - lastMoveTime < 300) {
      // Limit to 10 moves per second
      const { id, position, rotation, torsoRotation, time } = playerData

      // Find the game state at the time the action was performed
      const pastGameState = gameStatesHistory.find((state) => state.time === time)

      if (pastGameState) {
        // Resolve the action in the past game state
        const pastPlayerState = pastGameState[id]
        if (pastPlayerState) {
          const changes = getChanges(pastGameState, playerData)
          gameState[id] = applyChanges(gameState[id], changes)
        } else {
          // If this is a lag compensation event, update the player's position with the past game state
          pastPlayerState.position = position
          pastPlayerState.rotation = rotation
          pastPlayerState.torsoRotation = torsoRotation
        }
      }

      // If this is a normal 'move' event, update the player's position as usual
      if (gameState[id]) {
        gameState[id].position = position
        gameState[id].rotation = rotation
        gameState[id].torsoRotation = torsoRotation
      }
      return
    }
    lastMoveTime = now
  })

  setInterval(() => {
    gameStatesHistory.push(JSON.parse(JSON.stringify(gameState)))
    if (gameStatesHistory.length > 30) {
      gameStatesHistory.shift()
    }
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
  }, 30 / 30)

  channel.on('laser', (laserData) => {
    lasers[laserData.id] = laserData
    io.emit('laser', laserData)
  })

  channel.on('removeLaser', (laserId) => {
    delete lasers[laserId]
    io.emit('removeLaser', laserId)
  })

  channel.onDisconnect(() => {
    console.log(`User ${channel.id} disconnected`)

    //Delete this client from the object

    io.emit('gameState', gameState)
  })
})

server.listen(process.env.PORT || 4444, () => {
  console.log(`Listening on port http://localhost:4444...`)
})

function interpolate(positions) {
  const len = positions.length
  if (len < 30) {
    return positions[len - 1]
  }
  const lastPosition = positions[len - 1]
  const secondLastPosition = positions[len - 2]
  for (let i = 0; i < lastPosition.length; i++) {
    lastPosition[i] = (lastPosition[i] + secondLastPosition[i]) / 2
  }
  return lastPosition
}
