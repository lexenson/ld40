const {
  createStore, combineReducers
} = Redux

const CANVAS = document.getElementById('canvas')
let ctx = CANVAS.getContext('2d')

const TILE_SIZE = 16
const CAR_WIDTH = 8
const CAR_HEIGHT = 12
const CAR_OFFSET_X = (TILE_SIZE - CAR_WIDTH) / 2
const CAR_OFFSET_Y = (TILE_SIZE - CAR_HEIGHT) / 2

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

const initialState = {
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
    direction: 'left',
    position: {
      x: 1,
      y: 12
    }
  },
  gangsters: [
    {
      direction: 'left',
      position: {
        x: 13,
        y: 12
      }
    },
    {
      direction: 'right',
      position: {
        x: 3,
        y: 21
      }
    }
  ]
}

let store = createStore(reducer)

render()
store.subscribe(render)

handleInput(store)

function handleInput(store) {
  window.addEventListener('keyup', event => {
    switch (event.key) {
      case 'ArrowDown':
        return store.dispatch({
          type: 'ARROW_INPUT',
          payload: {
            deltaX: 0,
            deltaY: +1
          }
        })
      case 'ArrowUp':
        return store.dispatch({
          type: 'ARROW_INPUT',
          payload: {
            deltaX: 0,
            deltaY: -1
          }
        })
      case 'ArrowLeft':
        return store.dispatch({
          type: 'ARROW_INPUT',
          payload: {
            deltaX: -1,
            deltaY: 0
          }
        })
      case 'ArrowRight':
        return store.dispatch({
          type: 'ARROW_INPUT',
          payload: {
            deltaX: +1,
            deltaY: 0
          }
        })
    }
  })
}

function reducer(state = initialState, action) {
  const {player, gangsters, shops, banks, money} = state
  switch (action.type) {
    case 'ARROW_INPUT': return arrowInput()
    default:
      return state
  }

  function arrowInput () {
    const newPosition = {
      x: player.position.x + action.payload.deltaX,
      y: player.position.y + action.payload.deltaY
    }

    const nextTile = world[newPosition.y][newPosition.x]
    if (nextTile.type === 'street') {
      return {
        ...state,
        player: movePlayer(newPosition),
        gangsters: moveGangsters()
      }
    }
    if (nextTile.type === 'building') {
      return buildingCollision(newPosition)
    }
    return state
  }

  function moveGangsters () {
    return gangsters.map(gangster => {
      const path = finder.findPath(
        gangster.position.x,
        gangster.position.y,
        player.position.x,
        player.position.y,
        pfGrid.clone()
      )
      if (path.length < 2) return gangster
      const nextPosition = {
        x: path[1][0],
        y: path[1][1]
      }
      const deltaX = gangster.position.x - nextPosition.x
      const deltaY = gangster.position.y - nextPosition.y
      const direction = getDirection(deltaX, deltaY)
      return {...gangster, position: nextPosition, direction}
    })
  }

  function movePlayer (newPosition) {
    const oldPosition = player.position
    const deltaX = newPosition.x - oldPosition.x
    const deltaY = newPosition.y - oldPosition.y
    const direction = getDirection(deltaX, deltaY)
    return {...player, position: newPosition, direction}
  }

  function buildingCollision (newPosition) {
    const shop = shops.find(shop => isSamePosition(shop.position, newPosition))
    if (shop) {
      return pickupMoney(shop.id)
    }
    const bank = banks.find(bank => isSamePosition(bank.position, newPosition))
    if (bank) {
      return dropoffMoney(bank.id)
    }
    return state
  }

  function pickupMoney (shopId) {
    const pickupShop = shops.find(shop => shop.id === shopId)
    const newShops = shops.map(shop => {
      if (shop.id !== action.payload.id) return shop
      return {...shop, money: 0}
    })
    return {
      ...state,
      shops: newShops,
      money: {...money, current: money.current + pickupShop.money}
    }
  }

  function dropoffMoney (bankId) {
    return {
      ...state,
      money: {
        ...money,
        current: 0,
        delivered: money.delivered + money.current
      }
    }
  }
}

function getDirection (deltaX, deltaY) {
  if (deltaX === 1) return 'right'
  if (deltaX === -1) return 'left'
  if (deltaY === 1) return 'up'
  if (deltaY === -1) return 'down'
  return 'up'
}

function render() {
  const state = store.getState()

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
    switch(direction) {
      case 'up':
      case 'down':
        ctx.rect(position.x * TILE_SIZE + CAR_OFFSET_X, position.y * TILE_SIZE + CAR_OFFSET_Y,
          CAR_WIDTH, CAR_HEIGHT)
        break
      case 'left':
      case 'right':
        ctx.rect(position.x * TILE_SIZE + CAR_OFFSET_Y, position.y * TILE_SIZE + CAR_OFFSET_X,
          CAR_HEIGHT, CAR_WIDTH)
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

function isSamePosition (positionA, positionB) {
  return positionA.x === positionB.x && positionA.y === positionB.y
}
