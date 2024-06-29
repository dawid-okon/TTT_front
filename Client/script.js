const baseUrl = 'https://boxpvp.top:2083';

let pollingInterval;

async function fetchGameStatus() {
    try {
        const response = await fetch(`${baseUrl}/game/status`);
        if (!response.ok) {
            if (response.status === 404) {
                console.log('No active game found');
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message);
        }
        const data = await response.json();
        updateBoard(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchActiveGames() {
    try {
        const response = await fetch(`${baseUrl}/game/active`);
        if (!response.ok) {
            console.error('Failed to fetch active games:', response.statusText);
            return;  // Exit the function if the response is not OK
        }
        const data = await response.json();
        updateActiveGames(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchCompletedGames() {
    try {
        const response = await fetch(`${baseUrl}/game/completed`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message);
        }
        const data = await response.json();
        updateCompletedGames(data);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loginUser(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Login successful');
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('gameSection').style.display = 'block';
            fetchActiveGames();
            fetchCompletedGames();
            startPolling();
            goToHomeScreen();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function getCurrentGameId() {
    const gameIdElement = document.getElementById('currentGameId');
    if (gameIdElement && gameIdElement.value) {
        return gameIdElement.value;
    } else {
        console.error('Current Game ID is not set or element is missing.');
        return null;
    }
}

async function registerUser(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Registration successful');
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createNewGame(player) {
    console.log(`Creating new game for player: ${player}`);
    try {
        const response = await fetch(`${baseUrl}/game/new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(player)
        });
        const data = await response.json();
        if (response.ok) {
            alert('New game created');
            updateBoard(data);
            document.getElementById('gameBoard').style.display = 'block';
            document.getElementById('currentGameId').value = data.id;
            hideGameLists();
            startPolling();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error creating new game:', error);
    }
}

async function joinGame(player, gameId) {
    console.log(`Joining game with ID: ${gameId} for player: ${player}`);
    try {
        const response = await fetch(`${baseUrl}/game/join?gameId=${gameId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(player)
        });
        const data = await response.json();
        if (response.ok) {
            alert('Joined game successfully');
            updateBoard(data);
            document.getElementById('gameBoard').style.display = 'block';
            document.getElementById('currentGameId').value = gameId;
            hideGameLists();
            startPolling();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error joining game:', error);
    }
}

// Function to hide game lists and show the back button
function hideGameLists() {
    document.getElementById('createGameButton').style.display = 'none';
    document.getElementById('activeGamesTable').style.display = 'none';
    document.getElementById('completedGames').style.display = 'none';
    document.getElementById('backToHomeButton').style.display = 'block';
}

// Function to show game lists and hide the game board
function showGameLists() {
    document.getElementById('createGameButton').style.display = 'block';
    document.getElementById('activeGamesTable').style.display = 'block';
    document.getElementById('completedGames').style.display = 'block';
    document.getElementById('backToHomeButton').style.display = 'none';
    document.getElementById('gameBoard').style.display = 'none';
    clearInterval(pollingInterval);
    fetchActiveGames();
    fetchCompletedGames();
}

// Function to make a move
async function makeMove(row, col, player) {
    const gameId = getCurrentGameId();
    console.log(`Attempting move: Player ${player}, Row ${row}, Col ${col}, Game ID: ${gameId}`);
    try {
        const response = await fetch(`${baseUrl}/game/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ row, col, player, gameId })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Move failed with response:', data);
            throw new Error(data.message || 'Move failed');
        }
        updateBoard(data);
        document.getElementById('currentPlayer').textContent = data.currentTurn;
        console.log('Move successful:', data);
        await pollGameStatus(); // Immediate update after move
    } catch (error) {
        console.error('Error making move:', error);
    }
}

// Function to update the board and ensure event handlers are bound correctly
function updateBoard(game) {
    console.log('Updating board for game:', game);
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.style.display = 'block';

    document.getElementById('currentPlayer').textContent = game.currentTurn;

    const cells = gameBoard.getElementsByTagName('td');
    for (let cell of cells) {
        const row = cell.getAttribute('data-row');
        const col = cell.getAttribute('data-col');
        cell.textContent = game.board[row][col] || '';
        if (!game.board[row][col] && !game.winner) {
            cell.onclick = () => makeMove(row, col, document.getElementById('loginUsername').value);
            cell.style.cursor = 'pointer';
        } else {
            cell.onclick = null;
            cell.style.cursor = 'default';
        }
    }

    // Check if the game is over and display a message
    if (game.winner) {
        displayGameOverMessage(game.winner);
        clearInterval(pollingInterval);
    } else if (game.isDraw) {
        displayGameOverMessage('Draw');
        clearInterval(pollingInterval);
    }
}

// Function to display the game over message
function displayGameOverMessage(winner) {
    const message = winner === 'Draw' ? 'The game is a draw!' : `Player ${winner} wins!`;
    alert(message);
}

// Function to poll for game status updates
async function pollGameStatus() {
    const gameId = getCurrentGameId();
    if (!gameId) return;

    console.log(`Polling game status for Game ID: ${gameId}`);
    try {
        const response = await fetch(`${baseUrl}/game/status?gameId=${gameId}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.log('No active game found');
                clearInterval(pollingInterval);
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message);
        }
        const data = await response.json();
        updateBoard(data);
    } catch (error) {
        console.error('Error polling game status:', error);
    }
}

// Function to start polling game status
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    pollingInterval = setInterval(pollGameStatus, 1000); // Poll every second
}

function updateActiveGames(games) {
    const activeGamesTbody = document.getElementById('activeGames');
    activeGamesTbody.innerHTML = '';
    const currentPlayer = document.getElementById('loginUsername').value;

    games.forEach((game) => {
        console.log('Game object:', game); // Log entire game object for debugging
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = game.id || 'No ID';
        row.appendChild(idCell);
        
        const playersCell = document.createElement('td');
        const playerCount = game.players ? game.players.length : 0;
        playersCell.textContent = `${playerCount}/2`;
        row.appendChild(playersCell);
        
        const actionCell = document.createElement('td');
        const joinButton = document.createElement('button');
        joinButton.textContent = 'Join Game';

        const isPlayerInGame = game.players.includes(currentPlayer);
        joinButton.disabled = playerCount >= 2 && !isPlayerInGame;
        
        joinButton.onclick = () => {
            console.log(`Join button clicked for game ID: ${game.id}`);
            joinGame(currentPlayer, game.id);
        };
        actionCell.appendChild(joinButton);
        row.appendChild(actionCell);

        activeGamesTbody.appendChild(row);
    });
}
// Polling for active and completed games
function pollGamesList() {
    fetchActiveGames();
    fetchCompletedGames();
}

// Start polling for game lists
function startGamesListPolling() {
    setInterval(pollGamesList, 5000); // Refresh every 5 seconds
}

document.addEventListener('DOMContentLoaded', () => {
    startGamesListPolling();  // Start polling when the document is ready
});


// Ensure initial setup
document.addEventListener('DOMContentLoaded', () => {
    fetchActiveGames();
    fetchCompletedGames();
    console.log('DOM fully loaded and parsed');
});

function updateCompletedGames(games) {
    const completedGamesDiv = document.getElementById('completedGames');
    completedGamesDiv.innerHTML = ''; // Wyczyszczenie obecnych danych

    if (games.length === 0) {
        completedGamesDiv.textContent = 'No completed games available.';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game ID</th>
                <th>Players</th>
                <th>Winner</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');

    games.forEach(game => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = game.id;
        row.appendChild(idCell);

        const playersCell = document.createElement('td');
        playersCell.textContent = game.players.join(', ');
        row.appendChild(playersCell);

        const winnerCell = document.createElement('td');
        winnerCell.textContent = game.winner || 'No winner';
        row.appendChild(winnerCell);

        tbody.appendChild(row);
    });

    completedGamesDiv.appendChild(table); // Dodanie tabeli do diva
}

// Function to reset the view to the initial screen (home screen)
function goToHomeScreen() {
    // Hide game board and any game-specific information
    document.getElementById('gameBoard').style.display = 'none';
    document.getElementById('currentGameId').value = ''; // Clear the current game ID if used

    // Hide game-specific buttons and sections
    document.getElementById('createGameButton').style.display = 'block';
    document.getElementById('activeGamesTable').style.display = 'block';
    document.getElementById('completedGames').style.display = 'block';
    document.getElementById('backToHomeButton').style.display = 'none';

    // Clear any interval for polling specific game status
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    // Optionally refresh the lists of games if needed
    fetchActiveGames();
    fetchCompletedGames();
}

// Adding event listener to the "back to home" button
document.getElementById('backToHomeButton').addEventListener('click', goToHomeScreen);
document.getElementById('loginForm').addEventListener('submit', loginUser);
document.getElementById('registerForm').addEventListener('submit', registerUser);
document.getElementById('createGameButton').addEventListener('click', () => {
    createNewGame(document.getElementById('loginUsername').value);
});
