export default function handleKeyboardMovement(
  keyboard,
  playerGrounded,
  inputVelocity,
  delta,
  inputHistory,
  activeAction,
  prevActiveAction,
  actions,
  inJumpAction,
  euler,
  yaw,
  quat,
  velocity,
  body
) {
  if (playerGrounded.current) {
    // if grounded I can walk
    if (keyboard['KeyW']) {
      activeAction = 1
      inputVelocity.z = -40 * delta
      inputHistory.current.push({ input: 'KeyW', time: Date.now() })
    }
    if (keyboard['KeyS']) {
      activeAction = 1
      inputVelocity.z = 40 * delta
      inputHistory.current.push({ input: 'KeyS', time: Date.now() })
    }
    if (keyboard['KeyA']) {
      activeAction = 1
      inputVelocity.x = -40 * delta
      inputHistory.current.push({ input: 'KeyA', time: Date.now() })
    }
    if (keyboard['KeyD']) {
      activeAction = 1
      inputVelocity.x = 40 * delta
      inputHistory.current.push({ input: 'KeyD', time: Date.now() })
    }
    inputVelocity.setLength(1.1) // clamps walking speed
    if (activeAction !== prevActiveAction.current) {
      if (prevActiveAction.current !== 1 && activeAction === 1) {
        actions['walk']
        actions['idle']
      }
      if (prevActiveAction.current !== 0 && activeAction === 0) {
        actions['idle']
        actions['walk']
      }
      prevActiveAction.current = activeAction
    }
    if (keyboard['Space']) {
      if (playerGrounded.current && !inJumpAction.current) {
        activeAction = 2
        inJumpAction.current = true
        actions['jump']
        inputVelocity.y = 6
      }
    }
    euler.y = yaw.rotation.y
    euler.order = 'YZX'
    quat.setFromEuler(euler)
    inputVelocity.applyQuaternion(quat)
    velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
  }
  return activeAction
}
