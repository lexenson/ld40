const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16
const CAR_LENGTH = 12
const CAR_WIDTH = 8
const PLAYER_SPEED = 2

const size = {
  width: 48,
  height: 40
}
const blockSize = {
  width: 6,
  height: 4
}
const buildingSize = {
  width: 1,
  height: 2
}

const images = {
  transporter: getImage('money_transporter'),
  gangster: getImage('gangster_car'),
  block: getImage('block'),
  resedentials: [
    getImage('building_01'),
    getImage('building_02'),
    getImage('building_03')
  ],
  gangsterBuilding: getImage('building_gangster'),
  bank: getImage('bank'),
  shop: getImage('shop'),
  streets: {
    vertical: getImage('street_vertical'),
    horizontal: getImage('street_horizontal'),
    crossing: getImage('street_crossing'),
  }
}

const finder = new PF.AStarFinder()

const initialState = {
  started: false,
  requestedDirection: {
    x: 0,
    y: 0
  },
  money: {
    current: 0,
    delivered: 0
  },
  player: {
    direction: {
      x: 0,
      y: 1
    },
    speed: PLAYER_SPEED,
    position: {
      x: 6 * 16,
      y: 16
    }
  },
  gangsters: []
}

var state
startGame()

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
    if (event.key === ' ') {
      state.started = true
    }
    // if (event.key === 'ArrowDown'  && state.requestedDirection.y === +1) {
    //   state.requestedDirection.y = 0
    // }
    // if (event.key === 'ArrowUp'  && state.requestedDirection.y === -1) {
    //   state.requestedDirection.y = 0
    // }
    // if (event.key === 'ArrowLeft'  && state.requestedDirection.x === -1) {
    //   state.requestedDirection.x = 0
    // }
    // if (event.key === 'ArrowRight'  && state.requestedDirection.x === +1) {
    //   state.requestedDirection.x = 0
    // }
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
  if (!state.started) return

  if (state.money.delivered / 100 > state.gangsters.length + 1) {
    const newGangster = createGangster()
    state.gangsters.push(newGangster)
  }

  updateMoney()
  updatePlayer()
  updateGangsters()
}

function updateMoney() {
  const currentTile = state.world[Math.floor(state.player.position.y / 16)][Math.floor(state.player.position.x / 16)]

  if (currentTile.dropOffZone && state.money.current > 0) {
    state.money.current -= 1
    state.money.delivered += 1
  }  else if (currentTile.pickUpZone) {
    state.money.current += 1
  }
}

