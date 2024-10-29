const resultPage = document.getElementById('result-page')
const gameplayPage = document.getElementById('gameplay-page');
const gameplayView = document.querySelector('.gameplay-view');
const startPage = document.getElementById('start-page');
const form = document.getElementById('form');
const button = document.getElementById('button');
const usernameInput = document.getElementById('username');
const basket = document.getElementById('basket');
const hearts = document.getElementById('hearts');
const audio = document.createElement('audio');
audio.volume = 0.2;

const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;

let users= JSON.parse(localStorage.getItem('users')) ?? [];
let currentUser = null;

let userLives = 3;
let fruitAppearanceInterval = null;
let gamePaused = true;

const fruits = [
    { points: 1, image: 'fruit-1.png', radius: 40 },
    { points: 3, image: 'fruit-2.png', radius: 30 },
    { points: 5, image: 'fruit-3.png', radius: 25 },
    { points: 7, image: 'fruit-4.png', radius: 15 }
]

let timerInterval = null;


function useCurrentUser() {
    const createUser = (name) => {
        const existingUser = users.find((user) => user?.name === name);

        if (existingUser) {
            currentUser = existingUser;
        } else {
            currentUser = { name, points: 0, time: 0, passed: false };
        }
    }

    const heartPainting = (number, color) => hearts.style.setProperty(`--heart-${number}`, color);


    const resetLives = () => {
        userLives = 3;
        [1, 2, 3].forEach((num) => heartPainting(num, 'red'));
    };

    const decrementLives = () => {
        userLives--;

        switch (userLives) {
            case 2: heartPainting(3, 'gray'); break;
            case 1: heartPainting(2, 'gray'); break;
            case 0: {
                heartPainting(1, 'gray');
                useGameplayPage().endGame();
            } break;
        }
    };

    const updateUser = ({ points, time, passed }) => currentUser = { ...currentUser, points, passed, time }

    const resetProgress = () => {
        updateUser({points: 0, passed: false, time: 0})
        resetLives();
    }

    return { createUser, resetLives, decrementLives, updateUser, resetProgress }
}

function useStartPage() {

    const moveToGameplay = (name) => {
        useCurrentUser().createUser(name);
        useGameplayPage().mount();
    }

    const mount = () => {
        startPage.classList.remove('d-none');
        useResultPage().unMount()
        useGameplayPage().unMount()
    }

    const unMount = () => {
        startPage.classList.add('d-none');
    }

    return { mount, unMount, moveToGameplay }
}

function useTimer() {
    const addInnerText = (text) => document.getElementById('time-element').innerText = text;

    const secondsToString = (sec)=> {
        let minutes = Math.trunc(sec / 60 % 60);
        let seconds = Math.trunc(sec % 60);

        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    }

    const startTimer = () => {
        timerInterval = setInterval(() => {
            currentUser.time++;
            addInnerText(secondsToString(currentUser.time));
        }, 1000)
    }

    const turnOffTimer = () => clearInterval(timerInterval);

    return { secondsToString, startTimer, turnOffTimer, addInnerText }
}

const cartActions = {
    down: {
        arrowLeft: () => useCart().moveCart('left'),
        arrowRight: () => useCart().moveCart('right')
    },
    up: {
        arrowLeft: () => useCart().keyUp(),
        arrowRight: () => useCart().keyUp()
    }
}

let cartMovingInterval = null;
let dragging = false;
function useCart() {
    const moveCart = (direction) => {
        if (dragging || gamePaused) return;
        dragging = true;
        console.debug('moving')

        cartMovingInterval = setInterval(() => {
            const style = window.getComputedStyle(basket);
            const translateX = parseInt(style.getPropertyValue('--x'));

            if (direction === 'right' && translateX <= GAME_WIDTH / 2 - 50) {
                basket.style.setProperty('--x', `${translateX + 15}px`)
            }
            else if (direction === 'left' && translateX >= -(GAME_WIDTH / 2 - 50)) {
                basket.style.setProperty('--x', `${translateX + -15}px`)
            }
        }, 20);
    }

    const keyUp = () => {
        console.debug('stopped')
        dragging = false;
        clearInterval(cartMovingInterval);
    }

    return { keyUp, moveCart }
}

