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
    speed: 0,
    position: {
      x: 16,
      y: 192
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
    switch (event.key) {
      case 'ArrowDown':
        arrowInput({ deltaX: 0, deltaY: 1})
        break
      case 'ArrowUp':
        arrowInput({ deltaX: 0, deltaY: -1})
        break
      case 'ArrowLeft':
        arrowInput({ deltaX: -1, deltaY: 0})
        break
      case 'ArrowRight':
        arrowInput({ deltaX: 1, deltaY: 0})
    }
  })
  window.addEventListener('keyup', event => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'ArrowRight':
        state.player.speed = 0
    }
  })


  function arrowInput ({ deltaX, deltaY}) {
    state.player.speed = PLAYER_SPEED
    state.player.direction = { x: deltaX, y: deltaY}
  }
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
  const newPosition = {
    x: state.player.position.x + state.player.speed * state.player.direction.x,
    y: state.player.position.y + state.player.speed * state.player.direction.y
  }

  // if you want to move y, the x position needs to be on perfect grid
  // if (state.player.direction.x === 0) {
  //   if (newPosition.x % TILE_SIZE !== 0) return
  // }
  // if (state.player.direction.y === 0) {
  //   if (newPosition.y % TILE_SIZE !== 0) return
  // }

  if (state.player.direction.x === 0) {
    newPosition.x = Math.round(newPosition.x / 16) * 16
  }
  if (state.player.direction.y === 0) {
    newPosition.y = Math.round(newPosition.y / 16) * 16
  }

  const worldPositionY = state.player.direction.y === 1
   ? Math.ceil(newPosition.y / TILE_SIZE)
   : Math.floor(newPosition.y / TILE_SIZE)

  const worldPositionX = state.player.direction.x === 1
    ? Math.ceil(newPosition.x / TILE_SIZE)
    : Math.floor(newPosition.x / TILE_SIZE)

  const nextTile = world[worldPositionY][worldPositionX]
  if (nextTile.type === 'street') {
    state.player.position = newPosition
  }
}

function updateGangsters () {
  state.gangsters.forEach(gangster => {
    if (!gangster.goal || (Math.floor(gangster.position.x / 16) === gangster.goal.x && Math.floor(gangster.position.y / 16) === gangster.goal.y)) {
      const path = finder.findPath(
        Math.floor(gangster.position.x / 16),
        Math.floor(gangster.position.y / 16),
        Math.floor(state.player.position.x / 16),
        Math.floor(state.player.position.y / 16),
        pfGrid.clone()
      )
      if (path.length > 1) {
        const nextPosition = {
          x: path[1][0],
          y: path[1][1]
        }
        gangster.goal = nextPosition
        gangster.direction = {
          x: nextPosition.x - Math.floor(gangster.position.x / 16),
          y: nextPosition.y - Math.floor(gangster.position.y / 16)
        }
      }
      else {
        gangster.goal = undefined
      }
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
      ctx.rect(position.x  + CAR_OFFSET_X, position.y + CAR_OFFSET_Y, CAR_WIDTH, CAR_HEIGHT)
    } else {
      ctx.rect(position.x + CAR_OFFSET_Y, position.y + CAR_OFFSET_X, CAR_HEIGHT, CAR_WIDTH)
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