function updatePlayer() {
  if(state.requestedDirection.x !== 0) {
    calculateMovement('x')
  }

  if(state.requestedDirection.y !== 0) {
    calculateMovement('y')
  }

  function getTile (x, y) {
    const row = state.world[y]
    if (!row) return false
    return row[x]
  }

  function calculateMovement (axis) {
    const otherAxis = axis === 'x' ? 'y' : 'x'
    const newPositionAxis = state.player.position[axis] + state.player.speed * state.requestedDirection[axis]
    const newPositionWorldAxis = Math.floor((newPositionAxis + Math.max(state.requestedDirection[axis], 0) * 15) / TILE_SIZE)
    const oldPositionWorldOtherAxis = Math.floor((state.player.position[otherAxis] + Math.max(state.player.direction[otherAxis], 0) * 15)/ TILE_SIZE)

    const nextTile = axis === 'x'
      ? getTile(newPositionWorldAxis, oldPositionWorldOtherAxis)
      : getTile(oldPositionWorldOtherAxis, newPositionWorldAxis)


    if (nextTile && nextTile.type === 'street') {
      if (state.player.position[otherAxis] % 16 === 0) {
        state.player.direction[axis] = Math.min(1, Math.max(-1, newPositionAxis - state.player.position[axis]))
        state.player.direction[otherAxis] = 0
        state.player.position[axis] = newPositionAxis
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
        state.pfGrid.clone()
      )
      if (path.length > 1) {
        const nextPositionWorld = {
          x: path[1][0],
          y: path[1][1]
        }
        gangster.goal = nextPositionWorld
      } else {
        startGame()
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

  renderWorld(state.world)
  renderBuildings(state.buildings)
  renderGangsters(state.gangsters)
  renderPlayer(state.player)

  if (!state.started) {
    renderStartScreen()
    return
  }

  renderMoney(state.money)

  function renderStartScreen () {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, size.width * TILE_SIZE, size.height * TILE_SIZE)
    ctx.globalAlpha = 1
    ctx.font = '45px Courier'
    const title = '💸 Money Transporter 💸'
    const titleSizes = ctx.measureText(title)
    ctx.fillStyle='white'
    ctx.fillText(title,(CANVAS.width - titleSizes.width)/2,250)
    ctx.font = '25px Courier'
    const explanation = 'press space to continue'
    const explanationSizes = ctx.measureText(title)
    ctx.fillText(explanation,(CANVAS.width - explanationSizes.width)/2,300)
  }

  function renderWorld(world) {
    world.forEach((line, y) => {
      line.forEach((tile, x) => {
        if (tile.type === 'street') {
          let imageType = 'crossing'
          if (!tile.horizontal) imageType = 'vertical'
          if (!tile.vertical) imageType = 'horizontal'
          ctx.drawImage(images.streets[imageType], x * TILE_SIZE, y * TILE_SIZE)
          if (tile.dropOffZone) {
            ctx.globalAlpha = 0.2
            ctx.fillStyle = 'green'
            ctx.fillRect(x * TILE_SIZE, y* TILE_SIZE, TILE_SIZE, TILE_SIZE)
            ctx.globalAlpha = 1.0
          } else if (tile.pickUpZone) {
            ctx.globalAlpha = 0.2
            ctx.fillStyle = 'blue'
            ctx.fillRect(x * TILE_SIZE, y* TILE_SIZE, TILE_SIZE, TILE_SIZE)
            ctx.globalAlpha = 1.0
          }
        }
      })
    })
  }

  function renderBuildings (buildings) {
    buildings.forEach((building) => {
      if (building.type !== 'resedential') {
        ctx.drawImage(images[building.type], building.position.x * TILE_SIZE, building.position.y * TILE_SIZE)
      } else {
        ctx.drawImage(images.resedentials[building.imageId], building.position.x * TILE_SIZE, building.position.y * TILE_SIZE)
      }
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

  function renderMoney (money) {
    ctx.font = '20px Courier'
    ctx.fillStyle='black'
    ctx.fillText(`current:   $${money.current}`,100,660);
    ctx.fillText(`delivered: $${money.delivered}`,300,660);
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
  const world = []
  for (let y = 0; y < size.height; y++) {
    const row = []
    world.push(row)
    for (let x = 0; x < size.width; x++) {
      let tile =  {type: 'building'}
      if((x + 1) % (blockSize.width + 1) == 0)  {
        tile.type = 'street'
        tile.vertical = true
      }
      if ((y + 1) % (blockSize.height + 1) === 0) {
        tile.type = 'street'
        tile.horizontal = true
      }
      row.push(tile)
    }
  }
  return world
}

function createBuildings () {
  const buildings = []
  for (let y = -1; y < size.height; y++) {
    for (let x = -1; x < size.width; x++) {
      if((x + 1) % (blockSize.width + 1) == 0 && (y) % (blockSize.height + 1) == 0) {
        buildings.push(createBuilding({x: x + 1,y}))
        buildings.push(createBuilding({x: x + 3, y}))
        buildings.push(createBuilding({x: x + 5, y}))
      }
    }
  }
  return buildings
}

function createBuilding ({x, y}) {
  const random = Math.random()
  let type = 'resedential'
  if (random < 0.02) {
    type = 'bank'
  } else if (random < 0.07) {
    type = 'shop'
  } else if (random < 0.1) {
    type = 'gangsterBuilding'
  }

  const id = Math.random()

  const streetPos = getStreetForBuildingPosition({x,y})

  if (type === 'bank') {
    state.world[streetPos.y][streetPos.x].dropOffZone = true
    state.world[streetPos.y][streetPos.x-1].dropOffZone = true
  } else if(type === 'shop') {
    state.world[streetPos.y][streetPos.x].pickUpZone = true
    state.world[streetPos.y][streetPos.x-1].pickUpZone = true
  }

  return {
    id,
    type,
    position: {
      x,
      y
    },
    imageId: Math.floor(Math.random() * images.resedentials.length)
  }
}

function startGame () {
  state = JSON.parse(JSON.stringify(initialState))
  state.world =  createWorld()
  state.buildings = createBuildings()
  state.pfGrid = new PF.Grid(
    state.world.map(line => line.map(tile => tile.type !== 'street' ? 1 : 0))
  )
}


function createGangster () {
  const gangsterBuildings = state.buildings
    .filter(building => building.type === 'gangsterBuilding')
  const gangsterBuilding = gangsterBuildings[Math.floor(Math.random() * gangsterBuildings.length)]
  const streetPos = getStreetForBuildingPosition(gangsterBuilding.position)
  return {
    direction: {
      x: 0,
      y: 1
    },
    speed: 1,
    position: {
      x: (streetPos.x + 1) * TILE_SIZE,
      y: streetPos.y * TILE_SIZE
    }
  }
}

function getStreetForBuildingPosition ({x,y}) {
  return {
    y: y + 4,
    x: x + 1
  }
}