function useGameplayPage() {

    const addInnerTextScore = (points) => document.getElementById('score').innerText = points + ' points';

    const updateScore = (point) => {
        currentUser.points += point;
        addInnerTextScore(currentUser.points)
    };

    const createFruitElement = (fruit) => {
        const fruitElement = document.createElement('div');

        fruitElement.classList.add('fruit-elem', `fruit-elem-${getRandom(1, 4)}`)
        fruitElement.style.width = fruit.radius * 2 + 'px';
        fruitElement.style.height = fruit.radius * 2 + 'px';

        return { fruitElement, points: fruit.points };
    }

    const startGame = (button) => {
        audio.src = 'assets/poo-music.mp3';
        audio.play();

        fruitAppearanceInterval = setInterval(() => {
            const {fruitElement, points } = createFruitElement(fruits[getRandom(0, 3)]);

            fruitElement.style.left = `${getRandom(1 + 50, GAME_WIDTH - 50)}px`;
            fruitElement.style.top = `0`;
            fruitElement.style.translate = `0 -100px`;

            gameplayView.append(fruitElement);

            let translatePosition = -100;

            let interval = setInterval(() => {
                if (gamePaused) return;
                translatePosition += 2;
                fruitElement.style.translate = `0 ${translatePosition}px`;

                if (elementClosest(basket, fruitElement)) {
                    clearInterval(interval);
                    updateScore(points);
                    fruitElement.remove()
                }

                if (translatePosition > GAME_HEIGHT) {
                    clearInterval(interval);
                    fruitElement.remove()
                    useCurrentUser().decrementLives()
                }

            }, getRandom(10, 20))
        }, 1000);

        button.innerText = 'Пауза'
        button.classList.add('btn-danger');
        button.classList.remove('btn-success');
        useTimer().startTimer()
    }

    const endGame = () => {
        useResultPage().mount();
    }

    const pauseGame = (button) => {
        clearInterval(fruitAppearanceInterval);
        audio.pause();
        button.innerText = 'Старт'
        button.classList.add('btn-success');
        button.classList.remove('btn-danger');
        useTimer().turnOffTimer()
    }

    const togglePause = () => {
        const pauseBtn = document.getElementById('pause-btn')
        gamePaused = !gamePaused;
        gamePaused ? pauseGame(pauseBtn) : startGame(pauseBtn);
    };

    const mount = () => {
        gameplayPage.classList.remove('d-none');
        useStartPage().unMount();
        useResultPage().unMount();
    }

    const unMount = () => {
        gameplayPage.classList.add('d-none');
    }

    return { mount, unMount, togglePause, updateScore, endGame, addInnerTextScore }
}

function useResultPage() {
    const resultPoints = document.getElementById('result-points');
    const resultTime = document.getElementById('result-time');

    const restartGame = () => {
        useCurrentUser().resetProgress();
        useTimer().addInnerText('00:00');
        useGameplayPage().addInnerTextScore(0);
        useGameplayPage().mount();
    }

    const mount = () => {
        resultPage.classList.remove('d-none');
        resultPoints.innerText = currentUser.points;
        resultTime.innerText = useTimer().secondsToString(currentUser.time);
        useStartPage().unMount()
        useGameplayPage().unMount()
    }

    const unMount = () => {
        resultPage.classList.add('d-none');
    }

    return { mount, unMount, restartGame }
}

function getRandom(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)

    return Math.floor(Math.random()*(max-min+1)) + min
}

function elementClosest(firstElem, secondElem) {
    const sizesFirst = firstElem.getBoundingClientRect()
    const sizesSecond = secondElem.getBoundingClientRect()
    return Math.max(sizesFirst.x, sizesSecond.x) <= Math.min(sizesFirst.x + sizesFirst.width, sizesSecond.x + sizesSecond.width) &&
        Math.max(sizesFirst.y, sizesSecond.y) <= Math.min(sizesFirst.y + sizesFirst.height, sizesSecond.y + sizesSecond.height)
}

const keyEventHandler = (event, type) => {
    const key = event.key;
    if (key.includes('Arrow')) event.preventDefault();

    switch (key) {
        case 'Escape': type !== 'down' ? useGameplayPage().togglePause() : null; break;
        case 'ArrowLeft': type === 'down' ? cartActions.down.arrowLeft() : cartActions.up.arrowLeft() ; break;
        case 'ArrowRight': type === 'down' ? cartActions.down.arrowRight() : cartActions.up.arrowRight(); break;
    }
}

document.onkeydown = (event) => keyEventHandler(event, 'down');
document.onkeyup = (event) => keyEventHandler(event, 'up');

form.onsubmit = (e) => {
    e.preventDefault();
    useStartPage().moveToGameplay((new FormData(e.target)).get('username'))
}

usernameInput.oninput = (e) => button.disabled = e.target.value === '';


