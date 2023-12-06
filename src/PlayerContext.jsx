import React, { useState, useEffect } from 'react'
import io from 'socket.io-client'

export const PlayerContext = React.createContext({
  defaultPlayerId: { position: [0, 0, 0], rotation: [0, 0, 0] }
})

export const PlayerProvider = ({ children }) => {
  const [playerData, setPlayerData] = useState(null)
  const [socket, setSocket] = useState(null) // Add this line

  useEffect(() => {
    const newSocket = io.connect('http://localhost:3000') // replace with your server URL
    setSocket(newSocket)
    return () => newSocket.close()
  }, [])

  useEffect(() => {
    if (socket == null) return
    socket.on('connection', (client) => {
      setPlayerData(clients[client.id])
    })
  }, [socket])

  return <PlayerContext.Provider value={playerData}>{children}</PlayerContext.Provider>
}
