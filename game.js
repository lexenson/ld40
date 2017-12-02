const {
  createStore, combineReducers
} = Redux

const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16

const world =
`
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bb      bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbb bb                                 bbbbbbb
bbb bb bbbbbbbb bbbbbbbb  bbbbbbbbbbbbbbb  bbbbbbb
bbb bb bbbbbbbb bbbbbbbb  bbbbbbbbbbbbbbbb bbbbbbb
b   bbbbbbbbbbb bbbbbbbb  bbbbbbbbbbbbbbbb bbbbbbb
bbb bbbbbbbbbbb bbbbbbbb  bbbbbbbbbbbbbbbb bbbbbbb
bbb bbbbbb bbbb bbbbbbbb  bbbbbbbbbbbbbbbb bbbbbbb
bbb     bb bbbb bbbbbbbb  bbbbbbbbbbbbbbbb bbbbbbb
bbb bbb bb bbbb bbbb         bbbbbbbbbbbbb bbbbbbb
bbb bbb bb bbbb bbbb  bbbbbb bbbbbbbbbbbbb bbbbbbb
b                                                b
bbb bb bbbbbbbbbbbb bbbbbbbbb bbbbb bbbbb bbbbbbbb
bbb bb bbbbbbbbbbbb bbbbbbbbb bbbbb bbbbb bbbbbbbb
b   bbbbbbbbbbbbbbb bbbbbbbbb bbbbb bbbbb bbbbbbbb
bbb bbbbbbbbbbbbbbb bbbbbbbbb bbbbbbbbbbb bbbbbbbb
bbb bbbbbb bbbbbbbb                            bbb
bb     bb bbbbbbbbb bbbbbbbbb bbbbbbbbbbb bbbbbbbb
bb bbb bb bbbbbbbbb bbbbbbbbb bbbbbbbbbbb bbbbbbbb
bb bbb bb bbbbbbbbb bbbbbbbbb bbbbbbbbbbb bbbbbbbb
b                                                b
bbb bb bbbbb  bbbbbbbbbbbbbbbb bbbbbbbbbbbbbbbbbbb
bbb bb bbbbbb   bbbbbbbbbbbbbb bbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbb  bbbbbbbbbbbbb bbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbb                                  b
bbb bbbbbb bbbbbbbbbb bbbbbbbb bbbbbbbbb bbbb bbbb
bbb     bb bbbbbbbbbb bbbbbbbb bbbbbbbbb bbbbbbbbb
bbb bbb bb bbbbbbbbbb bbbbbbbb bbbbbbbbb         b
bbb bbb bb bbbbbbbbbb bbbbbbbb bbbbbbbbbbbbbbbbb b
b                                                b
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbb bbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbb bbbbbbbbbbbbbb
b   bbbbbbbbbbb              bbbbbb bbbbbbbbbbbbbb
bbb bbbbbbbbbbb bbb  bbbbbbb bbbbbb bbbbbbbbbbbbbb
bbb bb bbbbbbbb bbb  bbbbbbb bbbbbb bbbbbbbbbbbbbb
bbb bb bbbbbbbb bbb          bbbbbb bbbbbbbbbbbbbb
b   bbbbbbbbbbb bbbbbbbbbbbbbbbbbbb bbbbbbbbbbbbbb
bbb                                 bbbbbbbbbbbbbb
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
  .trim()
  .split('\n')
  .map(line => line.split('').map(worldShorthandToType))

const initialState = {
  player: {
    position: {
      x: 1,
      y: 12
    }
  }
}

let store = createStore(
  combineReducers({
    player
  })
)

render()
store.subscribe(render)

handleInput(store)

function handleInput(store) {
  window.addEventListener('keyup', event => {
    switch (event.key) {
      case 'ArrowDown':
        return store.dispatch({
          type: 'MOVE_PLAYER',
          payload: {
            deltaX: 0,
            deltaY: +1
          }
        })
      case 'ArrowUp':
        return store.dispatch({
          type: 'MOVE_PLAYER',
          payload: {
            deltaX: 0,
            deltaY: -1
          }
        })
      case 'ArrowLeft':
        return store.dispatch({
          type: 'MOVE_PLAYER',
          payload: {
            deltaX: -1,
            deltaY: 0
          }
        })
      case 'ArrowRight':
        return store.dispatch({
          type: 'MOVE_PLAYER',
          payload: {
            deltaX: +1,
            deltaY: 0
          }
        })
    }
  })
}

function player(player = initialState.player, action) {
  switch (action.type) {
    case 'MOVE_PLAYER':
      const newPosition = {
        x: player.position.x + action.payload.deltaX,
        y: player.position.y + action.payload.deltaY
      }
      const nextTile = world[newPosition.y][newPosition.x]
      if (nextTile.type === 'street') return {...player, position: newPosition}
      return player
    default:
      return player
  }
}

function render() {
  const state = store.getState()

  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height)

  renderWorld(world)
  renderPlayer(state.player)

  function renderWorld(world) {
    world.forEach((line, y) => {
      line.forEach((tile, x) => {
        if (tile.type === 'building') {
          ctx.beginPath()
          ctx.fillStyle='rgb(168, 95, 53)'
          ctx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          ctx.fill()
        }
      })
    })
  }

  function renderPlayer(player) {
    ctx.beginPath()
    ctx.rect(player.position.x * TILE_SIZE, player.position.y * TILE_SIZE,
      TILE_SIZE, TILE_SIZE)
    ctx.fillStyle='rgb(10, 10, 10)'
    ctx.fill()
  }
}

function worldShorthandToType(shorthand) {
  if (shorthand === 'b') return {
    type: 'building'
  }
  return {
    type: 'street'
  }
}
