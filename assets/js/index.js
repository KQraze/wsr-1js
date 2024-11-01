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
const pauseBtn = document.getElementById('pause-btn')
const superProgress = document.getElementById('super-progress');

audio.volume = 0.1;

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
            currentUser = { name, points: 0, recordTime: 0, time: 0, record: 0, passed: false };
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

    const updateUsersStorage = () => {
        localStorage.setItem('users', JSON.stringify(users));
    }

    const resetProgress = () => {
        updateUser({points: 0, time: 0})
        resetLives();
    }

    const addUserToResults = (currUser) => {
        const foundedUserIndex = users.findIndex((user) => user.name === currUser.name);

        if (foundedUserIndex >= 0) {
            users[foundedUserIndex] = { ...users[foundedUserIndex], ...currUser }
        } else {
            users.push(currUser);
        }

        updateUsersStorage();
    }

    return { createUser, resetLives, decrementLives, updateUser, resetProgress, updateUsersStorage, addUserToResults }
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

let arrowDragging = false;
const keyActions = {
    down: {
        arrowLeft: () => useCart().moveCart('left'),
        arrowRight: () => useCart().moveCart('right'),
        space: () => useGameplayPage().claimAllFruit()
    },
    up: {
        arrowLeft: () => useCart().keyUp(),
        arrowRight: () => useCart().keyUp(),
        space: () => useGameplayPage().clearSpaceDraggingInterval()
    }
}

let cartMovingInterval = null;
function useCart() {
    const moveCart = (direction) => {
        if (arrowDragging || gamePaused) return;
        arrowDragging = true;
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

    const resetCartPosition = () => {
        basket.style.setProperty('--x', `0px`);
    }

    const keyUp = () => {
        console.debug('stopped')
        arrowDragging = false;
        clearInterval(cartMovingInterval);
    }

    return { keyUp, moveCart, resetCartPosition }
}

let pendingInterval = null;

let spaceDragging = false;
let spaceDraggingInterval = null;
/** 'superStatus' values: 'ready' 'active' 'pending' */
let superStatus = 'ready';
let superTimeout = 4;

function useSuper() {

    const updateSuperProgress = (value) => {
        switch (superStatus) {
            case "ready": {
                setStatusReady();
            } break;
            case "pending": {
                superProgress.style.width = `${value * 20}%`;
                superProgress.classList.add('bg-warning');
            } break;
            case "active": {
                superProgress.style.width = `${value * 25}%`;
                superProgress.classList.remove('bg-success');
            }
        }
    }

    const addSuperValueText = (text) => document.getElementById('super-value').innerText = text;

    const setStatusReady = () => {
        superStatus = 'ready';
        superProgress.style.width = '100%';
        addSuperValueText('READY');
        superProgress.classList.add('bg-success');
        superProgress.classList.remove('bg-warning');
    }

    const updateSuperValue = () => {
        switch (superStatus) {
            case 'ready': {
                superStatus = 'active';
                updateSuperProgress(--superTimeout);
                addSuperValueText(superTimeout);
            } break;
            case 'active': {
                superTimeout !== 0 ? updateSuperProgress(--superTimeout) : superStatus = 'pending'
                addSuperValueText(superTimeout);
            } break;
            case 'pending': {
                superTimeout++;
                if (superTimeout !== 5) {
                    updateSuperProgress(superTimeout);
                    addSuperValueText(superTimeout);
                } else {
                    setStatusReady()
                }
            } break;
        }

    };

    return { updateSuperValue };
}

function useTable() {
    const tbody = document.getElementById('tbody');

    const showTable = () => {
        let sorted = users.sort((a, b) => b.record - a.record);
        sorted.forEach((user) => {
            const tr = document.createElement('tr');
            Object.keys(user).forEach((field, index) => {
                if (['passed', 'points', 'time'].includes(field)) return;
                let elem;
                if (index === 0) {
                    elem = document.createElement('th');
                } else {
                    elem = document.createElement('td');
                }
                elem.scope = 'col';
                elem.innerText = (() => {
                    switch (field) {
                        case 'name': {
                            user[field] === currentUser.name ? tr.classList.add('table-active') : null;
                            return user[field]
                        }
                        case 'recordTime': {
                            return useTimer().secondsToString(user[field])
                        }
                        case 'passed': {
                            elem.classList.add(user[field] ? 'text-success' : 'text-danger');
                            return user[field] ? 'Выиграл' : 'Проиграл';
                        }
                        default: return user[field]
                    }
                })();
                tr.append(elem);
            })
            tbody.append(tr);
        })
    }

    const removeTable = () => {
        tbody.innerHTML = '';
    }

    return { showTable, removeTable }
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
        fruitElement.points = fruit.points

        return fruitElement;
    }

    const claimingIntervalFunc = () => {
        useSuper().updateSuperValue();

        document.querySelectorAll('.fruit-elem').forEach((elem) => {
            clearInterval(elem.interval);
            updateScore(elem.points);
        })
        removeAllFruit();
        if (superTimeout === 0) clearInterval(spaceDraggingInterval);
    }

    const claimAllFruit = () => {
        if (superStatus !== 'ready' && (superTimeout || spaceDragging)) return;
        console.log(superStatus);

        spaceDragging = true;

        claimingIntervalFunc();

        spaceDraggingInterval = setInterval(claimingIntervalFunc,1000)
    }

    const clearSpaceDraggingInterval = () => {
        spaceDragging = false;
        clearInterval(spaceDraggingInterval);

        if (pendingInterval) return;

        superTimeout = 0;
        superStatus = 'pending';

        pendingInterval = setInterval(() => {
            useSuper().updateSuperValue();
            if (superTimeout === 5) {
                clearInterval(pendingInterval)
                pendingInterval = null;
            }
        }, 1000)

    }

    const removeAllFruit = () => document.querySelectorAll('.fruit-elem').forEach((elem) => {
        elem.remove()
        clearInterval(elem.interval);
    })

    const startGame = (button) => {
        audio.src = 'assets/poo-music.mp3';
        audio.autoplay = true;
        audio.play();

        fruitAppearanceInterval = setInterval(() => {
            const fruitElement = createFruitElement(fruits[getRandom(0, 3)]);

            fruitElement.style.left = `${getRandom(1 + 50, GAME_WIDTH - 50)}px`;
            fruitElement.style.translate = `0 -100px`;
            gameplayView.append(fruitElement);

            let translatePosition = -100;

            fruitElement.interval = setInterval(() => {
                if (gamePaused) return;
                translatePosition += 5;
                fruitElement.style.translate = `0 ${translatePosition}px`;

                if (elementClosest(basket, fruitElement)) {
                    clearInterval(fruitElement.interval);
                    updateScore(fruitElement.points);
                    fruitElement.remove()
                }

                if (translatePosition > GAME_HEIGHT) {
                    clearInterval(fruitElement.interval);
                    fruitElement.remove()
                    useCurrentUser().decrementLives()
                    translatePosition = -100;
                }

            }, getRandom(10, 20))
        }, 1000);

        button.innerText = 'Пауза'
        button.classList.add('btn-danger');
        button.classList.remove('btn-success');
        useTimer().startTimer()
    }

    const endGame = () => {
        togglePause();
        removeAllFruit();
        useCart().resetCartPosition();
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
        gamePaused = !gamePaused;
        gamePaused ? pauseGame(pauseBtn) : startGame(pauseBtn);
    };

    const mount = () => {
        document.getElementById('current-username').innerText = `Игрок: ${currentUser.name}`;
        useCurrentUser().resetProgress();
        gameplayPage.classList.remove('d-none');
        useStartPage().unMount();
        useResultPage().unMount();
    }

    const unMount = () => {
        gameplayPage.classList.add('d-none');
    }

    return { mount, unMount, togglePause, updateScore, endGame, addInnerTextScore, claimAllFruit, clearSpaceDraggingInterval }
}

