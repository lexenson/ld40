const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16
const CAR_LENGTH = 12
const CAR_WIDTH = 8
const PLAYER_SPEED = 2
const MAX_SHOP_MONEY = 200

let highscore = 0
let lastscore = 0

const size = {
  width: 48,
  height: 40
}
const blockSize = {
  width: 6,
  height: 4
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
    if (event.key === ' ') {
      state.requestedDirection.x = 0
      state.requestedDirection.y = 0
    }
  })
  window.addEventListener('keyup', event => {
    if (event.key === ' ') {
      state.started = true
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
  if (!state.started) return

  if (state.money.delivered / 100 >= state.gangsters.length) {
    const newGangster = createGangster()
    state.gangsters.push(newGangster)
  }

  const activeGansters = state.gangsters.filter(gangster => gangster.active).length

  if(Math.ceil(state.money.current / 100) > activeGansters) {
    const firstInactiveGangster = state.gangsters.find(gangster => !gangster.active)
    if (firstInactiveGangster) firstInactiveGangster.active = true
  }


  if(Math.ceil(state.money.current / 100) < activeGansters) {
    const firstActiveGangster = state.gangsters.find(gangster => gangster.active)
    if (firstActiveGangster) {
      firstActiveGangster.active = false
      firstActiveGangster.goal = undefined
    }
  }

  updateBuildings()
  updateMoney()
  updatePlayer()
  updateGangsters()
}

function updateBuildings () {
  state.buildings
    .filter(building => building.type === 'shop')
    .forEach(building => {
      if(building.money < MAX_SHOP_MONEY) building.money += 0.05
  })
}

function updateMoney() {
  const currentTile = state.world[Math.floor(state.player.position.y / 16)][Math.floor(state.player.position.x / 16)]

  if (currentTile.dropOffZone && state.money.current > 0) {
    state.money.current -= 1
    state.money.delivered += 1
  }  else if (currentTile.shop) {
    if (currentTile.shop.money >= 1) {
      currentTile.shop.money -= 1
      state.money.current += 1
    }
  }
}

function getTile (x, y) {
  const row = state.world[y]
  if (!row) return false
  return row[x]
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
      ? getTile(newPositionWorldAxis, oldPositionWorldOtherAxis)
      : getTile(oldPositionWorldOtherAxis, newPositionWorldAxis)


    if (nextTile && nextTile.type === 'street') {
      if (state.player.position[otherAxis] % 16 === 0) {
        const newDirectionAxis = Math.min(1, Math.max(-1, newPositionAxis - state.player.position[axis]))
        if (state.player.direction[axis] !== newDirectionAxis || state.player.direction[otherAxis] !== 0) {
          state.player.direction[axis] = newDirectionAxis
          state.player.direction[otherAxis] = 0
          state.requestedDirection[otherAxis] = 0
        }
        state.player.position[axis] = newPositionAxis
      }
    }
  }
}

function updateGangsters () {
  state.gangsters.forEach(gangster => {
    if(isExactlyOnGrid(gangster)) {
      if(gangster.active) {
        changeGangsterDirectionTowardsPlayer(gangster, state.player)
      } else{
        changeGangsterDirectionRandomly(gangster)
      }
    }

    moveGangster(gangster)
    restartGameOnCollision(state.player, gangster)

    function changeGangsterDirectionRandomly(gangster) {
      const availableDirections = getAvailableDirectionsWithoutGoingBack(gangster.position, gangster.direction)

      if(availableDirections.length === 0) {
        gangster.direction.x = -gangster.direction.x
        gangster.direction.y = -gangster.direction.y
      } else {
        gangster.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)]
      }
    }

    function changeGangsterDirectionTowardsPlayer(gangster, player) {
      if (!gangster.goal || isOnGoal(gangster.position, gangster.goal)) {
        const gangsterWorldPosition = getWorldPosition(gangster.position)
        const playerWorldPosition = getWorldPosition(player.position)
        const path = finder.findPath(
          gangsterWorldPosition.x,
          gangsterWorldPosition.y,
          playerWorldPosition.x,
          playerWorldPosition.y,
          state.pfGrid.clone()
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
        x: Math.max(-1, Math.min(1, gangster.goal.x * TILE_SIZE - gangster.position.x)),
        y: Math.max(-1, Math.min(1, gangster.goal.y * TILE_SIZE - gangster.position.y))
      }
    }

    function isOnGoal(position, goal) {
      return position.x / TILE_SIZE === goal.x && position.y / TILE_SIZE === goal.y
    }

    function getAvailableDirectionsWithoutGoingBack(position, direction) {
      const worldPosition = getWorldPosition(position)

      const availableDirections = []

      const leftTile = getTile(worldPosition.x - 1, worldPosition.y)
      const rightTile = getTile(worldPosition.x + 1, worldPosition.y)
      const upTile = getTile(worldPosition.x, worldPosition.y - 1 )
      const downTile = getTile(worldPosition.x, worldPosition.y + 1)


      if(leftTile && leftTile.type === 'street' && direction.x !== 1) {
        availableDirections.push({x: -1, y: 0})
      }
      if(rightTile && rightTile.type === 'street' && direction.x !== -1) {
        availableDirections.push({x: 1, y: 0})
      }
      if(upTile && upTile.type === 'street' && direction.y !== 1) {
        availableDirections.push({x: 0, y: -1})
      }
      if(downTile && downTile.type === 'street' && direction.y !== -1) {
        availableDirections.push({x: 0, y: 1})
      }

      return availableDirections
    }

    function getWorldPosition(pixelPosition) {
      return {
        x: Math.floor(pixelPosition.x / TILE_SIZE),
        y: Math.floor(pixelPosition.y / TILE_SIZE)
      }
    }

    function arePlayerAndGangsterColliding(player, gangster) {
      const gangster_width = gangster.direction.y !== 0 ? CAR_WIDTH : CAR_LENGTH
      const gangster_height = gangster.direction.y !== 0 ? CAR_LENGTH : CAR_WIDTH

      const player_width = player.direction.y !== 0 ? CAR_WIDTH : CAR_LENGTH
      const player_height = player.direction.y !== 0 ? CAR_LENGTH : CAR_WIDTH

      return (
        player.position.x + (TILE_SIZE - player_width)/2 < gangster.position.x + gangster_width + (TILE_SIZE - gangster_width)/2 &&
        player.position.x + player_width + (TILE_SIZE - player_width)/2 > gangster.position.x + (TILE_SIZE - gangster_width)/2 &&
        player.position.y + (TILE_SIZE - player_height)/2 < gangster.position.y + gangster_height + (TILE_SIZE - gangster_height)/2 &&
        player.position.y + player_height + (TILE_SIZE - player_height)/2 > gangster.position.y + (TILE_SIZE - gangster_height)/2
      )
    }

    function isExactlyOnGrid(gangster) {
      return gangster.position.x % TILE_SIZE === 0 && gangster.position.y % TILE_SIZE === 0
    }

    function moveGangster(gangster) {
      gangster.position = {
        x: gangster.position.x + gangster.direction.x * gangster.speed,
        y: gangster.position.y + gangster.direction.y * gangster.speed,
      }
    }

    function restartGameOnCollision(player, gangster) {
      if(arePlayerAndGangsterColliding(player, gangster)) {
        highscore = highscore > state.money.delivered ? highscore : state.money.delivered
        lastscore = state.money.delivered
        startGame()
      }
    }
  })
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
    const explanations = [
      'arrow keys: control your car',
      'space bar: stop the car',
      'bring cash from stores to banks',
      'avoid the gangsters',
      'more money = more problems',
      '',
      `high score: $${highscore}  last score: $${lastscore}`
    ]
    explanations.forEach((explanation, index) => {
      const explanationSizes = ctx.measureText(explanation)
      ctx.fillText(explanation,(CANVAS.width - explanationSizes.width)/2,300 + index * 40)
    })


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
          } else if (tile.shop) {
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
      if (building.type === 'shop') {
        ctx.globalAlpha = 0.2
        ctx.fillStyle = 'blue'
        const buildingHeight = 4 * TILE_SIZE
        const loadingSize = buildingHeight * (building.money / MAX_SHOP_MONEY)
        const offset = buildingHeight - loadingSize
        ctx.fillRect(
          building.position.x * TILE_SIZE,
          building.position.y * TILE_SIZE + offset,
          2 * TILE_SIZE,
          loadingSize
        )
        ctx.globalAlpha = 1
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
    ctx.fillText(`current:   $${money.current}`,20,660);
    ctx.fillText(`delivered: $${money.delivered}`,220,660);
    ctx.fillText(`high score: $${highscore}`, 540, 660)
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
  const buildingDistribution = shuffle(repeat('shop', 5)
    .concat(repeat('bank', 2))
    .concat(repeat('gangsterBuilding', 5))
    .concat(repeat('resedential', 8 * 7 * 3 - 12)))

  const buildings = []
  for (let y = -1; y < size.height; y++) {
    for (let x = -1; x < size.width; x++) {
      if((x + 1) % (blockSize.width + 1) == 0 && (y) % (blockSize.height + 1) == 0) {
        buildings.push(createBuilding({x: x + 1,y, type: getBuildingType()}))
        buildings.push(createBuilding({x: x + 3, y, type: getBuildingType()}))
        buildings.push(createBuilding({x: x + 5, y, type: getBuildingType()}))
      }
    }
  }
  return buildings

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function repeat (string, times) {
    const arr = []
    for (var i = 0; i < times; i++) {
      arr.push(string)
    }
    return arr
  }

  function getBuildingType () {
    return buildingDistribution.pop()
  }


  function createBuilding ({x, y, type}) {
    const id = Math.random()

    const streetPos = getStreetForBuildingPosition({x,y})

    const building = {
      id,
      type,
      position: {
        x,
        y
      },
      imageId: Math.floor(Math.random() * images.resedentials.length)
    }

    if (type === 'bank') {
      state.world[streetPos.y][streetPos.x].dropOffZone = true
      state.world[streetPos.y][streetPos.x-1].dropOffZone = true
    } else if(type === 'shop') {
      building.money = Math.floor(Math.random() * MAX_SHOP_MONEY)
      state.world[streetPos.y][streetPos.x].shop = building
      state.world[streetPos.y][streetPos.x-1].shop = building
    }

    return building
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
    active: false,
    direction: {
      x: 0,
      y: 1
    },
    speed: 1,
    position: {
      x: streetPos.x * TILE_SIZE,
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
