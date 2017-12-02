const { createStore, combineReducers } = Redux

const CANVAS = document.getElementById("canvas")
let ctx = CANVAS.getContext("2d")

const initialState = {
    player: {
        position: {
            x: 0,
            y: 0
        }
    }
}

let store = createStore(
    combineReducers({ player }),
)

store.subscribe(render)

handleInput(store)

function handleInput(store) {
    window.addEventListener('keyup', event => {
        switch(event.key) {
            case 'ArrowDown':
                return store.dispatch({ type: 'MOVE_PLAYER', payload: { deltaX: 0, deltaY: -1}})
            case 'ArrowUp':
                return store.dispatch({ type: 'MOVE_PLAYER', payload: { deltaX: 0, deltaY: +1}})
            case 'ArrowLeft':
                return store.dispatch({ type: 'MOVE_PLAYER', payload: { deltaX: -1, deltaY: 0}})
            case 'ArrowRight':
                return store.dispatch({ type: 'MOVE_PLAYER', payload: { deltaX: +1, deltaY: 0}})
        }
    })
}

function player(player = initialState.player, action) {
    switch(action.type) {
        case 'MOVE_PLAYER':
            return {...player, position: { x: player.position.x + action.payload.deltaX, y: player.position.y + action.payload.deltaY}}
        default:
            return player
    }
}

function render() {
    const state = store.getState()

    ctx.clearRect(0,0,CANVAS.width,CANVAS.height)

    ctx.beginPath()
    ctx.rect(state.player.position.x * 10, 200 - state.player.position.y * 10, 10, 10)
    ctx.stroke()

}

