const {
  createStore, combineReducers
} = Redux

const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16

const world =
  `
bbb bbbbbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb     bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb     bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb

bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb     bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb

bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb     bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
 bb bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb

bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
b   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bbb bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
`
  .trim()
  .split('\n')
  .map(line => line.split('').map(worldShorthandToType))

const initialState = {
  player: {
    position: {
      x: 0,
      y: 0
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
      return {...player, position: {
          x: player.position.x + action.payload.deltaX,
          y: player.position.y + action.payload.deltaY
        }
      }
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
