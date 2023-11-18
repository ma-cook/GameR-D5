import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { io } from 'socket.io-client'

const socket = io('http://localhost:4444', {
  path: '/socket.io'
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App socket={socket} />
  </StrictMode>
)
