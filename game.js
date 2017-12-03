const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16
const CAR_LENGTH = 12
const CAR_WIDTH = 8
const PLAYER_SPEED = 2


const images = {
  transporter: getImage('money_transporter'),
  gangster: getImage('gangster_car')
}

const world = createWorld()

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
      x: 5 * 16,
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
        x: 10 * 16,
        y: 16
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
        state.player.direction[otherAxis] = 0
        state.player.position[axis] = newPositionAxis
      } else {
        state.player.direction[otherAxis] = Math.min(1, Math.max(-1, oldPositionWorldOtherAxis * TILE_SIZE - state.player.position[otherAxis]))
        state.player.direction[axis] = 0
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
        ctx.beginPath()
        ctx.fillStyle= tile.type === 'building' ? 'rgb(168, 95, 53)' : 'rgb(200,200,200)'
        ctx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        ctx.fill()
      })
    })
  }

  function renderPlayer(player) {
    renderCar(player.position, player.direction, images.transporter)
  }

  function renderGangsters(gangsters) {
    gangsters.forEach(gangster => {
      renderCar(gangster.position, gangster.direction, images.gangster)
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

  function renderCar (position, direction, image) {
    const center = {
      x: position.x + TILE_SIZE / 2,
      y: position.y + TILE_SIZE / 2
    }
    ctx.save()
    ctx.beginPath()
    ctx.translate(center.x, center.y)
    if (direction.y === -1) ctx.rotate(1 * Math.PI)
    if (direction.x === -1) ctx.rotate(1/2 * Math.PI)
    if (direction.x === 1) ctx.rotate(3/2 * Math.PI)

    ctx.drawImage(image, -TILE_SIZE / 2, -TILE_SIZE / 2)
    ctx.restore()
  }
}

function getImage (src) {
  const image = new Image()
  image.src = src + '.png'
  return image
}

function createWorld () {
  const size = {
    width: 50,
    height: 40
  }
  const blockSize = {
    width: 5,
    height: 4
  }
  const world = []
  for (let y = 0; y < size.height; y++) {
    const row = []
    world.push(row)
    for (let x = 0; x < size.width; x++) {
      if(x !== 0 && y!== 0 && x !== size.width - 1 && y !== size.height - 1 &&( (x + 1) % (blockSize.width + 1) == 0 || (y + 1) % (blockSize.height + 1) == 0)) {
        row.push({type: 'street'})
      } else {
        row.push({type: 'building'})
      }
    }
  }
  return world
}
