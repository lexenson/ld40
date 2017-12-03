const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16
const CAR_WIDTH = 16// 8
const CAR_HEIGHT = 16// 12
const CAR_OFFSET_X = (TILE_SIZE - CAR_WIDTH) / 2
const CAR_OFFSET_Y = (TILE_SIZE - CAR_HEIGHT) / 2
const PLAYER_SPEED = 2

const world =
`
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bb         bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
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

const pfGrid = new PF.Grid(
  world.map(line => line.map(tile => tile.type !== 'street' ? 1 : 0))
)
const finder = new PF.AStarFinder()

const state = {
  requestedDirection: {
    x: 0,
    y: 0
  },
  money: {
    current: 0,
    delivered: 0
  },
  shops: [
    {
      id: 0,
      money: 100,
      position: {
        x: 3,
        y: 0
      }
    }
  ],
  banks: [
    {
      id: 0,
      position: {
        x: 7,
        y: 0
      }
    }
  ],
  player: {
    direction: {
      x: 1,
      y: 0
    },
    speed: PLAYER_SPEED,
    position: {
      x: 32,
      y: 16
    }
  },
  gangsters: [
    {
      direction: {
        x: 1,
        y: 0
      },
      speed: 1,
      position: {
        x: 208,
        y: 192
      }
    }
  ]
}


handleInput()
gameLoop()

function handleInput() {
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      state.requestedDirection.y = +1
    }
    if (event.key === 'ArrowUp') {
      state.requestedDirection.y = -1
    }
    if (event.key === 'ArrowLeft') {
      state.requestedDirection.x = -1
    }
    if (event.key === 'ArrowRight') {
      state.requestedDirection.x = +1
    }
  })
  window.addEventListener('keyup', event => {
    if (event.key === 'ArrowDown'  && state.requestedDirection.y === +1) {
      state.requestedDirection.y = 0
    }
    if (event.key === 'ArrowUp'  && state.requestedDirection.y === -1) {
      state.requestedDirection.y = 0
    }
    if (event.key === 'ArrowLeft'  && state.requestedDirection.x === -1) {
      state.requestedDirection.x = 0
    }
    if (event.key === 'ArrowRight'  && state.requestedDirection.x === +1) {
      state.requestedDirection.x = 0
    }
  })
}

function gameLoop() {
  window.requestAnimationFrame(step)

  let start = 0

  function step(timestamp) {
    if( timestamp - start > 1000.0/60.0) {
      render()
      update()
      start = timestamp
    }
    window.requestAnimationFrame(step)
  }
}

function update() {
  updatePlayer()
  updateGangsters()
}

function updatePlayer() {
  if(state.requestedDirection.x !== 0) {
    calculateMovement('x')
  }

  if(state.requestedDirection.y !== 0) {
    calculateMovement('y')
  }

  function calculateMovement (axis) {
    const otherAxis = axis === 'x' ? 'y' : 'x'
    const newPositionAxis = state.player.position[axis] + state.player.speed * state.requestedDirection[axis]
    const newPositionWorldAxis = Math.floor((newPositionAxis + Math.max(state.requestedDirection[axis], 0) * 15) / TILE_SIZE)
    const oldPositionWorldOtherAxis = Math.floor((state.player.position[otherAxis] + Math.max(state.player.direction[otherAxis], 0) * 15)/ TILE_SIZE)

    const nextTile = axis === 'x'
      ? world[oldPositionWorldOtherAxis][newPositionWorldAxis]
      : world[newPositionWorldAxis][oldPositionWorldOtherAxis]

    if (nextTile.type === 'street') {
      if (state.player.position[otherAxis] % 16 === 0) {
        state.player.direction[axis] = Math.min(1, Math.max(-1, newPositionAxis - state.player.position[axis]))
        state.player.position[axis] = newPositionAxis
      } else {
        state.player.direction[otherAxis] = Math.min(1, Math.max(-1, oldPositionWorldOtherAxis * TILE_SIZE - state.player.position[otherAxis]))
        state.player.position[otherAxis] += state.player.direction[otherAxis]
      }
    }
  }
}

function updateGangsters () {
  state.gangsters.forEach(gangster => {
    if (!gangster.goal || gangster.position.x / 16 === gangster.goal.x && gangster.position.y / 16 === gangster.goal.y) {
      const path = finder.findPath(
        Math.floor(gangster.position.x / 16),
        Math.floor(gangster.position.y / 16),
        Math.floor(state.player.position.x / 16),
        Math.floor(state.player.position.y / 16),
        pfGrid.clone()
      )
      if (path.length > 1) {
        const nextPositionWorld = {
          x: path[1][0],
          y: path[1][1]
        }
        gangster.goal = nextPositionWorld

      }
    }

    gangster.direction = {
      x: Math.max(-1, Math.min(1, gangster.goal.x * 16 - gangster.position.x)),
      y: Math.max(-1, Math.min(1, gangster.goal.y * 16 - gangster.position.y))
    }

    gangster.position = {
      x: gangster.position.x + gangster.direction.x * gangster.speed,
      y: gangster.position.y + gangster.direction.y * gangster.speed,
    }
    }
  )
}

function render() {
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height)

  renderWorld(world)
  renderGangsters(state.gangsters)
  renderPlayer(state.player)
  renderShops(state.shops)
  renderBanks(state.banks)
  renderMoney(state.money)

  function renderWorld(world) {
    world.forEach((line, y) => {
      line.forEach((tile, x) => {
        if (tile.type !== 'street') {
          ctx.beginPath()
          ctx.fillStyle='rgb(168, 95, 53)'
          ctx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          ctx.fill()
        }
      })
    })
  }

  function renderPlayer(player) {
    renderCar(player.position, player.direction, 'rgb(10, 10, 10)')
  }

  function renderGangsters(gangsters) {
    gangsters.forEach(gangster => {
      renderCar(gangster.position, gangster.direction, 'rgb(100, 10, 10)')
    })
  }

  function renderShops (shops) {
    shops.forEach(shop => {
      ctx.beginPath()
      ctx.fillStyle='rgb(90, 95, 200)'
      ctx.rect(shop.position.x * TILE_SIZE, shop.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      ctx.fill()
    })
  }

  function renderBanks (banks) {
    banks.forEach(bank => {
      ctx.beginPath()
      ctx.fillStyle='rgb(20, 190, 20)'
      ctx.rect(bank.position.x * TILE_SIZE, bank.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      ctx.fill()
    })
  }



  function renderMoney (money) {
    ctx.font = '20px Courier'
    ctx.fillStyle='black'
    ctx.fillText(`current:   $${money.current}`,600,20);
    ctx.fillText(`delivered: $${money.delivered}`,600,40);
  }

  function renderCar (position, direction, color) {
    ctx.beginPath()
    if( direction.y !== 0) {
      ctx.rect(position.x, position.y, CAR_WIDTH, CAR_HEIGHT)
    } else {
      ctx.rect(position.x, position.y, CAR_HEIGHT, CAR_WIDTH)
    }

    ctx.fillStyle=color
    ctx.fill()
  }
}

function worldShorthandToType(shorthand) {
  if (shorthand === 'b') return { type: 'building' }
  return {
    type: 'street'
  }
}