function useResultPage() {
    const resultPoints = document.getElementById('result-points');
    const resultTime = document.getElementById('result-time');
    const resultStatus = document.getElementById('result-status');

    const restartGame = () => {
        useCurrentUser().resetProgress();
        useTimer().addInnerText('00:00');
        useGameplayPage().addInnerTextScore(0);
        useGameplayPage().mount();
    }

    const mount = () => {
        const { points, time, record } = currentUser;

        resultPage.classList.remove('d-none');
        resultPage.classList.add('d-flex');
        resultPoints.innerText = points;
        resultTime.innerText = useTimer().secondsToString(time);
        currentUser.passed = time >= 10;

        currentUser.record = record < points ? (() => {
            currentUser.recordTime = time;
            return points;
        })() : currentUser.record;

        if (currentUser.passed) {
            resultStatus.innerText = 'Выиграли'
            resultStatus.parentElement.classList.remove('text-danger')
            resultStatus.parentElement.classList.add('text-success')
        } else {
            resultStatus.innerText = 'Проиграли'
            resultStatus.parentElement.classList.remove('text-success')
            resultStatus.parentElement.classList.add('text-danger')
        }
        useCurrentUser().addUserToResults(currentUser);
        useTable().showTable();
        useStartPage().unMount();
        useGameplayPage().unMount();
    }

    const unMount = () => {
        resultPage.classList.add('d-none');
        useTable().removeTable();
    }

    return { mount, unMount, restartGame }
}

const getRandom = (min, max) => {
    min = Math.ceil(min)
    max = Math.floor(max)

    return Math.floor(Math.random()*(max-min+1)) + min
}

const elementClosest = (firstElem, secondElem) => {
    const sizesFirst = firstElem.getBoundingClientRect()
    const sizesSecond = secondElem.getBoundingClientRect()
    return Math.max(sizesFirst.x, sizesSecond.x) <= Math.min(sizesFirst.x + sizesFirst.width, sizesSecond.x + sizesSecond.width) &&
        Math.max(sizesFirst.y + 20, sizesSecond.y) <= Math.min(sizesFirst.y + 20 + sizesFirst.height, sizesSecond.y + sizesSecond.height)
}

const keyEventHandler = (event, type) => {
    const key = event.key;
    if (key.includes('Arrow' || ' ')) event.preventDefault();

    switch (key) {
        case ' ': type === 'down' ? keyActions.down.space() : keyActions.up.space(); break;
        case 'Escape': type !== 'down' ? useGameplayPage().togglePause() : null; break;
        case 'ArrowLeft': type === 'down' ? keyActions.down.arrowLeft() : keyActions.up.arrowLeft() ; break;
        case 'ArrowRight': type === 'down' ? keyActions.down.arrowRight() : keyActions.up.arrowRight(); break;
    }
}

pauseBtn.onclick = () => useGameplayPage().togglePause();
document.onkeydown = (event) => keyEventHandler(event, 'down');
document.onkeyup = (event) => keyEventHandler(event, 'up');

form.onsubmit = (e) => {
    e.preventDefault();
    useStartPage().moveToGameplay((new FormData(e.target)).get('username'))
}

usernameInput.oninput = (e) => button.disabled = e.target.value === '';


